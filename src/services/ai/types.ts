export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AIClient {
  ask(prompt: string): Promise<string>;
  askInSession(sessionId: string | number, prompt: string): Promise<string>;
  resetSession(sessionId: string | number): void;
}
