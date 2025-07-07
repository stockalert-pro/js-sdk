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

// Request key interface removed - not needed

export abstract class BaseResource {
  protected readonly config: ResourceConfig;
  private readonly pendingRequests = new Map<string, Promise<any>>();
  private readonly rateLimitReset = new Map<string, number>();

  constructor(config: ResourceConfig) {
    this.config = config;
  }

  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const requestKey = `${method}:${url.toString()}`;

    // Check for rate limit
    this.checkRateLimit(url.origin);

    // Deduplication for GET requests
    if (method === 'GET' && this.pendingRequests.has(requestKey)) {
      if (this.config.debug) {
        console.warn(`[StockAlert SDK] Deduplicating request: ${requestKey}`);
      }
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    const requestPromise = this.executeRequest<T>(method, url, options);
    
    if (method === 'GET') {
      this.pendingRequests.set(requestKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }

    return requestPromise;
  }

  private async executeRequest<T>(
    method: string,
    url: URL,
    options: RequestOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout ?? this.config.timeout
    );

    const headers: Record<string, string> = {
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': '@stockalert/sdk/1.0.0',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options.signal ?? controller.signal,
    };

    if (options.body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;
    const maxRetries = options.retries ?? this.config.maxRetries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (this.config.debug && attempt > 0) {
          console.warn(`[StockAlert SDK] Retry attempt ${attempt}/${maxRetries} for ${method} ${url.pathname}`);
        }

        const startTime = Date.now();
        const response = await fetch(url.toString(), fetchOptions);
        const responseTime = Date.now() - startTime;
        
        clearTimeout(timeoutId);

        if (this.config.debug) {
          console.warn(`[StockAlert SDK] ${method} ${url.pathname} - ${response.status} (${responseTime}ms)`);
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        let data: ApiResponse<T>;

        if (contentType?.includes('application/json')) {
          data = await response.json() as ApiResponse<T>;
        } else {
          throw new ApiError(
            `Invalid response content type: ${contentType}`,
            response.status
          );
        }

        // Handle rate limits
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const resetTime = retryAfter ? 
            (parseInt(retryAfter, 10) * 1000) + Date.now() : 
            Date.now() + 60000;
          
          this.rateLimitReset.set(url.origin, resetTime);
          
          throw new RateLimitError(
            data.error ?? 'Rate limit exceeded',
            retryAfter ? parseInt(retryAfter, 10) : 60
          );
        }

        // Handle errors
        if (!response.ok) {
          if (response.status === 401) {
            throw new AuthenticationError(data.error ?? 'Authentication failed');
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
          throw new NetworkError('Network request failed - check your connection');
        }

        // Don't retry client errors (except rate limits)
        if (
          error instanceof ApiError && 
          error.statusCode >= 400 && 
          error.statusCode < 500 && 
          error.statusCode !== 429
        ) {
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // Retry with exponential backoff and jitter
        if (attempt < maxRetries) {
          const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
          const delay = baseDelay + jitter;
          
          // If rate limited, wait for reset time
          if (error instanceof RateLimitError && error.retryAfter) {
            const waitTime = error.retryAfter * 1000;
            await this.sleep(waitTime);
          } else {
            await this.sleep(delay);
          }
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

  protected toRecord<T extends Record<string, any>>(data: T): Record<string, unknown> {
    // Safe conversion without type assertions
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  }

  private buildUrl(
    path: string, 
    params?: Record<string, string | number | boolean | undefined>
  ): URL {
    const url = new URL(path, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url;
  }

  private checkRateLimit(origin: string): void {
    const resetTime = this.rateLimitReset.get(origin);
    if (resetTime && Date.now() < resetTime) {
      const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      throw new RateLimitError(
        `Rate limit in effect. Please wait ${waitSeconds} seconds.`,
        waitSeconds
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}