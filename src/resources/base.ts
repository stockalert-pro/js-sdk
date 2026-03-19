import {
  StockAlertError,
  RateLimitError,
  ApiError,
  NetworkError,
  AuthenticationError
} from '../errors';
import type { ApiResponse, RequestOptions, ResourceResponse } from '../types';

interface ResourceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  debug: boolean;
  userAgent: string;
  bearerToken?: string;
  onRequestStart?: (event: { method: string; path: string }) => void;
  onRequestSuccess?: (event: { method: string; path: string; duration: number }) => void;
  onRequestError?: (event: { method: string; path: string; error: Error }) => void;
  onRateLimit?: (event: { retryAfter: number }) => void;
}

// Request key interface removed - not needed

export abstract class BaseResource {
  protected readonly config: ResourceConfig;
  private readonly pendingRequests = new Map<string, Promise<unknown>>();
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
    try {
      this.checkRateLimit(url.origin);
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.config.onRateLimit?.({ retryAfter: error.retryAfter ?? 0 });
        this.config.onRequestError?.({ method, path: url.pathname, error });
      }
      throw error;
    }

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
      requestPromise.then(
        () => {
          this.pendingRequests.delete(requestKey);
        },
        () => {
          this.pendingRequests.delete(requestKey);
        },
      );
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
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers,
    };

    // Prefer Bearer auth when a token is configured; otherwise fall back to API key
    if (!('Authorization' in headers)) {
      if (this.config.bearerToken) {
        headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
      } else {
        headers['X-API-Key'] = this.config.apiKey;
      }
    }

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
    this.config.onRequestStart?.({ method, path: url.pathname });
    
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

        // Handle rate limit errors
        if (response.status === 429) {
          // Only store rate limit reset time when we actually get rate limited
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          const resetTime = rateLimitReset ? parseInt(rateLimitReset, 10) : Date.now() + 60000;
          this.rateLimitReset.set(url.origin, resetTime);

          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          this.config.onRateLimit?.({ retryAfter });

          throw new RateLimitError(
            this.extractErrorMessage(data.error, 'Rate limit exceeded'),
            retryAfter
          );
        }

        // Handle errors
        if (!response.ok) {
          if (response.status === 401) {
            throw new AuthenticationError(this.extractErrorMessage(data.error, 'Authentication failed'));
          }

          throw new ApiError(
            this.extractErrorMessage(data.error, `HTTP ${response.status} error`),
            response.status,
            data
          );
        }

        if (!data.success || data.data === undefined) {
          throw new ApiError(
            this.extractErrorMessage(data.error, 'Request failed'),
            response.status,
            data
          );
        }

        // For paginated responses, return the entire envelope (without success flag)
        // This preserves the meta object with pagination and rate limit info
        if (data.meta !== undefined) {
          this.config.onRequestSuccess?.({ method, path: url.pathname, duration: responseTime });
          return { data: data.data, meta: data.meta } as T;
        }

        // For single-item responses, just return the data
        this.config.onRequestSuccess?.({ method, path: url.pathname, duration: responseTime });
        return data.data;
      } catch (error) {
        clearTimeout(timeoutId);
        let normalizedError = error instanceof Error ? error : new Error(String(error));

        if (normalizedError.name === 'AbortError') {
          normalizedError = new NetworkError('Request timeout');
        }

        if (normalizedError instanceof TypeError && normalizedError.message.includes('fetch')) {
          normalizedError = new NetworkError('Network request failed - check your connection');
        }

        // Don't retry client errors (except rate limits)
        if (
          normalizedError instanceof ApiError && 
          normalizedError.statusCode >= 400 && 
          normalizedError.statusCode < 500 && 
          normalizedError.statusCode !== 429
        ) {
          this.config.onRequestError?.({ method, path: url.pathname, error: normalizedError });
          throw normalizedError;
        }

        lastError = normalizedError;

        // Retry with exponential backoff and jitter
        if (attempt < maxRetries) {
          const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
          const delay = baseDelay + jitter;
          
          // If rate limited, wait for reset time
          if (normalizedError instanceof RateLimitError && normalizedError.retryAfter) {
            const waitTime = normalizedError.retryAfter * 1000;
            await this.sleep(waitTime);
          } else {
            await this.sleep(delay);
          }
        } else if (lastError) {
          this.config.onRequestError?.({ method, path: url.pathname, error: lastError });
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

  protected patch<T>(
    path: string,
    body?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  protected delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  protected async unwrap<T>(promise: Promise<ResourceResponse<T> | T>): Promise<T> {
    const result = await promise;
    if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>)) {
      return (result as ResourceResponse<T>).data;
    }
    return result as T;
  }

  protected toRecord(data: unknown): Record<string, unknown> {
    // Safe conversion without type assertions
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): URL {
    // Remove leading slash from path if present
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    // Append path to baseUrl with proper separator
    const fullUrl = `${this.config.baseUrl}/${normalizedPath}`;
    const url = new URL(fullUrl);

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

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return fallback;
  }
}
