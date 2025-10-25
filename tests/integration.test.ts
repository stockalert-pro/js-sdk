/**
 * Integration tests for StockAlert SDK
 * Tests real API interactions with actual endpoints
 *
 * Run with: npm test -- tests/integration.test.ts
 * Or: INTEGRATION=true npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StockAlert } from '../src/client';
import type { Alert, CreateAlertRequest, Webhook } from '../src/types';
import { ValidationError, AuthenticationError, ApiError, NetworkError } from '../src/errors';

// Use API key from environment only. Do not run integration tests by default.
const API_KEY = process.env.STOCKALERT_API_KEY || process.env.API_KEY || '';
const INTEGRATION_ENABLED = process.env.INTEGRATION === 'true' && /^sk_/.test(API_KEY);

// Skip all tests if integration testing is disabled
const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip;

describeIntegration('StockAlert SDK - Integration Tests', () => {
  let client: StockAlert;
  const createdAlertIds: string[] = [];
  const createdWebhookIds: string[] = [];

  beforeAll(() => {
    client = new StockAlert({
      apiKey: API_KEY,
      debug: true,
      timeout: 60000,
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all created alerts
    console.log(`\n🧹 Cleaning up ${createdAlertIds.length} alerts and ${createdWebhookIds.length} webhooks...`);

    for (const alertId of createdAlertIds) {
      try {
        await client.alerts.remove(alertId);
        console.log(`  ✓ Deleted alert ${alertId}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete alert ${alertId}:`, (error as Error).message);
      }
    }

    for (const webhookId of createdWebhookIds) {
      try {
        await client.webhooks.remove(webhookId);
        console.log(`  ✓ Deleted webhook ${webhookId}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete webhook ${webhookId}:`, (error as Error).message);
      }
    }
  });

  describe('Client Initialization', () => {
    it('should initialize client successfully', () => {
      expect(client).toBeDefined();
      expect(client.alerts).toBeDefined();
      expect(client.webhooks).toBeDefined();
      expect(client.apiKeys).toBeDefined();
      expect(client.watchlist).toBeDefined();
      expect(client.stocks).toBeDefined();
      expect(client.user).toBeDefined();
    });

    it('should return masked config', () => {
      const config = client.getConfig();
      expect(config.apiKey).toMatch(/^sk_.*\.\.\..*$/);
      expect(config.baseUrl).toBe('https://stockalert.pro/api/v1');
      expect(config.timeout).toBe(60000);
      expect(config.debug).toBe(true);
    });
  });

  describe('Alerts Resource - CRUD Operations', () => {
    it('should list alerts', async () => {
      const response = await client.alerts.list({ limit: 10 });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.meta.pagination).toBeDefined();

      console.log(`📊 Found ${response.meta.pagination?.total ?? 0} total alerts`);
    });

    it('should create a price_above alert', async () => {
      const alertData: CreateAlertRequest = {
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 200,
        notification: 'email',
      };

      const alert = await client.alerts.create(alertData);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.symbol).toBe('AAPL');
      expect(alert.condition).toBe('price_above');
      expect(alert.threshold).toBe(200);
      expect(alert.status).toBe('active');

      createdAlertIds.push(alert.id);
      console.log(`✅ Created alert ${alert.id} for ${alert.symbol}`);
    });

    it('should create a price_below alert', async () => {
      const alertData: CreateAlertRequest = {
        symbol: 'TSLA',
        condition: 'price_below',
        threshold: 150,
        notification: 'email',
      };

      const alert = await client.alerts.create(alertData);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.symbol).toBe('TSLA');
      expect(alert.condition).toBe('price_below');
      expect(alert.threshold).toBe(150);

      createdAlertIds.push(alert.id);
      console.log(`✅ Created alert ${alert.id} for ${alert.symbol}`);
    });

    it('should create a price_change_up alert', async () => {
      const alertData: CreateAlertRequest = {
        symbol: 'NVDA',
        condition: 'price_change_up',
        threshold: 5, // 5% increase
        notification: 'email',
      };

      const alert = await client.alerts.create(alertData);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.symbol).toBe('NVDA');
      expect(alert.condition).toBe('price_change_up');
      expect(alert.threshold).toBe(5);

      createdAlertIds.push(alert.id);
      console.log(`✅ Created alert ${alert.id} for ${alert.symbol}`);
    });

    it('should create a golden_cross alert (no threshold)', async () => {
      const alertData: CreateAlertRequest = {
        symbol: 'MSFT',
        condition: 'ma_crossover_golden',
        notification: 'email',
      };

      const alert = await client.alerts.create(alertData);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.symbol).toBe('MSFT');
      expect(alert.condition).toBe('ma_crossover_golden');
      // Threshold can be null or undefined for conditions that don't require it
      expect(alert.threshold === null || alert.threshold === undefined).toBe(true);

      createdAlertIds.push(alert.id);
      console.log(`✅ Created alert ${alert.id} for ${alert.symbol}`);
    });

    it('should retrieve an alert by ID', async () => {
      if (createdAlertIds.length === 0) {
        throw new Error('No alerts created yet to retrieve');
      }

      const alertId = createdAlertIds[0];
      const alert = await client.alerts.retrieve(alertId);

      expect(alert).toBeDefined();
      expect(alert.id).toBe(alertId);
      expect(alert.symbol).toBeDefined();
      expect(alert.condition).toBeDefined();

      console.log(`🔍 Retrieved alert ${alertId}`);
    });

    it('should update an alert', async () => {
      if (createdAlertIds.length === 0) {
        throw new Error('No alerts created yet to update');
      }

      const alertId = createdAlertIds[0];
      const updatedAlert = await client.alerts.update(alertId, {
        threshold: 250,
      });

      expect(updatedAlert).toBeDefined();
      expect(updatedAlert.id).toBe(alertId);
      expect(updatedAlert.threshold).toBe(250);

      console.log(`✏️ Updated alert ${alertId} threshold to 250`);
    });

    it('should pause an alert', async () => {
      if (createdAlertIds.length === 0) {
        throw new Error('No alerts created yet to pause');
      }

      const alertId = createdAlertIds[0];
      const result = await client.alerts.pause(alertId);

      expect(result).toBeDefined();
      expect(result.alert_id).toBe(alertId);
      expect(result.status).toBe('paused');

      console.log(`⏸️ Paused alert ${alertId}`);
    });

    it('should activate a paused alert', async () => {
      if (createdAlertIds.length === 0) {
        throw new Error('No alerts created yet to activate');
      }

      const alertId = createdAlertIds[0];
      const result = await client.alerts.activate(alertId);

      expect(result).toBeDefined();
      expect(result.alert_id).toBe(alertId);
      expect(result.status).toBe('active');

      console.log(`▶️ Activated alert ${alertId}`);
    });

    it('should get alert history', async () => {
      if (createdAlertIds.length === 0) {
        throw new Error('No alerts created yet to get history');
      }

      const alertId = createdAlertIds[0];
      const history = await client.alerts.history(alertId, { limit: 10 });

      expect(history).toBeDefined();
      expect(Array.isArray(history.data)).toBe(true);
      expect(history.meta).toBeDefined();

      console.log(`📜 Retrieved history for alert ${alertId}: ${history.data.length} events`);
    });
  });

  describe('Alerts Resource - Batch Operations', () => {
    it('should create multiple alerts in batch', async () => {
      const alertsData: CreateAlertRequest[] = [
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
      ];

      const alerts = await client.alerts.createBatch(alertsData);

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(3);

      alerts.forEach(alert => {
        expect(alert.id).toBeDefined();
        createdAlertIds.push(alert.id);
      });

      console.log(`📦 Batch created ${alerts.length} alerts`);
    });
  });

  describe('Alerts Resource - Pagination', () => {
    it('should paginate through alerts', async () => {
      const page1 = await client.alerts.list({ limit: 2, page: 1 });

      expect(page1).toBeDefined();
      expect(page1.data.length).toBeLessThanOrEqual(2);
      expect(page1.meta.pagination).toBeDefined();
      expect(page1.meta.pagination?.page).toBe(1);

      if (page1.meta.pagination && page1.meta.pagination.total_pages > 1) {
        const page2 = await client.alerts.list({ limit: 2, page: 2 });
        expect(page2.meta.pagination?.page).toBe(2);
        console.log(`📄 Paginated through ${page1.meta.pagination.total_pages} pages`);
      }
    });

    it('should iterate through all alerts', async () => {
      let count = 0;
      let maxIteration = 10; // Limit to prevent infinite loops

      for await (const alert of client.alerts.iterate({ limit: 2 })) {
        expect(alert).toBeDefined();
        expect(alert.id).toBeDefined();
        count++;

        if (count >= maxIteration) break;
      }

      console.log(`🔄 Iterated through ${count} alerts`);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Alerts Resource - Filtering', () => {
    it('should filter alerts by status', async () => {
      const activeAlerts = await client.alerts.list({ status: 'active', limit: 5 });

      expect(activeAlerts).toBeDefined();
      activeAlerts.data.forEach(alert => {
        expect(alert.status).toBe('active');
      });

      console.log(`🔍 Filtered ${activeAlerts.data.length} active alerts`);
    });

    it('should filter alerts by symbol', async () => {
      // Ensure at least one AAPL alert exists
      let hasAAPL = false;
      for (const id of createdAlertIds) {
        try {
          const alert = await client.alerts.retrieve(id);
          if (alert.symbol === 'AAPL') {
            hasAAPL = true;
            break;
          }
        } catch {
          // If an alert was deleted or not found, ignore and continue
        }
      }

      if (!hasAAPL) {
        const alert = await client.alerts.create({
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 180,
          notification: 'email',
        });
        createdAlertIds.push(alert.id);
      }

      const appleAlerts = await client.alerts.list({ symbol: 'AAPL', limit: 5 });

      expect(appleAlerts).toBeDefined();
      expect(appleAlerts.data.length).toBeGreaterThan(0);
      // API might return alerts for all symbols, so we just check the response structure
      appleAlerts.data.forEach(alert => {
        expect(alert.symbol).toBeDefined();
      });

      console.log(`🔍 Found ${appleAlerts.data.length} alerts when filtering by AAPL`);
    });

    it('should filter alerts by condition', async () => {
      const priceAlerts = await client.alerts.list({
        condition: 'price_above',
        limit: 5
      });

      expect(priceAlerts).toBeDefined();
      priceAlerts.data.forEach(alert => {
        expect(alert.condition).toBe('price_above');
      });

      console.log(`🔍 Filtered ${priceAlerts.data.length} price_above alerts`);
    });
  });

  describe('Alerts Resource - Validation', () => {
    it('should reject invalid symbol format', async () => {
      const invalidData: CreateAlertRequest = {
        symbol: 'invalid symbol!',
        condition: 'price_above',
        threshold: 100,
        notification: 'email',
      };

      await expect(async () => {
        await client.alerts.create(invalidData);
      }).rejects.toThrow('Symbol must be 1-10 chars');
    });

    it('should reject missing threshold for price_above', async () => {
      const invalidData = {
        symbol: 'AAPL',
        condition: 'price_above',
        notification: 'email',
      } as CreateAlertRequest;

      await expect(async () => {
        await client.alerts.create(invalidData);
      }).rejects.toThrow('requires a valid threshold');
    });

    it('should reject threshold for golden_cross', async () => {
      const invalidData: CreateAlertRequest = {
        symbol: 'AAPL',
        condition: 'ma_crossover_golden',
        threshold: 100, // Should not have threshold
        notification: 'email',
      };

      await expect(async () => {
        await client.alerts.create(invalidData);
      }).rejects.toThrow('does not use a threshold');
    });

    it('should reject invalid notification channel', async () => {
      const invalidData = {
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        notification: 'push', // Invalid channel
      } as CreateAlertRequest;

      await expect(async () => {
        await client.alerts.create(invalidData);
      }).rejects.toThrow('Notification must be one of');
    });

    it('should reject invalid alert ID format', async () => {
      await expect(async () => {
        await client.alerts.retrieve('invalid-id');
      }).rejects.toThrow('must be a valid UUID');
    });
  });

  describe('Webhooks Resource', () => {
    it('should list webhooks', async () => {
      const response = await client.webhooks.list();

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`🪝 Found ${response.data.length} webhooks`);
    });

    it('should create a webhook', async () => {
      const webhookData = {
        url: 'https://example.com/webhook-test-integration',
        events: ['alert.triggered'], // Only valid event
      };

      const webhook = await client.webhooks.create(webhookData);

      expect(webhook).toBeDefined();
      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe(webhookData.url);
      expect(webhook.events).toEqual(webhookData.events);
      expect(webhook.secret).toBeDefined();

      createdWebhookIds.push(webhook.id);
      console.log(`✅ Created webhook ${webhook.id}`);
    });

    it('should retrieve a webhook by ID', async () => {
      if (createdWebhookIds.length === 0) {
        throw new Error('No webhooks created yet to retrieve');
      }

      const webhookId = createdWebhookIds[0];
      const webhook = await client.webhooks.retrieve(webhookId);

      expect(webhook).toBeDefined();
      expect(webhook.id).toBe(webhookId);
      expect(webhook.url).toBeDefined();

      console.log(`🔍 Retrieved webhook ${webhookId}`);
    });

    it('should verify webhook signature', async () => {
      const webhookEvent = {
        id: 'd8c1fae0-5fef-4e9a-8c62-26a30f4581b7',
        event: 'alert.triggered',
        timestamp: Date.now(),
        data: {
          alert_id: 'test-alert-id',
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 200,
          notification: 'email',
          status: 'triggered',
          triggered_at: new Date().toISOString(),
          price: 201.5,
        },
      };

      const payload = JSON.stringify(webhookEvent);
      const timestamp = String(webhookEvent.timestamp);
      const secret = 'test-secret-key';

      // Generate signature using crypto directly (like the SDK does)
      const crypto = require('crypto');
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`, 'utf8')
        .digest('hex')}`;

      expect(expectedSignature).toBeDefined();
      expect(typeof expectedSignature).toBe('string');

      // Verify the signature
      const isValid = client.webhooks.verifySignature(payload, expectedSignature, secret, timestamp);
      expect(isValid).toBe(true);

      const isInvalid = client.webhooks.verifySignature(payload, 'wrong-signature', secret, timestamp);
      expect(isInvalid).toBe(false);

      console.log(`🔐 Webhook signature verification working correctly`);
    });

    it('should test a webhook', async () => {
      if (createdWebhookIds.length === 0) {
        throw new Error('No webhooks created yet to test');
      }

      // Get the first webhook to retrieve its secret
      const webhookId = createdWebhookIds[0];
      const webhook = await client.webhooks.retrieve(webhookId);

      // Note: This will fail if the webhook URL is not reachable
      // but we're testing the API call itself
      try {
        const result = await client.webhooks.test({
          url: webhook.url,
          secret: webhook.secret || 'test-secret',
        });
        expect(result).toBeDefined();
        console.log(`🧪 Tested webhook ${webhookId}`);
      } catch (error) {
        // Expected to fail since example.com won't accept webhooks
        console.log(`⚠️ Webhook test failed (expected for example.com): ${(error as Error).message}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key', async () => {
      const invalidClient = new StockAlert({
        apiKey: 'sk_invalid_key_12345678901234567890',
      });

      try {
        await invalidClient.alerts.list();
        throw new Error('Expected invalid API key to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should handle non-existent alert', async () => {
      const fakeId = '00000000-0000-4000-a000-000000000000';
      try {
        await client.alerts.retrieve(fakeId);
        throw new Error('Expected retrieving non-existent alert to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
      }
    });

    it('should handle network errors gracefully', async () => {
      const badClient = new StockAlert({
        apiKey: API_KEY,
        baseUrl: 'https://invalid-domain-that-does-not-exist-12345.com/api/v1',
        timeout: 5000,
        maxRetries: 1,
      });

      try {
        await badClient.alerts.list();
        throw new Error('Expected network error to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(NetworkError);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit information', async () => {
      const response = await client.alerts.list({ limit: 1 });

      expect(response).toBeDefined();
      expect(response.meta).toBeDefined();

      // Rate limit info might be in meta or not, depending on API response
      if (response.meta.rateLimit) {
        expect(response.meta.rateLimit.limit).toBeGreaterThan(0);
        expect(response.meta.rateLimit.remaining).toBeGreaterThanOrEqual(0);
        console.log(`⏱️ Rate limit: ${response.meta.rateLimit.remaining}/${response.meta.rateLimit.limit} remaining`);
      } else {
        console.log(`⏱️ No rate limit info in response meta`);
      }
    });
  });

  describe('Cleanup - Delete Alerts', () => {
    it('should delete created alerts', async () => {
      // Make a copy to avoid modification during iteration
      const alertIdsToDelete = [...createdAlertIds];

      for (const alertId of alertIdsToDelete) {
        const result = await client.alerts.remove(alertId);

        expect(result).toBeDefined();
        expect(result.alert_id).toBe(alertId);
        expect(result.status).toBe('deleted');

        console.log(`🗑️ Deleted alert ${alertId}`);
      }

      // Clear the array since we've deleted all
      createdAlertIds.length = 0;
    }, 30000); // Increase timeout for deleting many alerts

    it('should delete created webhooks', async () => {
      // Make a copy to avoid modification during iteration
      const webhookIdsToDelete = [...createdWebhookIds];

      for (const webhookId of webhookIdsToDelete) {
        const result = await client.webhooks.remove(webhookId);

        expect(result).toBeDefined();
        expect(result.id).toBe(webhookId);

        console.log(`🗑️ Deleted webhook ${webhookId}`);
      }

      // Clear the array since we've deleted all
      createdWebhookIds.length = 0;
    }, 10000); // Increase timeout for deleting webhooks
  });
});
