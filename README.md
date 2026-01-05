# Studio MCP Clarifying Questions Server

A Model Context Protocol (MCP) server that generates intelligent clarifying questions for user task requests. This server integrates with Groq to dynamically generate relevant questions about tech stack, architecture, deployment, and more.

## Features

- 🤖 **AI-Powered Questions**: Uses Groq models to generate contextually relevant questions
- 🔄 **Real-time Streaming**: Supports Server-Sent Events (SSE) for streaming questions
- 🔒 **HTTPS Support**: Optional HTTPS with self-signed certificates for development
- 💾 **Session Management**: Persistent storage of sessions and responses
- 🔌 **Dual Mode**: Works as both MCP server (stdio) and HTTP/HTTPS server
- 📊 **Progress Tracking**: Monitor completion of question responses
- 🎯 **Categorized Questions**: Questions organized by tech_stack, architecture, deployment, etc.

## Prerequisites

- Node.js 18+ or higher
- npm or yarn
- Groq API key (get one at https://console.groq.com/)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd studio-mcp-clarifying-questions-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your Groq API key and generate an MCP API key in `.env`:
```env
GROQ_API_KEY=your_api_key_here

# Generate a secure API key for HTTP authentication
MCP_API_KEY=your_secure_api_key_here

# Optional: Set your public server URL for deployment
SERVER_URL=http://localhost:3000
```

**Generate a secure MCP_API_KEY:**
```bash
openssl rand -hex 32
```

5. (Optional) Generate SSL certificates for HTTPS:
```bash
npm run generate-cert
```

6. Build the project:
```bash
npm run build
```

## Usage

### HTTP/HTTPS Server Mode

Start the server in HTTP mode (default):

```bash
npm start http
```

Or for development with auto-reload:

```bash
npm run dev http
```

The server will start at `http://localhost:3000` (or `https://localhost:3000` if HTTPS is enabled).

### MCP Server Mode (stdio)

For integration with Studio/Claude Desktop:

```bash
npm start mcp
```

Or:

```bash
node dist/index.js mcp
```

## HTTP Authentication (Bearer Token)

When running in **HTTP/HTTPS mode**, all `/api/*` endpoints are protected with an API key.

- **Header**: `Authorization: Bearer <MCP_API_KEY>`
- **Public endpoint**: `GET /health` (no auth required)
- **Protected endpoints**: `/api/generate`, `/api/stream`, `/api/answer`, `/api/context/*`, `/api/sessions`

### Configure MCP_API_KEY

Add this to your `.env`:

```env
MCP_API_KEY=your_secure_api_key_here
```

Generate a secure key:

```bash
openssl rand -hex 32
```

If `MCP_API_KEY` is not set when starting the server in HTTP mode, the server will generate one and attempt to save it to `.env`.

### Example (curl)

```bash
export MCP_API_KEY="your_secure_api_key_here"

curl -s http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $MCP_API_KEY" | jq '.'
```

## API Endpoints

### 1. Generate Questions (Non-streaming)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "taskDescription": "make me a website that runs pseudocode"
  }'
```

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "taskDescription": "make me a website that runs pseudocode",
  "questions": [
    {
      "id": "q1",
      "text": "What frontend framework should be used?",
      "category": "tech_stack",
      "options": ["React", "Vue", "Svelte", "Plain HTML+JS", "Other"]
    },
    ...
  ]
}
```

### 2. Stream Questions (Server-Sent Events)

```bash
curl -N http://localhost:3000/api/stream?taskDescription="make%20me%20a%20website" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY"
```

Response (SSE format):
```
event: start
data: {"message":"Generating questions..."}

event: question
data: {"id":"q1","text":"What frontend framework...","category":"tech_stack","options":[...]}

event: question
data: {"id":"q2","text":"Do you need a backend...","category":"architecture","options":[...]}

event: complete
data: {"sessionId":"session_123","questionCount":5,"message":"All questions generated"}
```

### 3. Answer Question

```bash
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "sessionId": "session_1234567890_abc123",
    "questionId": "q1",
    "answer": "React"
  }'
```

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "questionId": "q1",
  "answer": "React",
  "progress": {
    "answered": 1,
    "total": 5,
    "percentage": 20
  },
  "complete": false
}
```

### 4. Get Task Context

```bash
curl http://localhost:3000/api/context/session_1234567890_abc123 \
  -H "Authorization: Bearer YOUR_MCP_API_KEY"
