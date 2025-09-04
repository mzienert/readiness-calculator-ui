import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { InferUITool, UIMessage } from 'ai';


export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;

export type ChatTools = {
  getWeather: weatherTool;
};

export type CustomUIDataTypes = {
  appendMessage: string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

