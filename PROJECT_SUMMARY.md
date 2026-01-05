# Project Summary

## Studio MCP Clarifying Questions Server

A production-ready Model Context Protocol (MCP) server that generates intelligent clarifying questions for user task requests using Claude AI.

## 🎯 Project Overview

This project implements a dual-mode server that:
1. **MCP Mode**: Integrates with Claude Desktop/Studio via stdio
2. **HTTP Mode**: Provides RESTful API with real-time streaming (SSE)

### Key Features

✅ **AI-Powered Question Generation** - Uses Claude 3.5 to generate contextually relevant questions
✅ **Real-time Streaming** - Server-Sent Events (SSE) for progressive question delivery
✅ **HTTPS Support** - Self-signed certificates for development, production-ready
✅ **Session Management** - Persistent storage with automatic cleanup
✅ **Dual Protocol** - Works as both MCP server and HTTP API
✅ **TypeScript** - Fully typed codebase with strict mode
✅ **Production Ready** - Error handling, logging, and graceful degradation

## 📁 Project Structure

```
studio-mcp-clarifying-questions-server/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Entry point and mode selection
│   ├── mcp-server.ts             # MCP protocol implementation
│   ├── http-server.ts            # HTTP/HTTPS server with SSE
│   ├── question-generator.ts     # Claude API integration
│   ├── session-manager.ts        # Session lifecycle management
│   └── types.ts                  # TypeScript type definitions
├── dist/                         # Compiled JavaScript (generated)
├── examples/                     # Example clients and usage
│   ├── client.html               # Web-based client UI
│   ├── client.py                 # Python client (interactive)
│   ├── test.sh                   # Comprehensive test script
│   └── claude_desktop_config.json # MCP configuration example
├── scripts/                      # Utility scripts
│   └── generate-cert.js          # SSL certificate generator
├── sessions/                     # Session storage (generated)
├── certs/                        # SSL certificates (generated)
├── README.md                     # Comprehensive documentation
├── QUICKSTART.md                 # Quick start guide
├── ARCHITECTURE.md               # Technical architecture docs
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
└── LICENSE                       # MIT License

```

## 🚀 Quick Start

### Installation
```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run build
```

### Run HTTP Server
```bash
npm start http
# Server runs at http://localhost:3000
```

### Run MCP Server
```bash
npm start mcp
# For integration with Claude Desktop
```

## 🔧 Technical Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **MCP SDK**: @modelcontextprotocol/sdk v1.0.4
- **AI**: Anthropic Claude 3.5 Sonnet
- **HTTP Framework**: Express 4.x
- **Streaming**: Server-Sent Events (SSE)

### Key Dependencies
- `@anthropic-ai/sdk` - Claude API client
- `@modelcontextprotocol/sdk` - MCP protocol
- `express` - HTTP server
- `cors` - CORS middleware
- `dotenv` - Environment configuration

## 📊 Architecture Highlights

### Dual-Mode Design
```
┌─────────────┐     ┌─────────────┐
│   stdio     │     │ HTTP/HTTPS  │
│   (MCP)     │     │   (REST)    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Core Services   │
        │  - Questions     │
        │  - Sessions      │
        └──────────────────┘
```

### Question Categories
- **tech_stack** - Frameworks, languages, libraries
- **scope** - Project size, timeline, MVP
- **architecture** - System design, patterns
- **features** - Functionality, integrations
- **deployment** - Hosting, CI/CD, scaling
- **integrations** - APIs, databases, auth

### Session Lifecycle
1. Generate questions from task description
2. Stream questions to client (real-time)
3. Collect user responses
4. Build comprehensive task context
5. Auto-expire after inactivity (1 hour)

## 🔌 API Reference

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/generate` | POST | Generate questions |
| `/api/stream` | GET | Stream questions (SSE) |
| `/api/answer` | POST | Submit answer |
| `/api/context/:id` | GET | Get session context |
| `/api/sessions` | GET | List sessions |

### MCP Tools

| Tool | Description |
|------|-------------|
| `generate_questions` | Generate clarifying questions |
| `answer_question` | Submit answer to question |
| `get_context` | Retrieve full context |
| `list_sessions` | List all sessions |

## 💡 Example Usage

### HTTP API (curl)
```bash
# Generate questions
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "build a chat app"}'

