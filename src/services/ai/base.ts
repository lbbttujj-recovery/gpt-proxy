import type { AIClient, ChatMessage } from './types';

export abstract class BaseAIClient implements AIClient {
  protected readonly systemPrompt?: string;
  protected readonly historyLimit: number;
  // Храним только пользовательские и ассистентские сообщения.
  protected sessions: Map<string, ChatMessage[]> = new Map();

  constructor(systemPrompt?: string, historyLimit = 20) {
    this.systemPrompt = systemPrompt || '';
    this.historyLimit = historyLimit;
  }

  ask(prompt: string): Promise<string> {
    return this.askInSession('default', prompt);
  }

  abstract askInSession(
    sessionId: string | number,
    prompt: string,
  ): Promise<string>;

  resetSession(sessionId: string | number): void {
    this.sessions.delete(String(sessionId));
  }

  protected getHistory(sessionId: string | number): ChatMessage[] {
    return this.sessions.get(String(sessionId)) ?? [];
  }

  protected saveTurn(
    sessionId: string | number,
    userContent: string,
    assistantContent: string,
  ): void {
    const id = String(sessionId);

    // Нормализуем лимит: минимум 2 сообщения (1 пара), целое число
    const rawLimit = Number.isFinite(this.historyLimit)
      ? Math.floor(this.historyLimit)
      : 20;
    const minPairLimit = 2;
    let limit = Math.max(minPairLimit, rawLimit);

    const history = this.getHistory(id);

    const updated: ChatMessage[] = [
      ...history,
      { role: 'user', content: String(userContent ?? '') },
      { role: 'assistant', content: String(assistantContent ?? '') },
    ];

    // Первичное обрезание
    let trimmed =
      updated.length > limit
        ? updated.slice(updated.length - limit)
        : updated.slice();

    // Начало должно быть с user
    if (trimmed[0]?.role === 'assistant') {
      const canShiftLeft = updated.length > limit && updated.length - limit > 0;
      trimmed = canShiftLeft
        ? updated.slice(updated.length - limit - 1, updated.length - 1)
        : trimmed.slice(1);
    }

    // Гарантируем чётное количество элементов (полные пары)
    if (trimmed.length % 2 !== 0) {
      trimmed = trimmed.slice(1);
    }

    // Повторно сузим до лимита, сохраняя чётность
    const evenLimit = limit % 2 === 0 ? limit : limit - 1;
    if (trimmed.length > evenLimit) {
      trimmed = trimmed.slice(trimmed.length - evenLimit);
    }

    this.sessions.set(id, trimmed);
  }

  protected buildMessagesForApi(
    sessionId: string | number,
    nextUserContent: string,
  ): ChatMessage[] {
    const msgs: ChatMessage[] = [];
    if (this.systemPrompt) {
      msgs.push({ role: 'system', content: this.systemPrompt });
    }
    const history = this.getHistory(sessionId);
    msgs.push(...history);
    msgs.push({ role: 'user', content: nextUserContent });
    return msgs;
  }
}
