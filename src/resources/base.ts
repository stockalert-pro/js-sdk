import { 
  StockAlertError, 
  RateLimitError, 
  ApiError, 
  NetworkError,
  AuthenticationError 
} from '../errors';
import type { ApiResponse, RequestOptions } from '../types';

interface ResourceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  debug: boolean;
}

export abstract class BaseResource {
  protected readonly config: ResourceConfig;

  constructor(config: ResourceConfig) {
    this.config = config;
  }

  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout ?? this.config.timeout
    );

    const headers: Record<string, string> = {
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': '@stockalert/sdk/1.0.0',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (options.body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (this.config.debug && attempt > 0) {
          console.warn(`[StockAlert SDK] Retry attempt ${attempt}/${this.config.maxRetries}`);
        }

        const response = await fetch(url.toString(), fetchOptions);
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        let data: ApiResponse<T>;

        if (contentType?.includes('application/json')) {
          data = await response.json() as ApiResponse<T>;
        } else {
          throw new ApiError(
            'Invalid response content type: ' + contentType,
            response.status
          );
        }

        if (!response.ok) {
          if (response.status === 401) {
            throw new AuthenticationError(data.error ?? 'Authentication failed');
          }
          
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              data.error ?? 'Rate limit exceeded',
              retryAfter ? parseInt(retryAfter, 10) : undefined
            );
          }

          throw new ApiError(
            data.error ?? `HTTP ${response.status} error`,
            response.status,
            data
          );
        }

        if (!data.success || data.data === undefined) {
          throw new ApiError(
            data.error ?? 'Request failed',
            response.status,
            data
          );
        }

        return data.data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Request timeout');
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new NetworkError('Network request failed');
        }

        if (
          error instanceof ApiError && 
          error.statusCode >= 400 && 
          error.statusCode < 500 && 
          error.statusCode !== 429
        ) {
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new StockAlertError('Request failed after retries');
  }

  protected get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  protected post<T>(
    path: string, 
    body?: Record<string, unknown>, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  protected put<T>(
    path: string, 
    body?: Record<string, unknown>, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  protected delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  private buildUrl(
    path: string, 
    params?: Record<string, string | number | boolean | undefined>
  ): URL {
    const url = new URL(path, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
