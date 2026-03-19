import { describe, expect, it } from 'vitest';
import { isAlert, isApiError, isPaginatedResponse } from '../src/types';

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
        triggered_at: null,
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
        condition: 'price_above',
        status: 'active',
        created_at: '2024-01-01',
      })).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('should return true for valid error object', () => {
      const error = {
        error: 'Something went wrong',
        status_code: 500
      };

      expect(isApiError(error)).toBe(true);
    });

    it('should return false without status_code', () => {
      const error = {
        error: 'Something went wrong'
      };

      expect(isApiError(error)).toBe(false);
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

  describe('isPaginatedResponse', () => {
    const itemGuard = (value: unknown): value is { id: string } =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Record<string, unknown>).id === 'string';

    it('should return true for valid current pagination metadata', () => {
      expect(
        isPaginatedResponse(
          {
            data: [{ id: '123' }],
            meta: {
              pagination: {
                page: 1,
                limit: 50,
                total: 1,
                total_pages: 1,
              },
              rate_limit: {
                limit: 200,
                remaining: 199,
                reset: 1736180400000,
              },
            },
          },
          itemGuard
        )
      ).toBe(true);
    });

    it('should reject legacy pagination metadata', () => {
      expect(
        isPaginatedResponse(
          {
            data: [{ id: '123' }],
            meta: {
              pagination: {
                page: 1,
                limit: 50,
                total: 1,
                totalPages: 1,
              },
            },
          },
          itemGuard
        )
      ).toBe(false);
    });
  });
});
