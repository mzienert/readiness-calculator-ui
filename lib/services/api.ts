import { apiClient } from './http-client';

export interface ChatHistoryRequest {
  chatId: string;
  messages: any[];
  selectedVisibilityType: string;
  threadId?: string;
}

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
  async list(): Promise<{ data: any[] }> {
    const response = await apiClient.get<{ data: any[] }>('/api/models');
    return response.data;
  },
};
