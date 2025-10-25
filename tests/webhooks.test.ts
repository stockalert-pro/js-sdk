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
    debug: false,
    userAgent: '@stockalert/sdk/test'
  } as any);

  describe('verifySignature', () => {
    const secret = 'webhook_secret_123';
    const body = JSON.stringify({
      id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
      event: 'alert.triggered',
      timestamp: 1736180400000,
      data: {
        alert_id: '123',
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 200,
        notification: 'email',
        status: 'triggered',
        price: 201.34
      }
    });

    const createPrefixedSignature = (timestamp: string, key: string): string => {
      const digest = crypto
        .createHmac('sha256', key)
        .update(`${timestamp}.${body}`)
        .digest('hex');
      return `sha256=${digest}`;
    };

    const createLegacySignature = (data: string, key: string): string => {
      return crypto.createHmac('sha256', key).update(data).digest('hex');
    };

    it('should verify signature with prefix and timestamp', () => {
      const timestamp = '1736180400000';
      const signature = createPrefixedSignature(timestamp, secret);
      expect(webhooks.verifySignature(body, signature, secret, timestamp)).toBe(true);
    });

    it('should support legacy signature format without timestamp', () => {
      const signature = createLegacySignature(body, secret);
      expect(webhooks.verifySignature(body, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = '1736180400000';
      const invalidSignature = createPrefixedSignature(timestamp, 'wrong_secret');
      expect(webhooks.verifySignature(body, invalidSignature, secret, timestamp)).toBe(false);
    });

    it('should reject empty inputs', () => {
      const signature = createLegacySignature(body, secret);
      expect(webhooks.verifySignature('', signature, secret)).toBe(false);
      expect(webhooks.verifySignature(body, '', secret)).toBe(false);
      expect(webhooks.verifySignature(body, signature, '')).toBe(false);
    });

    it('should handle invalid hex strings', () => {
      expect(webhooks.verifySignature(body, 'not-hex', secret)).toBe(false);
      expect(webhooks.verifySignature(body, 'zzzz', secret)).toBe(false);
    });

    it('should be timing-safe', () => {
      const timestamp = '1736180400000';
      const signature = createPrefixedSignature(timestamp, secret);
      const wrongSignature = createPrefixedSignature(timestamp, secret).replace(/.$/, '0');
      
      // Both should return false, but timing should be consistent
      // This is handled by crypto.timingSafeEqual internally
      expect(webhooks.verifySignature(body, wrongSignature, secret, timestamp)).toBe(false);
    });
  });

  describe('parse', () => {
    const validPayload = {
      id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
      event: 'alert.triggered',
      timestamp: 1736180400000,
      data: {
        alert_id: '123',
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 150,
        notification: 'email',
        status: 'triggered',
        triggered_at: '2024-01-01T00:00:00Z',
        price: 201.34
      }
    } as const;

    it('should parse valid JSON string', () => {
      const jsonString = JSON.stringify(validPayload);
      const parsed = webhooks.parse(jsonString);
      expect(parsed).toEqual(validPayload);
    });

    it('should parse valid object', () => {
      const parsed = webhooks.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('should coerce string timestamps to numbers', () => {
      const payloadWithStringTimestamp = {
        ...validPayload,
        timestamp: '1736180400000'
      };
      const parsed = webhooks.parse(payloadWithStringTimestamp as any);
      expect(parsed.timestamp).toBe(1736180400000);
    });

    it('should accept Buffer payloads', () => {
      const buffer = Buffer.from(JSON.stringify(validPayload), 'utf8');
      const parsed = webhooks.parse(buffer);
      expect(parsed).toEqual(validPayload);
    });

    it('should throw on invalid JSON', () => {
      expect(() => webhooks.parse('invalid json')).toThrow(ValidationError);
      expect(() => webhooks.parse('{')).toThrow(ValidationError);
    });

    it('should throw on invalid payload structure', () => {
      // Missing event
      expect(() => webhooks.parse({
        id: validPayload.id,
        timestamp: '2024-01-01',
        data: validPayload.data
      })).toThrow('Invalid webhook payload structure');

      // Missing data
      expect(() => webhooks.parse({
        id: validPayload.id,
        event: 'alert.triggered',
        timestamp: '2024-01-01'
      })).toThrow('Invalid webhook payload structure');

      // Invalid data structure
      expect(() => webhooks.parse({
        id: validPayload.id,
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

    it('should accept valid webhook events', () => {
      const parsed = webhooks.parse(validPayload);
      expect(parsed.event).toBe('alert.triggered');
      expect(parsed.data.alert_id).toBe('123');
      expect(parsed.data.symbol).toBe('AAPL');
    });
  });
});
