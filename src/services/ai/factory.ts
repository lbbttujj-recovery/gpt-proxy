import type { AIClient } from './types';
import { OpenAIClient } from './openai-client';
import { MockAIClient } from './mock-client';

/*
  Фабрика возвращает "managed" объект, который делегирует вызовы
  реальному клиенту (Mock или OpenAI) и позволяет менять модель в рантайме.
  Переключение модели пересоздаёт внутренний OpenAIClient.
*/

export function createAIClient(): AIClient {
  const useMock =
    String(process.env.OPENAI_USE_MOCK).toLowerCase() === 'true' ||
    !process.env.OPENAI_API_KEY;

  const historyLimit =
    Number.parseInt(String(process.env.OPENAI_HISTORY_LIMIT ?? ''), 10) || 20;
  const systemPrompt = process.env.OPENAI_SYSTEM_PROMPT || undefined;
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const defaultModel = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const strongModel = process.env.OPENAI_STRONG_MODEL || 'gpt-4o';

  // Текущая модель, по умолчанию — defaultModel
  let currentModel = defaultModel;

  // Вспомогательная функция создаёт конкретный клиент
  const createClientInstance = (): any => {
    if (useMock) {
      return new MockAIClient(systemPrompt, historyLimit);
    }
    return new OpenAIClient(
      apiKey as string,
      currentModel,
      30_000,
      systemPrompt,
      historyLimit,
    );
  };

  let client = createClientInstance();

  const wrapper: AIClient = {
    ask(prompt: string) {
      return client.ask(prompt);
    },

    askInSession(sessionId: string | number, prompt: string) {
      return client.askInSession(sessionId, prompt);
    },

    resetSession(sessionId: string | number) {
      return client.resetSession(sessionId);
    },

    setModel(newModel: string) {
      // если мок — сохраняем значение, но не пересоздаём
      currentModel = newModel;
      if (!useMock) {
        client = createClientInstance();
        console.log(`ℹ️ AI: модель переключена на ${currentModel}`);
      } else {
        console.log(
          `ℹ️ AI (mock): модель установлена в ${currentModel} (mock не использует модель)`,
        );
      }
    },

    getModel() {
      return currentModel;
    },
  };

  console.log(
    `ℹ️ AI: создаём клиент (useMock=${useMock}, model=${currentModel}, historyLimit=${historyLimit})`,
  );
  return wrapper;
}

export type { AIClient } from './types';
