# Architecture Documentation

## Overview

The Clarifying Questions MCP Server is a dual-mode TypeScript application that can operate as either:
1. **MCP Server** - Communicates via stdio for integration with Claude Desktop/Studio
2. **HTTP/HTTPS Server** - RESTful API with Server-Sent Events (SSE) support

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Claude       │  │ HTTP Client  │  │ Web Browser  │          │
│  │ Desktop      │  │ (curl/Python)│  │ (HTML/JS)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ stdio            │ HTTPS/HTTP       │ HTTPS/HTTP + SSE
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                     Application Layer                            │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              index.ts (Entry Point)                    │     │
│  │  - Mode selection (mcp vs http)                        │     │
│  │  - Environment configuration                           │     │
│  └───────────┬──────────────────────────┬─────────────────┘     │
│              │                          │                        │
│    ┌─────────▼──────────┐    ┌─────────▼──────────┐            │
│    │  mcp-server.ts     │    │  http-server.ts    │            │
│    │  ┌──────────────┐  │    │  ┌──────────────┐  │            │
│    │  │ MCP Protocol │  │    │  │ Express App  │  │            │
│    │  │ Handlers     │  │    │  │ REST Routes  │  │            │
│    │  │ - Tools      │  │    │  │ - POST/GET   │  │            │
│    │  │ - stdio I/O  │  │    │  │ - SSE Stream │  │            │
│    │  └──────────────┘  │    │  └──────────────┘  │            │
│    └────────────────────┘    └────────────────────┘            │
│              │                          │                        │
│              └─────────┬────────────────┘                        │
│                        │                                         │
│         ┌──────────────▼───────────────┐                        │
│         │     Business Logic Layer     │                        │
│         └──────────────┬───────────────┘                        │
└────────────────────────┼─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                   Core Services Layer                            │
│  ┌──────────────────────────────┐  ┌───────────────────────┐    │
│  │  question-generator.ts       │  │  session-manager.ts   │    │
│  │  ┌────────────────────────┐  │  │  ┌─────────────────┐  │    │
│  │  │ Claude API Integration │  │  │  │ Session CRUD    │  │    │
│  │  │ - Streaming support    │  │  │  │ - Create        │  │    │
│  │  │ - Question generation  │  │  │  │ - Read          │  │    │
│  │  │ - Prompt engineering   │  │  │  │ - Update        │  │    │
│  │  │ - Response parsing     │  │  │  │ - Auto-cleanup  │  │    │
│  │  └────────────────────────┘  │  │  └─────────────────┘  │    │
│  └──────────────────────────────┘  └───────────────────────┘    │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐      │
│  │  Anthropic API       │      │  File System            │      │
│  │  - Claude 3.5        │      │  - Session persistence  │      │
│  │  - Streaming API     │      │  - JSON storage         │      │
│  └──────────────────────┘      └─────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Entry Point (`index.ts`)

**Responsibilities:**
- Parse command-line arguments to determine mode
- Load environment variables
- Initialize appropriate server (MCP or HTTP)
- Handle fatal errors

**Configuration:**
- Reads from `.env` file
- Validates required environment variables (API key)
- Supports multiple modes: `mcp`, `stdio`, `http`, `https`

### 2. MCP Server (`mcp-server.ts`)

**Responsibilities:**
- Implement Model Context Protocol specification
- Handle tool requests via stdio
- Format responses according to MCP standard

**Tools Exposed:**
- `generate_questions` - Generate clarifying questions
- `answer_question` - Submit answer to a question
- `get_context` - Retrieve full session context
- `list_sessions` - List all active sessions

**Communication:**
- Uses stdio (stdin/stdout)
- JSON-RPC protocol
- Compatible with Claude Desktop and Studio

### 3. HTTP Server (`http-server.ts`)

**Responsibilities:**
- RESTful API endpoints
- Server-Sent Events (SSE) streaming
- HTTPS/HTTP support
- CORS configuration

**Endpoints:**

| Method | Path | Description | Response Type |
|--------|------|-------------|---------------|
| GET | `/health` | Health check | JSON |
| POST | `/api/generate` | Generate questions | JSON |
| GET | `/api/stream` | Stream questions | SSE |
| POST | `/api/answer` | Submit answer | JSON |
| GET | `/api/context/:id` | Get context | JSON |
| GET | `/api/sessions` | List sessions | JSON |

**Features:**
- Automatic HTTPS fallback to HTTP
- Self-signed certificate support
- Request logging middleware
- Error handling

### 4. Question Generator (`question-generator.ts`)

**Responsibilities:**
- Interface with Anthropic Claude API
- Generate contextually relevant questions
- Support streaming and non-streaming modes
- Parse and validate responses

**Question Categories:**
- `tech_stack` - Framework, language, library decisions
- `scope` - Project size, timeline, MVP vs full-featured
- `architecture` - System design, patterns
- `features` - Specific functionality, integrations
- `deployment` - Hosting, CI/CD, scaling
- `integrations` - External APIs, databases, auth
- `other` - Miscellaneous

**Prompt Engineering:**
- Structured prompts for consistent output
- JSON response format enforcement
- Fallback questions for error cases
- Context-aware question generation

**Streaming:**
- Uses Claude's streaming API
- Yields questions as they're generated
- Handles partial JSON parsing

### 5. Session Manager (`session-manager.ts`)

**Responsibilities:**
- Session lifecycle management
- Persistent storage (JSON files)
- Response tracking
- Automatic cleanup of expired sessions

**Storage:**
- In-memory map for fast access
- JSON files in `./sessions/` directory
- Auto-save on every modification
- Load on startup

**Session Structure:**
```typescript
{
  sessionId: string;
  taskDescription: string;
  questions: Question[];
  responses: Map<string, string>;
  createdAt: Date;
  lastUpdated: Date;
}
```

