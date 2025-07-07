import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationError } from '../src/errors';
import { AlertsResource } from '../src/resources/alerts';
import { ApiKeysResource } from '../src/resources/api-keys';

// Mock BaseResource for testing
class MockBaseResource {
  protected get<T>(): Promise<T> {
    return Promise.resolve({} as T);
  }
  protected post<T>(): Promise<T> {
    return Promise.resolve({} as T);
  }
  protected put<T>(): Promise<T> {
    return Promise.resolve({} as T);
  }
  protected delete<T>(): Promise<T> {
    return Promise.resolve({} as T);
  }
}

describe('Input Validation', () => {
  describe('AlertsResource', () => {
    let alerts: AlertsResource;

    beforeEach(() => {
      // @ts-expect-error Using mock for testing
      alerts = new AlertsResource({
        apiKey: 'test',
        baseUrl: 'https://test.com',
        timeout: 30000,
        maxRetries: 3,
        debug: false
      });
      
      // Override parent methods for testing
      Object.setPrototypeOf(alerts, MockBaseResource.prototype);
    });

    it('should validate create request', async () => {
      // Missing symbol
      await expect(alerts.create({
        symbol: '',
        condition: 'price_above',
        threshold: 100,
        notification: 'email'
      })).rejects.toThrow(ValidationError);

      // Invalid condition
      await expect(alerts.create({
        symbol: 'AAPL',
        condition: '',
        threshold: 100,
        notification: 'email'
      })).rejects.toThrow(ValidationError);

      // Invalid threshold
      await expect(alerts.create({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: NaN,
        notification: 'email'
      })).rejects.toThrow(ValidationError);

      // Missing notification
      await expect(alerts.create({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        notification: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should validate update request', async () => {
      await expect(alerts.update('123', {
        status: 'invalid' as any
      })).rejects.toThrow(ValidationError);

      await expect(alerts.update('123', {
        status: '' as any
      })).rejects.toThrow(ValidationError);
    });

    it('should validate IDs', async () => {
      await expect(alerts.retrieve('')).rejects.toThrow('Alert ID is required');
      await expect(alerts.retrieve('   ')).rejects.toThrow('Alert ID is required');
      
      await expect(alerts.update('', { status: 'active' })).rejects.toThrow('Alert ID is required');
      await expect(alerts.update('   ', { status: 'active' })).rejects.toThrow('Alert ID is required');
      
      await expect(alerts.remove('')).rejects.toThrow('Alert ID is required');
      await expect(alerts.remove('   ')).rejects.toThrow('Alert ID is required');
    });
  });

  describe('ApiKeysResource', () => {
    let apiKeys: ApiKeysResource;

    beforeEach(() => {
      // @ts-expect-error Using mock for testing
      apiKeys = new ApiKeysResource({
        apiKey: 'test',
        baseUrl: 'https://test.com',
        timeout: 30000,
        maxRetries: 3,
        debug: false
      });
      
      // Override parent methods for testing
      Object.setPrototypeOf(apiKeys, MockBaseResource.prototype);
    });

    it('should validate create request', async () => {
      await expect(apiKeys.create({
        name: ''
      })).rejects.toThrow(ValidationError);

      await expect(apiKeys.create({
        name: '   '
      })).rejects.toThrow(ValidationError);

      await expect(apiKeys.create({
        name: 'valid',
        permissions: 'invalid' as any
      })).rejects.toThrow('Permissions must be an array');
    });

    it('should validate IDs', async () => {
      await expect(apiKeys.remove('')).rejects.toThrow('API key ID is required');
      await expect(apiKeys.remove('   ')).rejects.toThrow('API key ID is required');
    });
  });
});
