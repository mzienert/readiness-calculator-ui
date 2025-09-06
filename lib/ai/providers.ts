import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

const gpt5Nano = 'gpt-5-nano';
const MODELS = {
  GPT_5_NANO: gpt5Nano,
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
        'chat-model': openai(MODELS.GPT_5_NANO),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai(MODELS.GPT_5_NANO),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai(MODELS.GPT_5_NANO),
      },
    });
