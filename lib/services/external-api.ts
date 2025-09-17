import { HttpClient } from './http-client';

// Create HTTP client for external API calls
const openaiClient = new HttpClient('https://api.openai.com/v1');

/**
 * Service for OpenAI API calls
 */
export const openaiService = {
  /**
   * Get list of available models from OpenAI
   */
  async getModels(apiKey: string): Promise<{ data: Array<{ id: string }> }> {
    openaiClient.setDefaultHeaders({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    });

    const response = await openaiClient.get<{ data: Array<{ id: string }> }>(
      '/models',
    );
    return response.data;
  },
};
