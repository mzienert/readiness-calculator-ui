interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(baseURL = '', defaultTimeout = 10000) {
    this.baseURL = baseURL;
    this.defaultTimeout = defaultTimeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Create request configuration with defaults
   */
  private createRequestConfig(config: RequestConfig = {}): RequestInit {
    const headers = {
      ...this.defaultHeaders,
      ...config.headers,
    };

    const requestConfig: RequestInit = {
      method: config.method || 'GET',
      headers,
    };

    // Add body if provided and not GET request
    if (config.body && config.method !== 'GET') {
      if (typeof config.body === 'object') {
        requestConfig.body = JSON.stringify(config.body);
      } else {
        requestConfig.body = config.body;
      }
    }

    return requestConfig;
  }

  /**
   * Create AbortController for request timeout
   */
  private createTimeoutController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  /**
   * Make HTTP request with error handling and timeout
   */
  private async makeRequest<T>(
    url: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.baseURL + url;
    const timeout = config.timeout || this.defaultTimeout;
    const controller = this.createTimeoutController(timeout);

    const requestConfig = {
      ...this.createRequestConfig(config),
      signal: controller.signal,
    };

    try {
      const response = await fetch(fullUrl, requestConfig);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown network error');
    }
  }

  /**
   * GET request
   */
  async get<T>(
    url: string,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PATCH', body });
  }
}

// Default instance for internal API calls
export const apiClient = new HttpClient();
