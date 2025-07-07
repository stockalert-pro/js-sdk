import { StockAlertError, RateLimitError, ApiError } from '../errors';
import type { ApiResponse, RequestOptions } from '../types';

export abstract class BaseResource {
  protected apiKey: string;
  protected baseUrl: string;
  protected timeout: number;
  protected maxRetries: number;
  protected debug: boolean;

  constructor(config: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    debug: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.debug = config.debug;
  }

  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    
    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(options.timeout || this.timeout),
    };

    if (options.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (this.debug) {
          console.log(`[StockAlert SDK] ${method} ${url.toString()}`);
        }

        const response = await fetch(url.toString(), fetchOptions);
        const data = await response.json() as ApiResponse<T>;

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              'Rate limit exceeded',
              retryAfter ? parseInt(retryAfter) : undefined
            );
          }

          throw new ApiError(
            data.error || 'Unknown error',
            response.status,
            data
          );
        }

        if (!data.success) {
          throw new ApiError(data.error || 'Request failed', response.status, data);
        }

        return data.data as T;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx) except rate limits
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Exponential backoff for retries
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          if (this.debug) {
            console.log(`[StockAlert SDK] Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new StockAlertError(
      `Request failed after ${this.maxRetries} retries: ${lastError?.message || 'Unknown error'}`
    );
  }

  protected async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  protected async post<T>(path: string, body?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  protected async put<T>(path: string, body?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  protected async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}
