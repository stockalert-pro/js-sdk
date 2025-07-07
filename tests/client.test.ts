import { describe, it, expect, vi } from 'vitest';
import { StockAlert } from '../src/client';
import { ValidationError } from '../src/errors';

describe('StockAlert Client', () => {
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
      new StockAlert({} as any);
    }).toThrow(ValidationError);
  });

  it('should throw error for invalid API key format', () => {
    expect(() => {
      new StockAlert({ apiKey: 'invalid' });
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

  it('should normalize base URL', () => {
    const client = new StockAlert({
      apiKey: 'sk_test_key_123',
      baseUrl: 'https://api.example.com/v1/'
    });
    
    const config = client.getConfig();
    expect(config.baseUrl).toBe('https://api.example.com/v1');
  });
});
