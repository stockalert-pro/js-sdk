import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StockAlert } from '../src/client';
import type { CreateAlertRequest } from '../src/types';
import { ValidationError, AuthenticationError, ApiError, NetworkError } from '../src/errors';
import { startMockApiServer, VALID_API_KEY } from './helpers/mock-api-server';

describe('StockAlert SDK - Contract Integration Tests', () => {
  let client: StockAlert;
  let baseUrl: string;
  let stopServer: () => Promise<void>;

  beforeAll(async () => {
    const server = await startMockApiServer();
    baseUrl = server.baseUrl;
    stopServer = server.stop;
    client = new StockAlert({
      apiKey: VALID_API_KEY,
      baseUrl,
      debug: true,
      timeout: 5000,
    });
  });

  afterAll(async () => {
    await stopServer();
  });

  it('initializes the client against the contract server', () => {
    const config = client.getConfig();

    expect(client.alerts).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.watchlist).toBeDefined();
    expect(client.stocks).toBeDefined();
    expect(client.user).toBeDefined();
    expect(config.apiKey).toMatch(/^sk_.*\.\.\..*$/);
    expect(config.baseUrl).toBe(baseUrl);
  });

  it('covers alert lifecycle and history endpoints', async () => {
    const priceAlert = await client.alerts.create({
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 200,
      notification: 'email',
    });
    const noThresholdAlert = await client.alerts.create({
      symbol: 'MSFT',
      condition: 'ma_crossover_golden',
      notification: 'email',
    });

    expect(priceAlert.symbol).toBe('AAPL');
    expect(noThresholdAlert.threshold ?? null).toBeNull();

    const retrieved = await client.alerts.retrieve(priceAlert.id);
    expect(retrieved.id).toBe(priceAlert.id);

    const updated = await client.alerts.update(priceAlert.id, { threshold: 250 });
    expect(updated.threshold).toBe(250);

    const paused = await client.alerts.pause(priceAlert.id);
    expect(paused.status).toBe('paused');

    const activated = await client.alerts.activate(priceAlert.id);
    expect(activated.status).toBe('active');

    const history = await client.alerts.history(priceAlert.id, { limit: 10 });
    expect(history.data.length).toBeGreaterThanOrEqual(3);
    expect(history.meta.rate_limit?.limit).toBeGreaterThan(0);

    const deleted = await client.alerts.remove(noThresholdAlert.id);
    expect(deleted.status).toBe('deleted');
  });

  it('covers batch creation, pagination, filtering and iteration', async () => {
    const alerts = await client.alerts.createBatch([
      {
        symbol: 'GOOGL',
        condition: 'price_above',
        threshold: 150,
        notification: 'email',
      },
      {
        symbol: 'AMZN',
        condition: 'price_below',
        threshold: 140,
        notification: 'email',
      },
      {
        symbol: 'META',
        condition: 'price_change_down',
        threshold: 3,
        notification: 'email',
      },
    ]);

    expect(alerts).toHaveLength(3);

    const page1 = await client.alerts.list({ limit: 2, page: 1 });
    expect(page1.meta.pagination.page).toBe(1);
    expect(page1.meta.pagination.total_pages).toBeGreaterThanOrEqual(2);
    expect(page1.meta.rate_limit?.remaining).toBeGreaterThanOrEqual(0);

    const filteredBySymbol = await client.alerts.list({ symbol: 'GOOGL', limit: 10 });
    expect(filteredBySymbol.data.every((alert) => alert.symbol === 'GOOGL')).toBe(true);

    const filteredByCondition = await client.alerts.list({
      condition: 'price_change_down',
      limit: 10,
    });
    expect(filteredByCondition.data.every((alert) => alert.condition === 'price_change_down')).toBe(true);

    const iteratedIds: string[] = [];
    for await (const alert of client.alerts.iterate({ limit: 2 })) {
      iteratedIds.push(alert.id);
      if (iteratedIds.length >= 6) {
        break;
      }
    }
    expect(iteratedIds.length).toBeGreaterThan(0);
  });

  it('keeps client-side validation active for invalid requests', async () => {
    expect(() =>
      client.alerts.create({
        symbol: 'invalid symbol!',
        condition: 'price_above',
        threshold: 100,
        notification: 'email',
      } as CreateAlertRequest),
    ).toThrow(ValidationError);
    expect(() =>
      client.alerts.create({
        symbol: 'AAPL',
        condition: 'price_above',
        notification: 'email',
      } as CreateAlertRequest),
    ).toThrow('requires a valid threshold');
    expect(() =>
      client.alerts.create({
        symbol: 'AAPL',
        condition: 'ma_crossover_golden',
        threshold: 100,
        notification: 'email',
      }),
    ).toThrow('does not use a threshold');
    expect(() => client.alerts.retrieve('invalid-id')).toThrow('must be a valid UUID');
  });

  it('covers webhook CRUD, testing and signature verification', async () => {
    const listBefore = await client.webhooks.list();
    expect(Array.isArray(listBefore.data)).toBe(true);
    expect(listBefore.meta.rate_limit?.limit).toBeGreaterThan(0);

    const webhook = await client.webhooks.create({
      url: 'https://example.com/webhook-test-integration',
      events: ['alert.triggered'],
    });
    expect(webhook.secret).toBeDefined();

    const retrieved = await client.webhooks.retrieve(webhook.id);
    expect(retrieved.id).toBe(webhook.id);

    const payload = JSON.stringify({
      event: 'alert.triggered',
      timestamp: '2026-03-19T12:00:00.000Z',
      data: {
        alert: {
          id: 'alert_1',
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 200,
          status: 'triggered',
        },
        stock: {
          symbol: 'AAPL',
          price: 201.5,
          change: 1.2,
          change_percent: 0.6,
        },
      },
    });
    const timestamp = '1710849600';
    const signature = `sha256=${createHmac('sha256', webhook.secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex')}`;

    expect(client.webhooks.verifySignature(payload, signature, webhook.secret, timestamp)).toBe(true);
    expect(client.webhooks.verifySignature(payload, 'wrong-signature', webhook.secret, timestamp)).toBe(false);

    const testResult = await client.webhooks.test({
      url: webhook.url,
      secret: webhook.secret,
    });
    expect(testResult.status).toBe(200);

    const removed = await client.webhooks.remove(webhook.id);
    expect(removed.id).toBe(webhook.id);
  });

  it('surfaces authentication, not found and network errors', async () => {
    const invalidClient = new StockAlert({
      apiKey: 'sk_invalid_key_12345678901234567890',
      baseUrl,
      maxRetries: 0,
    });

    await expect(invalidClient.alerts.list()).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      client.alerts.retrieve('00000000-0000-4000-a000-000000000000'),
    ).rejects.toBeInstanceOf(ApiError);

    const badClient = new StockAlert({
      apiKey: VALID_API_KEY,
      baseUrl: 'http://127.0.0.1:9/api/v1',
      timeout: 1000,
      maxRetries: 0,
    });
    await expect(badClient.alerts.list()).rejects.toBeInstanceOf(NetworkError);
  });
});
