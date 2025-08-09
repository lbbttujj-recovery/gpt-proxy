import { BaseAIClient } from './base';

export class MockAIClient extends BaseAIClient {
  async askInSession(sessionId: string | number, prompt: string): Promise<string> {
    const history = this.getHistory(sessionId);
    const turns = Math.floor(history.length / 2); // каждая пара user/assistant — 2 сообщения
    const preface =
      turns === 0
        ? 'Начинаем диалог.'
        : `Продолжаем (сообщений в истории: ${history.length}).`;

    // Простейшая имитация "понимания" контекста — учитываем предыдущую тему (последнее user-сообщение, если есть).
    const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content;

    const reply =
      lastUser && lastUser.length > 0
        ? `${preface} Вы спрашивали ранее: "${lastUser.slice(0, 120)}". Мой ответ на новое: "${prompt.slice(0, 200)}".`
        : `${preface} Вы сказали: "${prompt.slice(0, 200)}".`;

    this.saveTurn(sessionId, prompt, `MOCK: ${reply}`);
    return `MOCK: ${reply}`;
  }
}
