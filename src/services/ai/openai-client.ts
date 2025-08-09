import { BaseAIClient } from './base';
import OpenAI from 'openai';

export class OpenAIClient extends BaseAIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    model: string,
    timeoutMs = 30_000,
    systemPrompt?: string,
    historyLimit = 20,
  ) {
    super(systemPrompt, historyLimit);
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  async askInSession(
    sessionId: string | number,
    prompt: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const completion = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: 1,
          messages: this.buildMessagesForApi(sessionId, prompt),
        },
        { signal: controller.signal },
      );

      const content = completion.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Пустой ответ от OpenAI');
      }

      const reply = content.trim();
      this.saveTurn(sessionId, prompt, reply);
      return reply;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Тайм-аут запроса к OpenAI');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
