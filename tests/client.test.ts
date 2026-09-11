import { afterEach, describe, it, expect, vi } from 'vitest';
import { StockAlert } from '../src/client';
import { RateLimitError, ValidationError } from '../src/errors';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StockAlert Client', () => {
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      
      expect(client).toBeDefined();
      expect(client.alerts).toBeDefined();
      expect(client.webhooks).toBeDefined();
      // apiKeys resource is internal and not exposed in public SDK
      expect(client.watchlist).toBeDefined();
      expect(client.stocks).toBeDefined();
      expect(client.user).toBeDefined();
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
      expect(config.baseUrl).toBe('https://api.stockalert.pro/v1');
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
      expect(config.debug).toBe(false);
      expect(config.userAgent).toBe('@stockalert/sdk/2.2.0');
    });

    it('should accept custom configuration', () => {
      const client = new StockAlert({
        apiKey: 'sk_test_key_123',
        baseUrl: 'https://api.example.com/v2',
        timeout: 60000,
        maxRetries: 5,
        debug: true,
        userAgent: '@custom/sdk/1.0.0'
      });
      
      const config = client.getConfig();
      expect(config.baseUrl).toBe('https://api.example.com/v2');
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
      expect(config.debug).toBe(true);
      expect(config.userAgent).toBe('@custom/sdk/1.0.0');
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

  describe('events', () => {
    it('should emit request lifecycle events and support unsubscribe', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [],
              meta: {
                pagination: {
                  page: 1,
                  limit: 1,
                  total: 0,
                  total_pages: 1,
                },
              },
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      );
      vi.stubGlobal('fetch', fetchMock);

      const client = new StockAlert({
        apiKey: 'sk_test_key_123'
      });
      const onStart = vi.fn();
      const onSuccess = vi.fn();
      client.on('request:start', onStart);
      const unsubscribe = client.on('request:success', onSuccess);

      await client.alerts.list({ limit: 1 });

      expect(onStart).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v1/alerts',
      });
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/v1/alerts',
          duration: expect.any(Number),
        })
      );

      unsubscribe();
      await client.alerts.list({ limit: 1, page: 2 });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should emit rate limit and request error events on final failure', async () => {
      const resetTime = Date.now() + 1;
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: {
                message: 'Too many requests',
              },
            }),
            {
              status: 429,
              headers: {
                'content-type': 'application/json',
                'X-RateLimit-Reset': String(resetTime),
              },
            },
          ),
        )
      );
      vi.stubGlobal('fetch', fetchMock);

      const client = new StockAlert({
        apiKey: 'sk_test_key_123',
        maxRetries: 0
      });
      const onRateLimit = vi.fn();
      const onError = vi.fn();
      client.on('rate:limit', onRateLimit);
      client.on('request:error', onError);

      await expect(client.alerts.list({ limit: 1 })).rejects.toBeInstanceOf(RateLimitError);

      expect(onRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: expect.any(Number),
        })
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/v1/alerts',
          error: expect.any(RateLimitError),
        })
      );
    });
  });
});
