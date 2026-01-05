# MCP HTTP Integration

This server supports the Model Context Protocol (MCP) over HTTP using Server-Sent Events (SSE). This allows clients like `cto` to connect to the server and use its tools via standard HTTP/HTTPS.

## Connecting to the MCP Endpoint

The MCP endpoint is located at `/mcp`.

- **Base URL**: `http://<host>:<port>` (or `https://...`)
- **SSE Endpoint**: `GET /mcp`
- **Message Endpoint**: `POST /mcp?sessionId=<session-id>`
- **Authentication**: Requires `Authorization: Bearer <MCP_API_KEY>`

### cto Integration Configuration

To integrate this server with `cto`, use the following configuration in your MCP settings:

```json
{
  "mcpServers": {
    "clarifying-questions": {
      "url": "http://your-server-address:8000/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

## Protocol Details

### 1. Establish SSE Connection
The client initiates a connection using EventSource (or equivalent).

**Request:**
```http
GET /mcp HTTP/1.1
Host: localhost:8000
Authorization: Bearer YOUR_MCP_API_KEY
Accept: text/event-stream
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: endpoint
data: /mcp?sessionId=12345-67890
```

The `endpoint` event provides the URL where the client should send POST requests.

### 2. Sending MCP Tool Calls
Clients send JSON-RPC requests to the provided endpoint.

**Example: `list_sessions`**

**Request:**
```http
POST /mcp?sessionId=12345-67890 HTTP/1.1
Host: localhost:8000
Authorization: Bearer YOUR_MCP_API_KEY
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_sessions",
    "arguments": {}
  }
}
```

**Response (via SSE):**
```http
event: message
data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"{...}"}]}}
```

## Available Tools

The following MCP tools are available via the `/mcp` endpoint:

- `generate_questions`: Generate clarifying questions for a task description.
- `answer_question`: Submit an answer to a clarifying question.
- `get_context`: Retrieve the complete task context for a session.
- `list_sessions`: List all active sessions.

## Security Note

All requests to `/mcp` must include a valid Bearer token. Ensure you use HTTPS in production to protect the authentication token.
