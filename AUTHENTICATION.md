# Authentication Guide

This document explains how to authenticate with the MCP server when using HTTP/HTTPS mode.

## Overview

When running in **HTTP/HTTPS mode**, all API endpoints except `/health` require Bearer token authentication.

- **MCP mode (stdio)**: No authentication required
- **HTTP/HTTPS mode**: Bearer token required for all `/api/*` endpoints

## Setup

### 1. Generate an API Key

Generate a secure API key using OpenSSL:

```bash
openssl rand -hex 32
```

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Configure Environment

Add the API key to your `.env` file:

```env
MCP_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Note:** If `MCP_API_KEY` is not set when starting the server in HTTP mode, the server will automatically generate one and attempt to save it to `.env`.

### 3. Set Server URL (Optional)

For deployment, set your public server URL:

```env
SERVER_URL=https://your-domain.com
```

This will be displayed in the server startup logs and used in example commands.

## Making Authenticated Requests

### cURL

```bash
export MCP_API_KEY="your_api_key_here"

# Generate questions
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"taskDescription": "build a chat app"}'

# List sessions
curl http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $MCP_API_KEY"
```

### JavaScript (fetch)

```javascript
const API_KEY = 'your_api_key_here';

const response = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  body: JSON.stringify({ taskDescription: 'build a chat app' })
});

const data = await response.json();
```

### Python (requests)

```python
import requests
import os

API_KEY = os.environ.get('MCP_API_KEY')

headers = {
    'Authorization': f'Bearer {API_KEY}'
}

response = requests.post(
    'http://localhost:3000/api/generate',
    headers=headers,
    json={'taskDescription': 'build a chat app'}
)

data = response.json()
```

## Endpoints

### Public Endpoints (No Auth Required)

- `GET /health` - Health check

### Protected Endpoints (Auth Required)

All endpoints under `/api` require authentication:

- `POST /api/generate` - Generate questions (non-streaming)
- `GET /api/stream` - Stream questions (SSE)
- `POST /api/answer` - Submit an answer
- `GET /api/context/:sessionId` - Get task context
- `GET /api/sessions` - List all sessions

## Error Responses

### 401 Unauthorized

If the Bearer token is missing or invalid, the server returns:

```json
{
  "error": "Unauthorized"
}
```

**Common causes:**
- Missing `Authorization` header
- Invalid Bearer token format
- Incorrect API key

**Solutions:**
- Ensure the `Authorization` header is present
- Verify the format is `Bearer YOUR_API_KEY`
- Check that the API key matches `MCP_API_KEY` in `.env`

## Security Best Practices

### 1. Keep Your API Key Secret

- ✅ Store in `.env` file (already in `.gitignore`)
- ✅ Use environment variables in production
- ❌ Never commit API keys to version control
- ❌ Never share API keys in public channels

### 2. Use HTTPS in Production

```env
USE_HTTPS=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

Or use a reverse proxy (nginx, Caddy, etc.) to handle SSL.

### 3. Rotate Keys Regularly

Generate a new key and update `.env`:

```bash
openssl rand -hex 32
```

### 4. Use Strong Keys

- Use the full 32-byte (64 character) hex string
- Don't use predictable values
- Use `openssl rand -hex 32` to generate

## Troubleshooting

### "Unauthorized" Error

**Check your API key:**
```bash
# View your current key (first 8 characters)
echo $MCP_API_KEY | cut -c1-8
```

**Verify server configuration:**
```bash
# Check if MCP_API_KEY is set in .env
grep MCP_API_KEY .env
```

**Test with curl:**
```bash
curl -v http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $MCP_API_KEY"
```

### EventSource (SSE) Authentication

The browser `EventSource` API doesn't support custom headers. For authenticated SSE requests:

**Option 1: Use fetch() with streaming** (Browser)
```javascript
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
const reader = response.body.getReader();
// Process stream...
```

**Option 2: Use eventsource package** (Node.js)
```javascript
const EventSource = require('eventsource');
const es = new EventSource(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

**Option 3: Use the non-streaming endpoint** (Browser-friendly)
```javascript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({ taskDescription: 'build a chat app' })
});
```

## Examples

See the `examples/` directory for complete examples:

- `examples/client.html` - Web UI with authentication
- `examples/client.py` - Python client with authentication
- `examples/test.sh` - Bash test script with authentication

All examples read `MCP_API_KEY` from environment variables.

## Support

For issues related to authentication:

1. Check this guide
2. Verify your `.env` configuration
3. Test with the `examples/test.sh` script
4. Check server logs for error messages
