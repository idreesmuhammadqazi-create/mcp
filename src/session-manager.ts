import { Session, Question, TaskContext } from './types.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout: number;
  private sessionsDir: string;

  constructor(timeoutMs: number = 3600000, sessionsDir: string = './sessions') {
    this.sessionTimeout = timeoutMs;
    this.sessionsDir = sessionsDir;
    this.startCleanupInterval();
    this.loadSessions();
  }

  private async loadSessions(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      const files = await fs.readdir(this.sessionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(join(this.sessionsDir, file), 'utf-8');
          const data = JSON.parse(content);
          const session: Session = {
            ...data,
            responses: new Map(Object.entries(data.responses || {})),
            createdAt: new Date(data.createdAt),
            lastUpdated: new Date(data.lastUpdated)
          };
          this.sessions.set(session.sessionId, session);
        }
      }
      console.log(`📂 Loaded ${this.sessions.size} session(s) from disk`);
    } catch (error) {
      console.log('📂 No existing sessions found or error loading:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async saveSession(session: Session): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      const filePath = join(this.sessionsDir, `${session.sessionId}.json`);
      const data = {
        ...session,
        responses: Object.fromEntries(session.responses)
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  createSession(taskDescription: string, questions: Question[]): Session {
    const sessionId = this.generateSessionId();
    const session: Session = {
      sessionId,
      taskDescription,
      questions,
      responses: new Map(),
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    this.sessions.set(sessionId, session);
    this.saveSession(session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addResponse(sessionId: string, questionId: string, answer: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return false;
    }

    session.responses.set(questionId, answer);
    session.lastUpdated = new Date();
    this.saveSession(session);
    return true;
  }

  getTaskContext(sessionId: string): TaskContext | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      taskDescription: session.taskDescription,
      questions: session.questions,
      responses: Object.fromEntries(session.responses),
      createdAt: session.createdAt.toISOString(),
      lastUpdated: session.lastUpdated.toISOString()
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastUpdated.getTime() > this.sessionTimeout) {
          this.sessions.delete(sessionId);
          fs.unlink(join(this.sessionsDir, `${sessionId}.json`)).catch(() => {});
          console.log(`🗑️  Cleaned up expired session: ${sessionId}`);
        }
      }
    }, 60000);
  }

  getAllSessions(): TaskContext[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      taskDescription: session.taskDescription,
      questions: session.questions,
      responses: Object.fromEntries(session.responses),
      createdAt: session.createdAt.toISOString(),
      lastUpdated: session.lastUpdated.toISOString()
    }));
  }
}