# Stream questions
curl -N http://localhost:3000/api/stream\?taskDescription\="build%20a%20chat%20app"

# Answer question
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"session_123","questionId":"q1","answer":"React"}'
```

### Python Client
```bash
# Interactive mode
python3 examples/client.py

# Automated mode
python3 examples/client.py --auto
```

### Web Client
Open `examples/client.html` in any modern browser.

### MCP Integration
Configure Claude Desktop:
```json
{
  "mcpServers": {
    "clarifying-questions": {
      "command": "node",
      "args": ["/path/to/dist/index.js", "mcp"],
      "env": {"ANTHROPIC_API_KEY": "your_key"}
    }
  }
}
```

## 🧪 Testing

### Automated Test Suite
```bash
./examples/test.sh
```

Tests all endpoints:
- ✅ Health check
- ✅ Question generation (non-streaming)
- ✅ Answer submission
- ✅ Context retrieval
- ✅ Session listing
- ✅ Streaming (SSE)

### Manual Testing
1. **Web UI**: Open `examples/client.html`
2. **Python**: Run `examples/client.py`
3. **curl**: See examples in README.md

## 🛡️ Security Features

- ✅ API key in environment variables
- ✅ HTTPS support with self-signed certs
- ✅ Input validation and sanitization
- ✅ Session expiration
- ✅ Error handling and logging
- ✅ CORS configuration

## 📈 Performance

- **Streaming**: Questions delivered progressively (reduced latency)
- **Caching**: Sessions cached in memory
- **Cleanup**: Automatic expired session removal
- **Efficient**: Minimal memory footprint

## 🔄 Session Management

### Storage
- In-memory for fast access
- JSON files for persistence
- Auto-load on startup
- Auto-save on modification

### Lifecycle
```
Create → Active → Responses → Complete → Expire → Cleanup
         (1 hour default timeout)
```

## 📚 Documentation

- **README.md** - Comprehensive usage guide
- **QUICKSTART.md** - 5-minute setup guide
- **ARCHITECTURE.md** - Technical deep dive
- **Examples/** - Working client implementations

## 🎨 Example Flow

```
User Input:
"make me a website that runs pseudocode"
           ↓
Server Generates Questions:
1. Frontend framework? (React/Vue/Svelte/...)
2. Backend needed? (Node.js/Python/None/...)
3. Pseudocode execution? (Interpreter/Simulator/...)
4. Deployment target? (Vercel/AWS/Docker/...)
5. Authentication? (Yes/No)
           ↓
User Responds:
1. React
2. Node.js/Express
3. Interpreter
4. Vercel
5. No
           ↓
Complete Task Context:
{
  task: "website that runs pseudocode",
  techStack: "React + Node.js",
  features: ["interpreter"],
  deployment: "Vercel",
  auth: false
}
```

## 🔮 Future Enhancements

### Short Term
- Unit and integration tests
- Docker containerization
- CLI improvements

### Medium Term
- Database integration (PostgreSQL)
- Multi-user support
- Authentication/Authorization
- WebSocket alternative to SSE

### Long Term
- Question template library
- Custom categories
- AI answer validation
- Export formats (PDF, Markdown)
- Project management integrations

## 📋 Requirements Met

✅ **Node.js/TypeScript MCP server** - Fully implemented
✅ **HTTPS/streaming support** - Express + SSE
✅ **Accept task description** - Multiple endpoints
✅ **Generate 5-7 questions** - AI-powered via Claude
✅ **Categorized questions** - 6 categories
✅ **Real-time streaming** - SSE implementation
✅ **Store responses** - Persistent sessions
✅ **Studio-compatible** - MCP protocol
✅ **HTTPS config** - Self-signed cert support
✅ **Integration instructions** - Comprehensive docs
✅ **Example clients** - HTML, Python, bash
✅ **README** - Detailed documentation

## 🤝 Contributing

This is a fully functional implementation. Contributions welcome for:
- Additional question categories
- New client implementations
- Performance optimizations
- Feature enhancements

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- Anthropic Claude API for question generation
- MCP SDK for protocol implementation
- Express.js for HTTP server
- TypeScript for type safety

## 📞 Support

- Check README.md for detailed documentation
- Run `./examples/test.sh` to verify setup
- Review examples/ for usage patterns

---

**Built with ❤️ using TypeScript, Claude AI, and MCP**
