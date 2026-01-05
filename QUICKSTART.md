# Quick Start Guide

Get up and running with the Clarifying Questions MCP Server in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A Groq API key

## Installation

```bash
# 1. Clone and install
git clone <repository-url>
cd studio-mcp-clarifying-questions-server
npm install

# 2. Configure
cp .env.example .env
# Edit .env and add your GROQ_API_KEY and MCP_API_KEY

# 3. Build
npm run build
```

## Option 1: HTTP Server (Easiest)

Start the HTTP server:

```bash
npm start http
```

Test with curl:

```bash
# Set your API key
export MCP_API_KEY="your_mcp_api_key_here"

curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"taskDescription": "make me a website that runs pseudocode"}'
```

Or open the example client in your browser:

```bash
# Open examples/client.html in your browser
# Works with any modern browser
```

## Option 2: MCP Server (for Claude Desktop)

1. Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "clarifying-questions": {
      "command": "node",
      "args": [
        "/absolute/path/to/project/dist/index.js",
        "mcp"
      ],
      "env": {
        "GROQ_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Use the tools in Claude:
   - `generate_questions` - Generate clarifying questions
   - `answer_question` - Submit answers
   - `get_context` - Retrieve full context
   - `list_sessions` - View all sessions

## Example Workflow

### HTTP API:

```bash
# Set your API key
export MCP_API_KEY="your_mcp_api_key_here"

# 1. Generate questions
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"taskDescription": "build a chat app"}' \
  | jq -r '.sessionId')

echo "Session: $SESSION_ID"

# 2. Answer a question
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"questionId\": \"q1\",
    \"answer\": \"React\"
  }" | jq '.'

# 3. Get complete context
curl http://localhost:3000/api/context/$SESSION_ID \
  -H "Authorization: Bearer $MCP_API_KEY" | jq '.'
```

### Streaming API:

```bash
# Stream questions in real-time
curl -N http://localhost:3000/api/stream\?taskDescription\="build%20a%20chat%20app" \
  -H "Authorization: Bearer $MCP_API_KEY"
```

### Python Client:

```bash
# Set your API key
export MCP_API_KEY="your_mcp_api_key_here"

# Interactive mode
python3 examples/client.py

# Automated mode
python3 examples/client.py --auto
```

### Test Script:

```bash
# Set your API key
export MCP_API_KEY="your_mcp_api_key_here"

# Run all tests
./examples/test.sh

# Test against different server
./examples/test.sh https://your-server.com
```

## Common Issues

### SSL Certificate Error

If using HTTPS with self-signed certificates:

```bash
# Generate certificates first
npm run generate-cert

# Or disable HTTPS in .env
USE_HTTPS=false
```

### Port Already in Use

Change the port in `.env`:

```env
PORT=3001
```

### API Key Error

Make sure your `.env` file has valid API keys:

```env
GROQ_API_KEY=your_groq_api_key
MCP_API_KEY=your_mcp_api_key
```

Generate a secure MCP_API_KEY:
```bash
openssl rand -hex 32
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore [examples/client.html](examples/client.html) for a web UI
- Try the Python client: [examples/client.py](examples/client.py)
- Run the test suite: [examples/test.sh](examples/test.sh)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/generate` | POST | Generate questions (non-streaming) |
| `/api/stream` | GET | Stream questions (SSE) |
| `/api/answer` | POST | Submit an answer |
| `/api/context/:id` | GET | Get session context |
| `/api/sessions` | GET | List all sessions |

## Support

For issues or questions, please check:
- The [README.md](README.md) for detailed documentation
- Example files in the `examples/` directory
- GitHub issues (if applicable)

Happy building! 🚀
