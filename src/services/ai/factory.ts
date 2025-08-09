import type { AIClient } from './types';
import { OpenAIClient } from './openai-client';
import { MockAIClient } from './mock-client';

export function createAIClient(): AIClient {
  const useMock =
    String(process.env.OPENAI_USE_MOCK).toLowerCase() === 'true' ||
    !process.env.OPENAI_API_KEY;

  const historyLimit =
    Number.parseInt(String(process.env.OPENAI_HISTORY_LIMIT ?? ''), 10) || 20;
  const systemPrompt = process.env.OPENAI_SYSTEM_PROMPT || undefined;

  if (useMock) {
    console.log('ℹ️ AI: используется мок-режим (MockAIClient) с историей');
    return new MockAIClient(systemPrompt, historyLimit);
  }

  const apiKey = process.env.OPENAI_API_KEY as string;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log(`ℹ️ AI: используется OpenAIClient (model=${model}, historyLimit=${historyLimit})`);
  return new OpenAIClient(apiKey, model, 30_000, systemPrompt, historyLimit);
}

export type { AIClient } from './types';
