export class StockAlertError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'StockAlertError';
  }
}

export class AuthenticationError extends StockAlertError {
  constructor(message = 'Invalid API key') {
    super(message, 401, 'authentication_error');
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends StockAlertError {
  constructor(
    message = 'Rate limit exceeded',
    public limit?: number,
    public remaining?: number,
    public reset?: number
  ) {
    super(message, 429, 'rate_limit_error');
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends StockAlertError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400, 'validation_error');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends StockAlertError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found');
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends StockAlertError {
  constructor(message = 'Network request failed', public originalError?: Error) {
    super(message, undefined, 'network_error');
    this.name = 'NetworkError';
  }
}