```

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "taskDescription": "make me a website that runs pseudocode",
  "questions": [...],
  "responses": {
    "q1": "React",
    "q2": "Yes, Node.js/Express",
    "q3": "Interpreter"
  },
  "progress": {
    "answered": 3,
    "total": 5,
    "percentage": 60
  },
  "createdAt": "2024-01-05T10:00:00.000Z",
  "lastUpdated": "2024-01-05T10:05:00.000Z"
}
```

### 5. List All Sessions

```bash
curl http://localhost:3000/api/sessions \
  -H "Authorization: Bearer YOUR_MCP_API_KEY"
```

Response:
```json
{
  "totalSessions": 2,
  "sessions": [
    {
      "sessionId": "session_1234567890_abc123",
      "taskDescription": "make me a website that runs pseudocode",
      "questionsTotal": 5,
      "questionsAnswered": 3,
      "percentComplete": 60,
      "createdAt": "2024-01-05T10:00:00.000Z",
      "lastUpdated": "2024-01-05T10:05:00.000Z"
    }
  ]
}
```

### 6. Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-05T10:00:00.000Z"
}
```

## MCP Integration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "clarifying-questions": {
      "command": "node",
      "args": ["/absolute/path/to/studio-mcp-clarifying-questions-server/dist/index.js", "mcp"],
      "env": {
        "GROQ_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### MCP Tools

When running in MCP mode, the following tools are available:

#### 1. `generate_questions`
```json
{
  "taskDescription": "make me a website that runs pseudocode"
}
```

#### 2. `answer_question`
```json
{
  "sessionId": "session_123",
  "questionId": "q1",
  "answer": "React"
}
```

#### 3. `get_context`
```json
{
  "sessionId": "session_123"
}
```

#### 4. `list_sessions`
```json
{}
```

## Example Client (JavaScript)

### Using SSE for Streaming

**Note:** The browser `EventSource` API doesn't support custom headers. For authenticated SSE, use `fetch()` (streaming) or a Node.js EventSource client that supports headers (e.g. the `eventsource` package).

```javascript
// Option 1: Using fetch with SSE parsing (recommended for auth)
const API_KEY = 'your_mcp_api_key_here';

async function streamQuestions(taskDescription) {
  const response = await fetch(
    `http://localhost:3000/api/stream?taskDescription=${encodeURIComponent(taskDescription)}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    }
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sessionId = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.sessionId) {
          sessionId = data.sessionId;
          console.log('Session ID:', sessionId);
        }
        console.log('Data:', data);
      }
    }
  }
  
  return sessionId;
}

// Option 2: Using eventsource library (Node.js only)
const EventSource = require('eventsource');
const url = 'http://localhost:3000/api/stream?taskDescription=make%20me%20a%20website';
const eventSource = new EventSource(url, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

eventSource.addEventListener('question', (event) => {
  const question = JSON.parse(event.data);
  console.log('New question:', question);
});
```

### Submitting Answers

```javascript
const API_KEY = 'your_mcp_api_key_here';

async function submitAnswer(sessionId, questionId, answer) {
  const response = await fetch('http://localhost:3000/api/answer', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ sessionId, questionId, answer })
  });
  
  const result = await response.json();
  console.log('Progress:', result.progress);
  
  if (result.complete) {
    // All questions answered, get full context
    const context = await getContext(sessionId);
    console.log('Complete context:', context);
  }
}

async function getContext(sessionId) {
  const response = await fetch(`http://localhost:3000/api/context/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  return await response.json();
}
```

## Example Client (Python)

```python
import requests
import json
from sseclient import SSEClient

API_KEY = 'your_mcp_api_key_here'

# Set up headers with authentication
headers = {
    'Authorization': f'Bearer {API_KEY}'
}

# Stream questions
url = 'http://localhost:3000/api/stream'
params = {'taskDescription': 'make me a website that runs pseudocode'}

response = requests.get(url, params=params, headers=headers, stream=True)
client = SSEClient(response)

session_id = None

for event in client.events():
    if event.event == 'start':
        data = json.loads(event.data)
        print(f"Starting: {data['message']}")
    
    elif event.event == 'question':
        question = json.loads(event.data)
        print(f"Question: {question['text']}")
        print(f"Options: {question['options']}")
    
    elif event.event == 'complete':
        data = json.loads(event.data)
        session_id = data['sessionId']
        print(f"Complete! Session ID: {session_id}")

# Submit an answer
answer_response = requests.post(
    'http://localhost:3000/api/answer',
    headers=headers,
    json={
        'sessionId': session_id,
        'questionId': 'q1',
        'answer': 'React'
    }
)
print(answer_response.json())

# Get context
context_response = requests.get(
    f'http://localhost:3000/api/context/{session_id}',
    headers=headers
)
print(context_response.json())
```

## Example Client (cURL)

```bash
#!/bin/bash

MCP_API_KEY="your_mcp_api_key_here"

# 1. Generate questions (streaming)
echo "Generating questions..."
RESPONSE=$(curl -N -s "http://localhost:3000/api/stream?taskDescription=make%20a%20website" \
  -H "Authorization: Bearer $MCP_API_KEY" | tee /tmp/sse_output.txt)

# Extract session ID from last complete event
SESSION_ID=$(grep "event: complete" -A 1 /tmp/sse_output.txt | grep "data:" | sed 's/.*"sessionId":"\([^"]*\)".*/\1/')

echo "Session ID: $SESSION_ID"

# 2. Answer questions
echo "Answering question 1..."
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"questionId\": \"q1\",
    \"answer\": \"React\"
  }"

