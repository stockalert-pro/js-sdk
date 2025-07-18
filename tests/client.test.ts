import { describe, it, expect } from 'vitest';
import { StockAlert } from '../src/client';
import { ValidationError } from '../src/errors';

describe('StockAlert Client', () => {
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      
      expect(client).toBeDefined();
      expect(client.alerts).toBeDefined();
      expect(client.webhooks).toBeDefined();
      expect(client.apiKeys).toBeDefined();
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        new StockAlert({});
      }).toThrow(ValidationError);
      
      expect(() => {
        // @ts-expect-error Testing invalid input
        new StockAlert({ apiKey: null });
      }).toThrow(ValidationError);
      
      expect(() => {
        new StockAlert({ apiKey: '' });
      }).toThrow(ValidationError);
    });

    it('should throw error for invalid API key format', () => {
      expect(() => {
        new StockAlert({ apiKey: 'invalid' });
      }).toThrow(ValidationError);
      
      expect(() => {
        new StockAlert({ apiKey: 'sk_123' }); // Too short
      }).toThrow(ValidationError);
      
      expect(() => {
        new StockAlert({ apiKey: 'pk_test_key_123' }); // Wrong prefix
      }).toThrow(ValidationError);
    });

    it('should use default values for optional config', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      
      const config = client.getConfig();
      expect(config.baseUrl).toBe('https://stockalert.pro/api/public/v1');
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
      expect(config.debug).toBe(false);
    });

    it('should accept custom configuration', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123',
        baseUrl: 'https://api.example.com/v2',
        timeout: 60000,
        maxRetries: 5,
        debug: true
      });
      
      const config = client.getConfig();
      expect(config.baseUrl).toBe('https://api.example.com/v2');
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
      expect(config.debug).toBe(true);
    });

    it('should normalize base URL by removing trailing slash', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123',
        baseUrl: 'https://api.example.com/v1/'
      });
      
      const config = client.getConfig();
      expect(config.baseUrl).toBe('https://api.example.com/v1');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      
      const config1 = client.getConfig();
      const config2 = client.getConfig();
      
      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // Same content
    });

    it('should return masked config', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      
      const config = client.getConfig();
      expect(config.apiKey).toBe('sk_tes..._123'); // API key is masked
      
      // Config should be a copy
      const config2 = client.getConfig();
      expect(config).not.toBe(config2);
      expect(config.apiKey).toBe(config2.apiKey);
    });
  });
});
