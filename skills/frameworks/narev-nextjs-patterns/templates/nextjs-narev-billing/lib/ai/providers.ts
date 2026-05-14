import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function getLanguageModel(modelId: string) {
  return openai(modelId);
}