# 3. Get full context
echo "Getting full context..."
curl http://localhost:3000/api/context/$SESSION_ID \
  -H "Authorization: Bearer $MCP_API_KEY"
```

## Configuration

All configuration is done via environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key (required) | - |
| `MCP_API_KEY` | API key for HTTP endpoint authentication (required for HTTP mode) | Auto-generated if not set |
| `SERVER_URL` | Public server URL (for deployment) | `http://localhost:3000` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `localhost` |
| `USE_HTTPS` | Enable HTTPS | `true` |
| `SSL_KEY_PATH` | Path to SSL private key | `./certs/key.pem` |
| `SSL_CERT_PATH` | Path to SSL certificate | `./certs/cert.pem` |
| `GROQ_MODEL` | Groq model to use | `mixtral-8x7b-32768` |
| `SESSION_TIMEOUT_MS` | Session timeout in milliseconds | `3600000` (1 hour) |

## Question Categories

Questions are automatically categorized:

- **tech_stack**: Framework, language, and library decisions
- **scope**: Project size, MVP vs full-featured, timelines
- **architecture**: System design, patterns, monolith vs microservices
- **features**: Specific functionality, integrations, requirements
- **deployment**: Hosting, CI/CD, scaling, infrastructure
- **integrations**: External APIs, databases, authentication services
- **other**: Miscellaneous questions

## Session Management

- Sessions are stored in memory and persisted to `./sessions/` directory
- Each session is saved as a JSON file
- Sessions auto-expire after 1 hour of inactivity (configurable)
- Session files are cleaned up automatically

## Development

### Run in development mode:
```bash
npm run dev http   # HTTP server with auto-reload
npm run dev mcp    # MCP server with auto-reload
```

### Build:
```bash
npm run build
```

### Generate SSL certificates:
```bash
npm run generate-cert
```

## Troubleshooting

### SSL Certificate Errors

If you get SSL errors with self-signed certificates:

```bash
# For curl, use -k flag to ignore SSL verification
curl -k https://localhost:3000/health

# For Node.js clients, set environment variable
NODE_TLS_REJECT_UNAUTHORIZED=0 node your-client.js
```

### Port Already in Use

Change the port in `.env`:
```env
PORT=3001
```

### API Key Errors

Ensure your `.env` file has a valid Anthropic API key:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
│   or Studio     │
└────────┬────────┘
         │ stdio/MCP
         ▼
┌─────────────────────────────────────┐
│        MCP Server (stdio)           │
│  ┌──────────────────────────────┐   │
│  │  generate_questions          │   │
│  │  answer_question             │   │
│  │  get_context                 │   │
│  │  list_sessions               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

         OR

┌─────────────────┐
│   HTTP Client   │
│  (Browser/cURL) │
└────────┬────────┘
         │ HTTPS/HTTP
         ▼
┌─────────────────────────────────────┐
│     HTTP/HTTPS Server + SSE         │
│  ┌──────────────────────────────┐   │
│  │  POST /api/generate          │   │
│  │  GET  /api/stream (SSE)      │   │
│  │  POST /api/answer            │   │
│  │  GET  /api/context/:id       │   │
│  │  GET  /api/sessions          │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Question Generator             │
│  (Claude API Integration)           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Session Manager                │
│  (Memory + File Persistence)        │
└─────────────────────────────────────┘
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues or questions, please open an issue on GitHub.
