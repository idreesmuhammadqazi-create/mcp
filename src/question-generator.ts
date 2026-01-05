import Groq from '@groq/sdk';
import { Question } from './types.js';

export class QuestionGenerator {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'mixtral-8x7b-32768') {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateQuestions(taskDescription: string): Promise<Question[]> {
    const prompt = this.buildPrompt(taskDescription);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.3
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Groq');
      }

      return this.parseQuestions(content);
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }

  async *streamQuestions(taskDescription: string): AsyncGenerator<Question, void, unknown> {
    const prompt = this.buildPrompt(taskDescription);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.3,
        stream: true
      });

      let accumulatedText = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          accumulatedText += content;
          
          const questions = this.tryParsePartialQuestions(accumulatedText);
          for (const question of questions) {
            yield question;
          }
        }
      }

      const finalQuestions = this.parseQuestions(accumulatedText);
      for (const question of finalQuestions) {
        yield question;
      }
    } catch (error) {
      console.error('Error streaming questions:', error);
      throw error;
    }
  }

  private buildPrompt(taskDescription: string): string {
    return `You are an expert software architect helping to clarify requirements for a development task.

Task Description: "${taskDescription}"

Generate 5-7 clarifying questions to better understand this task. Focus on:
1. Tech stack decisions (frameworks, languages, libraries)
2. Scope (MVP vs full-featured, timeline)
3. Architecture (monolith vs microservices, patterns)
4. Features (specific functionality, integrations)
5. Deployment (hosting, CI/CD, scaling)
6. Integrations (APIs, databases, auth services)

For each question, provide 3-5 multiple choice options that cover the most common scenarios.

Format your response EXACTLY as valid JSON with this structure:
{
  "questions": [
    {
      "id": "q1",
      "text": "What frontend framework should be used?",
      "category": "tech_stack",
      "options": ["React", "Vue", "Svelte", "Plain HTML+JS", "Other"]
    },
    {
      "id": "q2",
      "text": "Do you need a backend?",
      "category": "architecture",
      "options": ["Yes, Node.js/Express", "Yes, Python/Flask", "Yes, Python/Django", "No, static only", "Other"]
    }
  ]
}

Valid categories: tech_stack, scope, architecture, features, deployment, integrations, other

Ensure all JSON is valid. Do not include any text before or after the JSON object.`;
  }

  private parseQuestions(jsonText: string): Question[] {
    try {
      const cleaned = jsonText.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid questions format');
      }

      return parsed.questions.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        text: q.text,
        category: q.category || 'other',
        options: q.options || []
      }));
    } catch (error) {
      console.error('Error parsing questions:', error);
      console.error('Raw text:', jsonText);
      return this.getFallbackQuestions();
    }
  }

  private tryParsePartialQuestions(text: string): Question[] {
    try {
      return this.parseQuestions(text);
    } catch {
      return [];
    }
  }

  private getFallbackQuestions(): Question[] {
    return [
      {
        id: 'q1',
        text: 'What is the primary technology stack?',
        category: 'tech_stack',
        options: ['JavaScript/Node.js', 'Python', 'Java', 'Go', 'Other']
      },
      {
        id: 'q2',
        text: 'What type of application is this?',
        category: 'architecture',
        options: ['Web application', 'Mobile app', 'API/Backend service', 'Desktop application', 'CLI tool']
      },
      {
        id: 'q3',
        text: 'What is the deployment target?',
        category: 'deployment',
        options: ['Cloud (AWS/GCP/Azure)', 'Vercel/Netlify', 'Docker/Kubernetes', 'On-premises', 'Local development only']
      },
      {
        id: 'q4',
        text: 'Does this require a database?',
        category: 'features',
        options: ['Yes, SQL (PostgreSQL/MySQL)', 'Yes, NoSQL (MongoDB/DynamoDB)', 'Yes, both', 'No', 'Not sure']
      },
      {
        id: 'q5',
        text: 'What is the project scope?',
        category: 'scope',
        options: ['Quick prototype/MVP', 'Production-ready application', 'Enterprise-grade system', 'Personal project', 'Learning/experimental']
      }
    ];
  }
}
