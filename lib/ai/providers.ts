import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';

const MODELS = {
  GPT_5_NANO: 'gpt-4o-mini',
  GPT_5: 'gpt-4o-mini',
};

// Use real OpenAI models (test models only available in server-side tests)
export const myProvider = customProvider({
  languageModels: {
    'chat-model': openai(MODELS.GPT_5),
    'chat-model-reasoning': wrapLanguageModel({
      model: openai(MODELS.GPT_5),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': openai(MODELS.GPT_5_NANO),
  },
});
