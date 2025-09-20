export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpMethods {
  constructor(private makeRequest: <T>(url: string, config?: RequestConfig) => Promise<ApiResponse<T>>) {}

  async get<T>(
    url: string,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'POST', body });
  }

  async put<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PUT', body });
  }

  async delete<T>(
    url: string,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'DELETE' });
  }

  async patch<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PATCH', body });
  }
}