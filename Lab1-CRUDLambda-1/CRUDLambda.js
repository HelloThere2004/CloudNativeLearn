import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "GamingServers";

// 1. Đưa hàm response lên đầu hoặc dùng function declaration để tránh lỗi
const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Quan trọng cho Frontend gọi vào
  },
});

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event)); // Log để debug

  // Xử lý an toàn khi body bị null
  let body = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch (e) {
    console.log("Body parse error", e);
  }

  const method = event.httpMethod || event.requestContext?.http?.method; // Support cả Payload v1 và v2
  const serverName = event.queryStringParameters?.serverName || body.serverName;

  try {
    switch (method) {
      case "GET":
        return await handleGet(serverName);
      case "POST":
        return await handlePost(body);
      case "DELETE":
        return await handleDelete(serverName);
      default:
        return response(405, { message: `Method ${method} not supported` });
    }
  } catch (err) {
    console.error(err);
    return response(500, { message: "Internal Server Error: " + err.message });
  }
};

// 2. Tách logic ra các hàm con cho gọn (Clean Code)
const handleGet = async (serverName) => {
  if (!serverName) {
    const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    return response(200, data.Items);
  }
  const data = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { serverName: serverName.toLowerCase() }
  }));
  
  if (!data.Item) return response(404, { message: "Not found" });
  return response(200, data.Item);
};

const handlePost = async (body) => {
  if (!body.serverName) return response(400, { message: "Missing serverName" });
  
  const item = {
    serverName: body.serverName.toLowerCase(),
    currentPlayer: body.currentPlayer || 0,
    status: body.status || "Offline",
    port: body.port || 0,
    lastUpdated: new Date().toISOString()
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return response(201, { message: "Created", data: item });
};

const handleDelete = async (serverName) => {
  if (!serverName) return response(400, { message: "Missing serverName" });
  
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { serverName: serverName.toLowerCase() }
  }));
  return response(200, { message: "Deleted" });
};