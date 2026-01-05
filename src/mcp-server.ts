import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { QuestionGenerator } from './question-generator.js';
import { SessionManager } from './session-manager.js';
import { GenerateQuestionsRequest, AnswerQuestionRequest, GetContextRequest } from './types.js';

export class MCPServer {
  private server: Server;
  private questionGenerator: QuestionGenerator;
  private sessionManager: SessionManager;

  constructor(apiKey: string, model?: string) {
    this.server = new Server(
      {
        name: 'clarifying-questions-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.questionGenerator = new QuestionGenerator(apiKey, model);
    this.sessionManager = new SessionManager();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_questions':
            return await this.handleGenerateQuestions(args as unknown as GenerateQuestionsRequest);
          case 'answer_question':
            return await this.handleAnswerQuestion(args as unknown as AnswerQuestionRequest);
          case 'get_context':
            return await this.handleGetContext(args as unknown as GetContextRequest);
          case 'list_sessions':
            return await this.handleListSessions();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'generate_questions',
        description: 'Generate clarifying questions for a task description. Returns a session ID and questions that help understand requirements better.',
        inputSchema: {
          type: 'object',
          properties: {
            taskDescription: {
              type: 'string',
              description: 'The user\'s task or project description'
            },
            sessionId: {
              type: 'string',
              description: 'Optional: Continue an existing session'
            }
          },
          required: ['taskDescription']
        }
      },
      {
        name: 'answer_question',
        description: 'Submit an answer to a clarifying question. Stores the response in the session context.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The session ID from generate_questions'
            },
            questionId: {
              type: 'string',
              description: 'The ID of the question being answered'
            },
            answer: {
              type: 'string',
              description: 'The selected answer or custom response'
            }
          },
          required: ['sessionId', 'questionId', 'answer']
        }
      },
      {
        name: 'get_context',
        description: 'Retrieve the complete task context including all questions and responses for a session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The session ID to retrieve context for'
            }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'list_sessions',
        description: 'List all active sessions with their task descriptions and response counts.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  private async handleGenerateQuestions(args: GenerateQuestionsRequest) {
    const { taskDescription, sessionId } = args;

    if (sessionId) {
      const existingSession = this.sessionManager.getSession(sessionId);
      if (existingSession) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId: existingSession.sessionId,
                questions: existingSession.questions,
                message: 'Existing session found'
              }, null, 2)
            }
          ]
        };
      }
    }

    const questions = await this.questionGenerator.generateQuestions(taskDescription);
    const session = this.sessionManager.createSession(taskDescription, questions);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: session.sessionId,
            taskDescription: session.taskDescription,
            questions: session.questions,
            message: 'Questions generated successfully. Use answer_question to respond.'
          }, null, 2)
        }
      ]
    };
  }

  private async handleAnswerQuestion(args: AnswerQuestionRequest) {
    const { sessionId, questionId, answer } = args;

    const success = this.sessionManager.addResponse(sessionId, questionId, answer);

    if (!success) {
      throw new Error('Invalid session ID or question ID');
    }

    const context = this.sessionManager.getTaskContext(sessionId);
    const answeredCount = Object.keys(context!.responses).length;
    const totalCount = context!.questions.length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId,
            questionId,
            answer,
            progress: `${answeredCount}/${totalCount} questions answered`,
            message: answeredCount === totalCount 
              ? 'All questions answered! Use get_context to retrieve full context.'
              : 'Answer recorded. Continue answering remaining questions.'
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetContext(args: GetContextRequest) {
    const { sessionId } = args;

    const context = this.sessionManager.getTaskContext(sessionId);

    if (!context) {
      throw new Error('Session not found');
    }

    const answeredCount = Object.keys(context.responses).length;
    const totalCount = context.questions.length;

    const summary = this.buildContextSummary(context);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...context,
            progress: `${answeredCount}/${totalCount} questions answered`,
            summary
          }, null, 2)
        }
      ]
    };
  }

  private async handleListSessions() {
    const sessions = this.sessionManager.getAllSessions();

    const sessionList = sessions.map(session => ({
      sessionId: session.sessionId,
      taskDescription: session.taskDescription,
      questionsTotal: session.questions.length,
      questionsAnswered: Object.keys(session.responses).length,
      createdAt: session.createdAt,
      lastUpdated: session.lastUpdated
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalSessions: sessions.length,
            sessions: sessionList
          }, null, 2)
        }
      ]
    };
  }

  private buildContextSummary(context: any): string {
    const lines = [
      `Task: ${context.taskDescription}`,
      '',
      'Responses:'
    ];

    for (const question of context.questions) {
      const answer = context.responses[question.id];
      if (answer) {
        lines.push(`- ${question.text}`);
        lines.push(`  Answer: ${answer}`);
      }
    }

    return lines.join('\n');
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Clarifying Questions Server running on stdio');
  }
}
