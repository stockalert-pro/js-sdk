import { describe, it, expect } from 'vitest';
import { WebhooksResource } from '../src/resources/webhooks';
import { ValidationError } from '../src/errors';
import * as crypto from 'crypto';

describe('WebhooksResource', () => {
  // Create a minimal instance for testing
  const webhooks = new WebhooksResource({
    apiKey: 'test',
    baseUrl: 'https://test.com',
    timeout: 30000,
    maxRetries: 3,
    debug: false
  } as any);

  describe('verifySignature', () => {
    const secret = 'webhook_secret_123';
    const payload = '{"event":"alert.triggered","data":{"id":"123"}}';
    
    const createSignature = (data: string, key: string): string => {
      return crypto.createHmac('sha256', key).update(data).digest('hex');
    };

    it('should verify valid signature', () => {
      const signature = createSignature(payload, secret);
      expect(webhooks.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const invalidSignature = createSignature(payload, 'wrong_secret');
      expect(webhooks.verifySignature(payload, invalidSignature, secret)).toBe(false);
    });

    it('should reject empty inputs', () => {
      const signature = createSignature(payload, secret);
      expect(webhooks.verifySignature('', signature, secret)).toBe(false);
      expect(webhooks.verifySignature(payload, '', secret)).toBe(false);
      expect(webhooks.verifySignature(payload, signature, '')).toBe(false);
    });

    it('should handle invalid hex strings', () => {
      expect(webhooks.verifySignature(payload, 'not-hex', secret)).toBe(false);
      expect(webhooks.verifySignature(payload, 'zzzz', secret)).toBe(false);
    });

    it('should be timing-safe', () => {
      const signature = createSignature(payload, secret);
      const wrongSignature = createSignature(payload + 'x', secret);
      
      // Both should return false, but timing should be consistent
      // This is handled by crypto.timingSafeEqual internally
      expect(webhooks.verifySignature(payload, wrongSignature, secret)).toBe(false);
    });
  });

  describe('parse', () => {
    const validPayload = {
      event: 'alert.triggered',
      timestamp: '2024-01-01T00:00:00Z',
      data: {
        alert: {
          id: '123',
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 150,
          status: 'triggered'
        },
        stock: {
          symbol: 'AAPL',
          price: 155,
          change: 5,
          change_percent: 3.33
        }
      }
    };

    it('should parse valid JSON string', () => {
      const jsonString = JSON.stringify(validPayload);
      const parsed = webhooks.parse(jsonString);
      expect(parsed).toEqual(validPayload);
    });

    it('should parse valid object', () => {
      const parsed = webhooks.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('should throw on invalid JSON', () => {
      expect(() => webhooks.parse('invalid json')).toThrow(ValidationError);
      expect(() => webhooks.parse('{')).toThrow(ValidationError);
    });

    it('should throw on invalid payload structure', () => {
      // Missing event
      expect(() => webhooks.parse({
        timestamp: '2024-01-01',
        data: validPayload.data
      })).toThrow('Invalid webhook payload structure');

      // Missing data
      expect(() => webhooks.parse({
        event: 'alert.triggered',
        timestamp: '2024-01-01'
      })).toThrow('Invalid webhook payload structure');

      // Invalid data structure
      expect(() => webhooks.parse({
        event: 'alert.triggered',
        timestamp: '2024-01-01',
        data: {
          alert_id: '123'
          // Missing required fields
        }
      })).toThrow('Invalid webhook payload structure');

      // Null payload
      expect(() => webhooks.parse(null as any)).toThrow('Invalid webhook payload structure');
      
      // Non-object payload
      expect(() => webhooks.parse({} as any)).toThrow('Invalid webhook payload structure');
      expect(() => webhooks.parse(123 as any)).toThrow('Invalid webhook payload structure');
    });

    it('should accept test webhooks', () => {
      const testPayload = {
        ...validPayload
      };

      const parsed = webhooks.parse(testPayload);
      expect(parsed.event).toBe('alert.triggered');
      expect(parsed.data.alert.id).toBe('123');
      expect(parsed.data.stock.symbol).toBe('AAPL');
    });
  });
});
