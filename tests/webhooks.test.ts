import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '../src/errors';
import { WebhooksResource } from '../src/resources/webhooks';

describe('WebhooksResource', () => {
  const webhooks = new WebhooksResource({
    apiKey: 'test',
    baseUrl: 'https://test.com',
    timeout: 30000,
    maxRetries: 3,
    debug: false,
    userAgent: '@stockalert/sdk/test',
  } as any);

  const currentPayload = {
    event: 'alert.triggered',
    timestamp: '2025-01-01T12:00:00.000Z',
    data: {
      alert: {
        id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 150,
        status: 'triggered',
        triggered_at: '2025-01-01T12:00:00.000Z',
      },
      stock: {
        symbol: 'AAPL',
        price: 201.34,
        change: 2.3,
        change_percent: 1.15,
      },
    },
  } as const;

  describe('verifySignature', () => {
    const secret = 'webhook_secret_123';
    const body = JSON.stringify(currentPayload);

    const createPrefixedSignature = (timestamp: string, key: string): string => {
      const digest = crypto
        .createHmac('sha256', key)
        .update(`${timestamp}.${body}`)
        .digest('hex');
      return `sha256=${digest}`;
    };

    const createLegacySignature = (data: string, key: string): string =>
      crypto.createHmac('sha256', key).update(data).digest('hex');

    it('verifies signatures with timestamped headers', () => {
      const timestamp = '1736180400000';
      const signature = createPrefixedSignature(timestamp, secret);
      expect(webhooks.verifySignature(body, signature, secret, timestamp)).toBe(true);
    });

    it('supports legacy signatures without timestamp', () => {
      const signature = createLegacySignature(body, secret);
      expect(webhooks.verifySignature(body, signature, secret)).toBe(true);
    });

    it('rejects invalid signatures and malformed hex', () => {
      const timestamp = '1736180400000';
      const invalidSignature = createPrefixedSignature(timestamp, 'wrong_secret');

      expect(webhooks.verifySignature(body, invalidSignature, secret, timestamp)).toBe(false);
      expect(webhooks.verifySignature(body, 'not-hex', secret)).toBe(false);
      expect(webhooks.verifySignature(body, 'zzzz', secret)).toBe(false);
    });

    it('rejects empty inputs', () => {
      const signature = createLegacySignature(body, secret);
      expect(webhooks.verifySignature('', signature, secret)).toBe(false);
      expect(webhooks.verifySignature(body, '', secret)).toBe(false);
      expect(webhooks.verifySignature(body, signature, '')).toBe(false);
      expect(webhooks.verifySignature(body, undefined as any, secret)).toBe(false);
      expect(webhooks.verifySignature(body, null as any, secret)).toBe(false);
    });
  });

  describe('parse', () => {
    it('parses the current nested payload format', () => {
      const parsed = webhooks.parse(JSON.stringify(currentPayload));
      expect(parsed).toEqual(currentPayload);
      expect(parsed.data.alert.id).toBe('77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33');
      expect(parsed.data.stock?.price).toBe(201.34);
    });

    it('accepts Buffer payloads', () => {
      const buffer = Buffer.from(JSON.stringify(currentPayload), 'utf8');
      const parsed = webhooks.parse(buffer);
      expect(parsed).toEqual(currentPayload);
    });

    it('normalizes the legacy flat payload format', () => {
      const parsed = webhooks.parse({
        id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
        event: 'alert.triggered',
        timestamp: 1736180400000,
        data: {
          alert_id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 150,
          notification: 'email',
          status: 'triggered',
          triggered_at: '2025-01-01T12:00:00.000Z',
          price: 201.34,
        },
      });

      expect(parsed).toEqual({
        id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
        event: 'alert.triggered',
        timestamp: 1736180400000,
        data: {
          alert: {
            id: '77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33',
            symbol: 'AAPL',
            condition: 'price_above',
            threshold: 150,
            notification: 'email',
            status: 'triggered',
            triggered_at: '2025-01-01T12:00:00.000Z',
          },
          stock: {
            symbol: 'AAPL',
            price: 201.34,
          },
        },
      });
    });

    it('throws on invalid JSON and invalid payloads', () => {
      expect(() => webhooks.parse('invalid json')).toThrow(ValidationError);
      expect(() => webhooks.parse('{')).toThrow(ValidationError);
      expect(() => webhooks.parse({} as any)).toThrow('Invalid webhook payload structure');
      expect(() =>
        webhooks.parse({
          event: 'alert.triggered',
          timestamp: '',
          data: {},
        } as any)
      ).toThrow('Invalid webhook payload structure');
      expect(() => webhooks.parse(null as any)).toThrow('Invalid webhook payload structure');
    });
  });
});
