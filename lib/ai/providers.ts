import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { chatModel, reasoningModel, titleModel } from './models.test';
import { isTestEnvironment } from '../constants';

const MODELS = {
  GPT_5_NANO: 'gpt-4o-mini',
  GPT_5: 'gpt-4o-mini',
};

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openai(MODELS.GPT_5),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai(MODELS.GPT_5),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai(MODELS.GPT_5_NANO),
      },
    });
