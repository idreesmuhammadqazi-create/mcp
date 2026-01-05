export interface Question {
  id: string;
  text: string;
  options: string[];
  category: 'tech_stack' | 'scope' | 'architecture' | 'features' | 'deployment' | 'integrations' | 'other';
}

export interface Session {
  sessionId: string;
  taskDescription: string;
  questions: Question[];
  responses: Map<string, string>;
  createdAt: Date;
  lastUpdated: Date;
}

export interface GenerateQuestionsRequest {
  taskDescription: string;
  sessionId?: string;
}

export interface AnswerQuestionRequest {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface GetContextRequest {
  sessionId: string;
}

export interface TaskContext {
  sessionId: string;
  taskDescription: string;
  questions: Question[];
  responses: Record<string, string>;
  createdAt: string;
  lastUpdated: string;
}
