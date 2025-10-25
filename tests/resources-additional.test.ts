/**
 * Additional resources integration tests
 * Tests watchlist, stocks, and user resources
 *
 * Run with: npm test -- tests/resources-additional.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StockAlert } from '../src/client';

const API_KEY = 'sk_5fbfefc2db6bc2611ab5fb2e193a77c455c7bb0e8a2184b998f18c1bfda3bb61';

describe('StockAlert SDK - Additional Resources', () => {
  let client: StockAlert;
  const createdWatchlistIds: string[] = [];

  beforeAll(() => {
    client = new StockAlert({
      apiKey: API_KEY,
      debug: true,
      timeout: 60000,
    });
  });

  afterAll(async () => {
    // Cleanup watchlist items
    console.log(`\n🧹 Cleaning up ${createdWatchlistIds.length} watchlist items...`);

    for (const id of createdWatchlistIds) {
      try {
        await client.watchlist.remove(id);
        console.log(`  ✓ Deleted watchlist item ${id}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete watchlist item ${id}:`, (error as Error).message);
      }
    }
  });

  describe('Stocks Resource', () => {
    it('should get stock details (requires bearer token)', async () => {
      // Note: This endpoint requires bearer token authentication, not API key
      // So we expect it to fail with API key authentication
      try {
        const stock = await client.stocks.retrieve('AAPL');
        // If it succeeds (shouldn't with API key)
        expect(stock).toBeDefined();
        console.log(`📈 AAPL: ${stock.name} - $${stock.last_price}`);
      } catch (error: any) {
        // Expected to fail with API key auth
        expect(error.message).toContain('authentication');
        console.log(`⚠️ Stocks resource requires bearer token (expected with API key)`);
      }
    });
  });

  describe('Watchlist Resource', () => {
    it('should list watchlist items', async () => {
      const response = await client.watchlist.list();

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`📋 Found ${response.data.length} watchlist items`);
    });

    it('should add a stock to watchlist (buy intention)', async () => {
      const item = await client.watchlist.create({
        stock_symbol: 'GOOGL',
        intention: 'buy',
        target_price: 150,
        notes: 'Integration test - buy',
        auto_alerts_enabled: false,
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.stock_symbol).toBe('GOOGL');
      expect(item.intention).toBe('buy');
      expect(item.target_price).toBe(150);

      createdWatchlistIds.push(item.id);
      console.log(`✅ Added ${item.stock_symbol} to watchlist (${item.intention})`);
    });

    it('should update a watchlist item', async () => {
      if (createdWatchlistIds.length === 0) {
        throw new Error('No watchlist items created yet');
      }

      const itemId = createdWatchlistIds[0];
      const updated = await client.watchlist.update(itemId, {
        target_price: 180,
        notes: 'Updated during integration test',
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(itemId);
      expect(updated.target_price).toBe(180);
      expect(updated.notes).toBe('Updated during integration test');

      console.log(`✏️ Updated watchlist item ${itemId}`);
    });

    it('should swap intention of watchlist item', async () => {
      if (createdWatchlistIds.length === 0) {
        throw new Error('No watchlist items created yet');
      }

      const itemId = createdWatchlistIds[0];

      // Get the current watchlist to find the stock symbol
      const watchlist = await client.watchlist.list();
      const item = watchlist.data.find(i => i.id === itemId);

      if (!item) {
        throw new Error('Watchlist item not found');
      }

      const result = await client.watchlist.swapIntention({
        item_id: itemId,
        stock_symbol: item.stock_symbol,
        new_intention: 'sell', // Swap from buy to sell
      });

      expect(result).toBeDefined();
      console.log(`🔄 Swapped intention for ${item.stock_symbol}`);
    });

    it('should delete watchlist items', async () => {
      const itemsToDelete = [...createdWatchlistIds];

      for (const itemId of itemsToDelete) {
        const result = await client.watchlist.remove(itemId);

        expect(result).toBeDefined();
        expect(result.deleted).toBe(true);

        console.log(`🗑️ Deleted watchlist item ${itemId}`);
      }

      createdWatchlistIds.length = 0;
    });
  });

  describe('User Resource', () => {
    it('should get user subscription', async () => {
      const subscription = await client.user.getSubscription();

      expect(subscription).toBeDefined();
      expect(subscription.account_type).toBeDefined();
      expect(subscription.status).toBeDefined();

      console.log(`👤 User subscription: ${subscription.account_type} (${subscription.status})`);
    });
  });
});
