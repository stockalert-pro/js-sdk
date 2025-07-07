import { describe, it, expect } from 'vitest';
import {
  StockAlertError,
  ApiError,
  RateLimitError,
  ValidationError,
  AuthenticationError,
  NetworkError
} from '../src/errors';

describe('Error Classes', () => {
  describe('StockAlertError', () => {
    it('should create base error correctly', () => {
      const error = new StockAlertError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StockAlertError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('StockAlertError');
    });
  });

  describe('ApiError', () => {
    it('should create API error with status code', () => {
      const error = new ApiError('Not found', 404);
      expect(error).toBeInstanceOf(StockAlertError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('should include response data', () => {
      const responseData = { error: 'Invalid request', code: 'INVALID' };
      const error = new ApiError('Bad request', 400, responseData);
      expect(error.response).toEqual(responseData);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should include retry after', () => {
      const error = new RateLimitError('Too many requests', 60);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      expect(error).toBeInstanceOf(StockAlertError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with default message', () => {
      const error = new AuthenticationError();
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid API key');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create auth error with custom message', () => {
      const error = new AuthenticationError('API key expired');
      expect(error.message).toBe('API key expired');
    });
  });

  describe('NetworkError', () => {
    it('should create network error with default message', () => {
      const error = new NetworkError();
      expect(error).toBeInstanceOf(StockAlertError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network request failed');
      expect(error.name).toBe('NetworkError');
    });

    it('should create network error with custom message', () => {
      const error = new NetworkError('Connection timeout');
      expect(error.message).toBe('Connection timeout');
    });
  });
});
