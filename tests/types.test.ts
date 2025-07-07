import { describe, it, expect } from 'vitest';
import { isAlert, isApiError } from '../src/types';

describe('Type Guards', () => {
  describe('isAlert', () => {
    it('should return true for valid alert object', () => {
      const alert = {
        id: '123',
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 150,
        notification: 'email',
        status: 'active',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      expect(isAlert(alert)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isAlert(null)).toBe(false);
      expect(isAlert(undefined)).toBe(false);
      expect(isAlert('string')).toBe(false);
      expect(isAlert(123)).toBe(false);
      expect(isAlert({})).toBe(false);
      expect(isAlert({ id: '123' })).toBe(false); // Missing required fields
      expect(isAlert({ 
        id: '123',
        symbol: 'AAPL',
        condition: 'price_above'
        // Missing threshold
      })).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('should return true for valid error object', () => {
      const error = {
        error: 'Something went wrong',
        statusCode: 500
      };

      expect(isApiError(error)).toBe(true);
    });

    it('should return true even without statusCode', () => {
      const error = {
        error: 'Something went wrong'
      };

      expect(isApiError(error)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError('string')).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError({})).toBe(false);
      expect(isApiError({ error: 123 })).toBe(false); // error must be string
      expect(isApiError({ message: 'error' })).toBe(false); // wrong field name
    });
  });
});
