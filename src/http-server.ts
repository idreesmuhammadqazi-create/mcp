import express, { Request, Response } from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { promises as fs } from 'fs';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { QuestionGenerator } from './question-generator.js';
import { SessionManager } from './session-manager.js';
import { MCPServer } from './mcp-server.js';
import { Question } from './types.js';

export class HTTPServer {
  private app: express.Application;
  private questionGenerator: QuestionGenerator;
  private sessionManager: SessionManager;
  private mcpServer: MCPServer;
  private mcpTransports: Map<string, SSEServerTransport> = new Map();
  private mcpApiKey: string;
  private config: {
    port: number;
    host: string;
    useHttps: boolean;
    sslKeyPath?: string;
    sslCertPath?: string;
    serverUrl?: string;
  };

  constructor(
    apiKey: string,
    model: string,
    mcpApiKey: string,
    config: {
      port: number;
      host: string;
      useHttps: boolean;
      sslKeyPath?: string;
      sslCertPath?: string;
      serverUrl?: string;
    }
  ) {
    this.app = express();
    this.questionGenerator = new QuestionGenerator(apiKey, model);
    this.sessionManager = new SessionManager();
    this.mcpServer = new MCPServer(apiKey, model, this.questionGenerator, this.sessionManager);
    this.mcpApiKey = mcpApiKey;
    this.config = config;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private createAuthMiddleware(): express.RequestHandler {
    return (req: Request, res: Response, next) => {
      const authHeader = req.header('authorization');

      if (!authHeader) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      const token = match?.[1];

      if (!token || token !== this.mcpApiKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      next();
    };
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // MCP HTTP transport routes
    this.app.get('/mcp', this.createAuthMiddleware(), async (req, res) => {
      const transport = new SSEServerTransport('/mcp', res);
      this.mcpTransports.set(transport.sessionId, transport);
      
      transport.onclose = () => {
        this.mcpTransports.delete(transport.sessionId);
      };

      await this.mcpServer.server.connect(transport);
    });

    this.app.post('/mcp', this.createAuthMiddleware(), async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = this.mcpTransports.get(sessionId);

      if (!transport) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await transport.handlePostMessage(req, res, req.body);
    });

    this.app.use('/api', this.createAuthMiddleware());

    this.app.post('/api/generate', async (req, res) => {
      try {
        const { taskDescription, sessionId } = req.body;

        if (!taskDescription) {
          res.status(400).json({ error: 'taskDescription is required' });
          return;
        }

        if (sessionId) {
          const existingSession = this.sessionManager.getSession(sessionId);
          if (existingSession) {
            res.json({
              sessionId: existingSession.sessionId,
              questions: existingSession.questions,
              message: 'Existing session found'
            });
            return;
          }
        }

        const questions = await this.questionGenerator.generateQuestions(taskDescription);
        const session = this.sessionManager.createSession(taskDescription, questions);

        res.json({
          sessionId: session.sessionId,
          taskDescription: session.taskDescription,
          questions: session.questions
        });
      } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ 
          error: 'Failed to generate questions',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/stream', async (req, res) => {
      const taskDescription = req.query.taskDescription as string;

      if (!taskDescription) {
        res.status(400).json({ error: 'taskDescription query parameter is required' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const questions: Question[] = [];
      let sessionId: string | null = null;

      try {
        res.write('event: start\n');
        res.write(`data: ${JSON.stringify({ message: 'Generating questions...' })}\n\n`);

        for await (const question of this.questionGenerator.streamQuestions(taskDescription)) {
          if (!questions.find(q => q.id === question.id)) {
            questions.push(question);
            
            res.write('event: question\n');
            res.write(`data: ${JSON.stringify(question)}\n\n`);
          }
        }

        const session = this.sessionManager.createSession(taskDescription, questions);
        sessionId = session.sessionId;

        res.write('event: complete\n');
        res.write(`data: ${JSON.stringify({ 
          sessionId: session.sessionId,
          questionCount: questions.length,
          message: 'All questions generated'
        })}\n\n`);

        res.end();
      } catch (error) {
        console.error('Error streaming questions:', error);
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({ 
          error: 'Failed to generate questions',
          details: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
        res.end();
      }
    });

    this.app.post('/api/answer', async (req, res) => {
      try {
        const { sessionId, questionId, answer } = req.body;

        if (!sessionId || !questionId || !answer) {
          res.status(400).json({ 
            error: 'sessionId, questionId, and answer are required' 
          });
          return;
        }

        const success = this.sessionManager.addResponse(sessionId, questionId, answer);

        if (!success) {
          res.status(404).json({ error: 'Session or question not found' });
          return;
        }

        const context = this.sessionManager.getTaskContext(sessionId);
        const answeredCount = Object.keys(context!.responses).length;
        const totalCount = context!.questions.length;

        res.json({
          sessionId,
          questionId,
          answer,
          progress: {
            answered: answeredCount,
            total: totalCount,
            percentage: Math.round((answeredCount / totalCount) * 100)
          },
          complete: answeredCount === totalCount
        });
      } catch (error) {
        console.error('Error recording answer:', error);
        res.status(500).json({ 
          error: 'Failed to record answer',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/context/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const context = this.sessionManager.getTaskContext(sessionId);

        if (!context) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        const answeredCount = Object.keys(context.responses).length;
        const totalCount = context.questions.length;

        res.json({
          ...context,
          progress: {
            answered: answeredCount,
            total: totalCount,
            percentage: Math.round((answeredCount / totalCount) * 100)
          }
        });
      } catch (error) {
        console.error('Error retrieving context:', error);
        res.status(500).json({ 
          error: 'Failed to retrieve context',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/sessions', async (req, res) => {
      try {
        const sessions = this.sessionManager.getAllSessions();
        
        const sessionList = sessions.map(session => ({
          sessionId: session.sessionId,
          taskDescription: session.taskDescription,
          questionsTotal: session.questions.length,
          questionsAnswered: Object.keys(session.responses).length,
          percentComplete: Math.round(
            (Object.keys(session.responses).length / session.questions.length) * 100
          ),
          createdAt: session.createdAt,
          lastUpdated: session.lastUpdated
        }));

        res.json({
          totalSessions: sessions.length,
          sessions: sessionList
        });
      } catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ 
          error: 'Failed to list sessions',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  async start(): Promise<void> {
    const { port, host, useHttps, sslKeyPath, sslCertPath } = this.config;

    if (useHttps) {
      if (!sslKeyPath || !sslCertPath) {
        throw new Error('SSL key and cert paths required for HTTPS');
      }

      try {
        const [key, cert] = await Promise.all([
          fs.readFile(sslKeyPath, 'utf-8'),
          fs.readFile(sslCertPath, 'utf-8')
        ]);

        const server = https.createServer({ key, cert }, this.app);
        server.listen(port, host, () => {
          console.log(`🔒 HTTPS Server running at https://${host}:${port}`);
          this.printEndpoints('https', host, port);
        });
      } catch (error) {
        console.error('❌ Failed to start HTTPS server:', error);
        console.log('💡 Falling back to HTTP...');
        this.startHttpServer();
      }
    } else {
      this.startHttpServer();
    }
  }

  private startHttpServer(): void {
    const { port, host } = this.config;
    const server = http.createServer(this.app);
    server.listen(port, host, () => {
      console.log(`🌐 HTTP Server running at http://${host}:${port}`);
      this.printEndpoints('http', host, port);
    });
  }

  private printEndpoints(protocol: string, host: string, port: number): void {
    const baseUrl = this.config.serverUrl || `${protocol}://${host}:${port}`;
    console.log('\n📡 Available endpoints:');
    console.log(`   Server URL: ${baseUrl}`);
    console.log(`\n🔓 Public endpoints (no auth required):`);
    console.log(`   GET  ${baseUrl}/health`);
    console.log(`\n🔒 Protected endpoints (require Authorization: Bearer header):`);
    console.log(`   GET  ${baseUrl}/mcp (MCP SSE Connection)`);
    console.log(`   POST ${baseUrl}/mcp?sessionId=... (MCP Message)`);
    console.log(`   POST ${baseUrl}/api/generate`);
    console.log(`   GET  ${baseUrl}/api/stream?taskDescription=...`);
    console.log(`   POST ${baseUrl}/api/answer`);
    console.log(`   GET  ${baseUrl}/api/context/:sessionId`);
    console.log(`   GET  ${baseUrl}/api/sessions`);
    console.log(`\n💡 Example authenticated request:`);
    console.log(`   curl -H "Authorization: Bearer YOUR_API_KEY" ${baseUrl}/api/sessions\n`);
  }
}
