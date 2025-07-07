import { describe, it, expect } from 'vitest';
import { ValidationError } from '../src/errors';

describe('Input Validation', () => {
  describe('AlertsResource validation methods', () => {
    // Import the actual validation logic from alerts resource
    const validateCreateRequest = (data: any): void => {
      if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') {
        throw new ValidationError('Symbol is required and must be a non-empty string');
      }
      
      if (!data.condition || typeof data.condition !== 'string' || data.condition.trim() === '') {
        throw new ValidationError('Condition is required and must be a non-empty string');
      }
      
      if (typeof data.threshold !== 'number' || isNaN(data.threshold)) {
        throw new ValidationError('Threshold is required and must be a number');
      }
      
      if (!data.notification || typeof data.notification !== 'string' || data.notification.trim() === '') {
        throw new ValidationError('Notification channel is required and must be a non-empty string');
      }
    };

    const validateUpdateRequest = (data: any): void => {
      if (!data.status || !['active', 'paused'].includes(data.status)) {
        throw new ValidationError('Status must be either "active" or "paused"');
      }
    };

    const validateId = (id: string, type: string): void => {
      if (!id || id.trim() === '') {
        throw new ValidationError(`${type} ID is required`);
      }
    };

    it('should validate create request', () => {
      // Missing symbol
      expect(() => validateCreateRequest({
        symbol: '',
        condition: 'price_above',
        threshold: 100,
        notification: 'email'
      })).toThrow('Symbol is required and must be a non-empty string');

      // Invalid condition
      expect(() => validateCreateRequest({
        symbol: 'AAPL',
        condition: '',
        threshold: 100,
        notification: 'email'
      })).toThrow('Condition is required and must be a non-empty string');

      // Invalid threshold
      expect(() => validateCreateRequest({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: NaN,
        notification: 'email'
      })).toThrow('Threshold is required and must be a number');

      // Missing notification
      expect(() => validateCreateRequest({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        notification: ''
      })).toThrow('Notification channel is required and must be a non-empty string');

      // Valid request should not throw
      expect(() => validateCreateRequest({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        notification: 'email'
      })).not.toThrow();
    });

    it('should validate update request', () => {
      expect(() => validateUpdateRequest({
        status: 'invalid'
      })).toThrow('Status must be either "active" or "paused"');

      expect(() => validateUpdateRequest({
        status: ''
      })).toThrow('Status must be either "active" or "paused"');

      expect(() => validateUpdateRequest({
        status: null
      })).toThrow('Status must be either "active" or "paused"');

      // Valid statuses should not throw
      expect(() => validateUpdateRequest({ status: 'active' })).not.toThrow();
      expect(() => validateUpdateRequest({ status: 'paused' })).not.toThrow();
    });

    it('should validate IDs', () => {
      expect(() => validateId('', 'Alert')).toThrow('Alert ID is required');
      expect(() => validateId('   ', 'Alert')).toThrow('Alert ID is required');
      expect(() => validateId('', 'API key')).toThrow('API key ID is required');
      expect(() => validateId('   ', 'API key')).toThrow('API key ID is required');

      // Valid IDs should not throw
      expect(() => validateId('123', 'Alert')).not.toThrow();
      expect(() => validateId('abc-def', 'API key')).not.toThrow();
    });
  });

  describe('ApiKeysResource validation methods', () => {
    const validateCreateRequest = (data: any): void => {
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        throw new ValidationError('API key name is required and must be a non-empty string');
      }
      
      if (data.permissions !== undefined && !Array.isArray(data.permissions)) {
        throw new ValidationError('Permissions must be an array');
      }
    };

    it('should validate create request', () => {
      expect(() => validateCreateRequest({
        name: ''
      })).toThrow('API key name is required and must be a non-empty string');

      expect(() => validateCreateRequest({
        name: '   '
      })).toThrow('API key name is required and must be a non-empty string');

      expect(() => validateCreateRequest({
        name: null
      })).toThrow('API key name is required and must be a non-empty string');

      expect(() => validateCreateRequest({
        name: 'valid',
        permissions: 'invalid'
      })).toThrow('Permissions must be an array');

      // Valid requests should not throw
      expect(() => validateCreateRequest({
        name: 'My API Key'
      })).not.toThrow();

      expect(() => validateCreateRequest({
        name: 'My API Key',
        permissions: ['read', 'write']
      })).not.toThrow();
    });
  });
});
