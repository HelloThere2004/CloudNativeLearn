import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "GamingServers";

const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Mở CORS cho Frontend gọi vào
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,DELETE"
  },
});

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event));

  // --- PHẦN MỚI: KIỂM TRA QUYỀN LỰC (RBAC) ---
  // API Gateway JWT Authorizer sẽ nhét thông tin user vào đây
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const groups = claims["cognito:groups"] || []; // Lấy danh sách nhóm (Mảng)
  const isAdmin = groups.includes("Admins") || groups.includes("us-east-1_xxxxxx_Admins"); // Đề phòng Cognito thêm prefix
  
  console.log("User Groups:", groups);
  console.log("Is Admin?", isAdmin);
  // ---------------------------------------------

  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch (e) {}

  const method = event.httpMethod || event.requestContext?.http?.method;
  const serverName = event.queryStringParameters?.serverName || body.serverName;

  try {
    switch (method) {
      case "GET":
        return await handleGet(serverName); // Ai cũng xem được
        
      case "POST":
      case "DELETE":
        // --- CHỐT CHẶN: Chỉ Admin mới được Xóa/Tạo ---
        if (!isAdmin) {
          return response(403, { message: "CẤM! Bạn không phải Admin (Access Denied)." });
        }
        if (method === "POST") return await handlePost(body);
        if (method === "DELETE") return await handleDelete(serverName);
        break;

      default:
        return response(405, { message: `Method ${method} not supported` });
    }
  } catch (err) {
    console.error(err);
    return response(500, { message: "Internal Server Error: " + err.message });
  }
};

// ... (Giữ nguyên các hàm handleGet, handlePost, handleDelete ở dưới như cũ) ...
const handleGet = async (serverName) => {
  if (!serverName) {
    const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    return response(200, data.Items);
  }
  const data = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { serverName: serverName.toLowerCase() } }));
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
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { serverName: serverName.toLowerCase() } }));
  return response(200, { message: "Deleted" });
};