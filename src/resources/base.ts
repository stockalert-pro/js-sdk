import type { StockAlertConfig } from '../types';
import { 
  StockAlertError, 
  AuthenticationError, 
  RateLimitError,
  ValidationError,
  NotFoundError,
  NetworkError 
} from '../errors';

export abstract class BaseResource {
  constructor(protected config: Required<StockAlertConfig>) {}

  protected async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'X-API-Key': this.config.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': '@stockalert/sdk/1.0.0',
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit headers
        const rateLimit = {
          limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
          reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        };

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          switch (response.status) {
            case 401:
              throw new AuthenticationError(errorData.error || 'Invalid API key');
            case 404:
              throw new NotFoundError(errorData.error || 'Resource not found');
            case 429:
              throw new RateLimitError(
                errorData.error || 'Rate limit exceeded',
                rateLimit.limit,
                rateLimit.remaining,
                rateLimit.reset
              );
            case 400:
              throw new ValidationError(
                errorData.error || 'Validation error',
                errorData.errors
              );
            default:
              throw new StockAlertError(
                errorData.error || `Request failed with status ${response.status}`,
                response.status
              );
          }
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof StockAlertError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new NetworkError('Request timeout', error);
          }
          
          lastError = error;
          
          // Retry on network errors
          if (attempt < this.config.maxRetries) {
            // Exponential backoff with jitter
            const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new NetworkError('Network request failed', lastError);
      }
    }
    
    throw new NetworkError('Max retries exceeded', lastError);
  }

  protected buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }
}