**Cleanup:**
- Runs every 60 seconds
- Removes sessions older than configured timeout (default: 1 hour)
- Deletes both in-memory and file storage

## Data Flow

### Question Generation Flow

```
1. Client Request
   ↓
2. HTTP/MCP Server receives request with taskDescription
   ↓
3. QuestionGenerator.generateQuestions()
   ↓
4. Anthropic API call with structured prompt
   ↓
5. Parse JSON response into Question objects
   ↓
6. SessionManager.createSession() with questions
   ↓
7. Save to memory and disk
   ↓
8. Return sessionId and questions to client
```

### Answer Submission Flow

```
1. Client submits answer (sessionId, questionId, answer)
   ↓
2. SessionManager.addResponse()
   ↓
3. Validate session and question exist
   ↓
4. Store answer in session.responses Map
   ↓
5. Update lastUpdated timestamp
   ↓
6. Save session to disk
   ↓
7. Calculate progress (answered/total)
   ↓
8. Return progress and completion status
```

### Streaming Flow (SSE)

```
1. Client connects to /api/stream endpoint
   ↓
2. Server sends SSE headers
   ↓
3. Send "start" event
   ↓
4. For each question from Claude streaming API:
   │  ↓
   │  Send "question" event with question data
   │  ↓
   │  Client receives and displays question
   ↓
5. Create session with all questions
   ↓
6. Send "complete" event with sessionId
   ↓
7. Close SSE connection
```

## Security Considerations

### API Key Management
- Stored in environment variables
- Never exposed in responses
- Read from `.env` file or system environment

### HTTPS Configuration
- Self-signed certificates for development
- Automatic fallback to HTTP if cert unavailable
- Certificate generation script included

### Input Validation
- Validate all user inputs
- Sanitize taskDescription
- Validate sessionId and questionId existence
- Type checking with TypeScript

### Session Security
- Random session ID generation
- Automatic expiration
- No user authentication (designed for local use)
- File-based storage (single-user assumption)

## Scalability Considerations

### Current Limitations
- In-memory + file storage (single instance)
- No database (sessions stored as JSON files)
- No authentication/authorization
- Single-user design

### Future Enhancements
- Database integration (PostgreSQL/MongoDB)
- Redis for session storage
- Multi-user support with authentication
- Load balancing support
- Distributed session management
- WebSocket alternative to SSE
- Rate limiting

## Error Handling

### Error Types
1. **API Errors** - Claude API failures
2. **Session Errors** - Invalid or expired sessions
3. **Validation Errors** - Invalid input
4. **System Errors** - File I/O, network issues

### Error Responses

**MCP Mode:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error message>"
    }
  ],
  "isError": true
}
```

**HTTP Mode:**
```json
{
  "error": "<error type>",
  "details": "<detailed message>"
}
```

### Fallback Mechanisms
- Default questions if Claude API fails
- HTTP fallback if HTTPS fails
- Graceful degradation

## Performance Optimization

### Caching
- Sessions cached in memory
- Lazy loading from disk
- No redundant API calls for same session

### Streaming Benefits
- Reduced perceived latency
- Progressive rendering
- Better user experience
- Lower memory usage

### Session Cleanup
- Automatic garbage collection
- Prevents memory leaks
- Disk space management

## Testing Strategy

### Unit Tests (Future)
- Question generator logic
- Session management operations
- Response parsing

### Integration Tests (Future)
- HTTP endpoints
- MCP tool handlers
- Claude API integration

### Manual Testing
- Example clients provided
- Test script (`examples/test.sh`)
- Interactive Python client

## Deployment

### Local Development
```bash
npm run dev http    # HTTP server with hot reload
npm run dev mcp     # MCP server with hot reload
```

### Production Build
```bash
npm run build       # Compile TypeScript
npm start http      # Run HTTP server
npm start mcp       # Run MCP server
```

### Docker (Future)
- Containerization for easy deployment
- Environment variable configuration
- Volume mounting for session persistence

### Cloud Deployment (Future)
- Heroku/Railway/Fly.io compatible
- Environment variable configuration
- Stateless design with external session storage

## Monitoring and Logging

### Current Logging
- Request logging to console
- Error logging to stderr
- Session operations logged

### Future Enhancements
- Structured logging (JSON)
- Log levels (debug, info, warn, error)
- Log aggregation (CloudWatch, Datadog)
- Metrics collection
- Performance monitoring

## Configuration Management

### Environment Variables
All configuration via `.env` file:
- `ANTHROPIC_API_KEY` - Required
- `PORT` - Server port
- `HOST` - Server host
- `USE_HTTPS` - Enable HTTPS
- `SSL_KEY_PATH` - SSL private key
- `SSL_CERT_PATH` - SSL certificate
- `CLAUDE_MODEL` - Claude model version
- `SESSION_TIMEOUT_MS` - Session timeout

### Default Values
Sensible defaults for all optional parameters in code.

## Dependencies

### Production Dependencies
- `@anthropic-ai/sdk` - Claude API client
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `express` - HTTP server framework
- `cors` - CORS middleware
- `dotenv` - Environment variable management

### Development Dependencies
- `typescript` - Type checking and compilation
- `tsx` - TypeScript execution for development
- `@types/*` - Type definitions

## Future Roadmap

### Short Term
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Docker support
- [ ] CLI improvements

### Medium Term
- [ ] Database integration
- [ ] Multi-user support
- [ ] Authentication/Authorization
- [ ] WebSocket support
- [ ] Rate limiting

### Long Term
- [ ] Question template library
- [ ] Custom question categories
- [ ] AI-powered answer validation
- [ ] Context export (PDF, Markdown)
- [ ] Integration with project management tools
