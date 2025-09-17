import { apiClient } from './http-client';
import type { CoreMessage } from 'ai';
import type { TokenUsage } from '@/lib/ai/schemas';

export interface ThreadResponse {
  threadId: string;
}

export interface QualifierRequest {
  messages: CoreMessage[];
  threadId: string;
}

export interface QualifierResponse {
  response: string;
  qualifier?: any;
  isComplete: boolean;
  dynamicWeighting?: any;
  tokenUsage?: TokenUsage;
}

export interface AssessorRequest {
  messages: CoreMessage[];
  threadId: string;
  qualifier?: any;
}

export interface AssessorResponse {
  response: string;
  assessmentData?: any;
  currentQuestionId?: string;
  isComplete: boolean;
  tokenUsage?: TokenUsage;
}

export interface ChatHistoryRequest {
  chatId: string;
  messages: any[];
  selectedVisibilityType: string;
  threadId?: string;
}

export interface ChatDeleteRequest {
  id: string;
}

export interface ModelsResponse {
  data: any[];
}

/**
 * API service for thread management
 */
export const threadsApi = {
  /**
   * Create a new OpenAI thread
   */
  async create(): Promise<ThreadResponse> {
    const response = await apiClient.post<ThreadResponse>('/api/threads');
    return response.data;
  },
};

/**
 * API service for agent interactions
 */
export const agentsApi = {
  /**
   * Send message to qualifier agent
   */
  async qualifier(request: QualifierRequest): Promise<QualifierResponse> {
    const response = await apiClient.post<QualifierResponse>(
      '/api/agents/qualifier',
      request,
    );
    return response.data;
  },

  /**
   * Send message to assessor agent
   */
  async assessor(request: AssessorRequest): Promise<AssessorResponse> {
    const response = await apiClient.post<AssessorResponse>(
      '/api/agents/assessor',
      request,
    );
    return response.data;
  },
};

/**
 * API service for chat history management
 */
export const chatApi = {
  /**
   * Save chat messages to history
   */
  async saveHistory(request: ChatHistoryRequest): Promise<void> {
    await apiClient.post('/api/chat-history', request);
  },

  /**
   * Delete a chat by ID
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/chat?id=${id}`);
  },
};

/**
 * API service for OpenAI models
 */
export const modelsApi = {
  /**
   * Get available OpenAI models
   */
  async list(): Promise<ModelsResponse> {
    const response = await apiClient.get<ModelsResponse>('/api/models');
    return response.data;
  },
};
