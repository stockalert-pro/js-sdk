/**
 * Base error class for all StockAlert SDK errors
 */
export class StockAlertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockAlertError';
    Object.setPrototypeOf(this, StockAlertError.prototype);
  }
}

/**
 * API error with status code and response data
 */
export class ApiError extends StockAlertError {
  public readonly statusCode: number;
  public readonly response?: unknown;

  constructor(message: string, statusCode: number, response?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Rate limit error with retry information
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends StockAlertError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error for invalid API keys
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Invalid API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Network error for connection issues
 */
export class NetworkError extends StockAlertError {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
