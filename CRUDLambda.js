import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "GamingServers";

export const handler = async (event) => {
  const method = event.httpMethod || event.method;
  const body = JSON.parse(event.body || '{}');
  const serverName = event.queryStringParameters?.serverName || JSON.parse(event.body || '{}').serverName

  try {
    switch (method) {
      case "GET": {
        if (!serverName) {
          const scanData = await docClient.send(new ScanCommand({TableName: TABLE_NAME}));
          return {
            statusCode: 200,
            body: JSON.stringify(scanData.Items)
          }
        }

        const getParams = {
          TableName: TABLE_NAME,
          Key: {
            serverName: serverName.toLowerCase()
          }
        }

        const getData = await docClient.send(new GetCommand(getParams));

        if (!getData.Item) {
          return {
            statusCode: 404,
            body: JSON.stringify({message: "Server game not found"})
          }
        }
        return response(200, getData.Item);
      }

      case "DELETE": {
         if (!serverName) {
          return {
            statusCode: 400,
            body: JSON.stringify({message: "Server name is required"})
          }
        }

        const deleteParams = {
          TableName: TABLE_NAME,
          Key: {
            serverName: serverName.toLowerCase()
          }
        }

        await docClient.send(new DeleteCommand(deleteParams))
        return {
          statusCode: 202,
          body: JSON.stringify({message: "Server game deleted"})
        }
      }

      case "POST": {
        if (!body.serverName) {
          return {
            statusCode: 400,
            body: JSON.stringify({message: "Server name is required"})
          }
        }

        const putParams = {
          TableName: TABLE_NAME,
          Item: {
            serverName: body.serverName.toLowerCase(),
            currentPlayer: body.currentPlayer || 0,
            status: body.status || "Offline",
            port: body.port || 0,
            lastUpdated: new Date().toISOString()
          }
        }
        await docClient.send(new PutCommand(putParams));
        return {
          statusCode: 201,
          body: JSON.stringify({message: "Server game created"})
        }
      }
    }
    } catch (err) {
      console.error(err);
      return response(500, { message: "Loi Server: " + err.message });
    }

};
const response = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  };
};