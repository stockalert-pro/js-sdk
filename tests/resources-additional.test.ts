import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StockAlert } from '../src/client';
import { startMockApiServer, VALID_API_KEY } from './helpers/mock-api-server';

describe('StockAlert SDK - Additional Resources', () => {
  let client: StockAlert;
  let stopServer: () => Promise<void>;

  beforeAll(async () => {
    const server = await startMockApiServer();
    stopServer = server.stop;
    client = new StockAlert({
      apiKey: VALID_API_KEY,
      baseUrl: server.baseUrl,
      debug: true,
      timeout: 5000,
    });
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('Stocks Resource', () => {
    it('should get stock details and subscription data', async () => {
      const stock = await client.stocks.retrieve('AAPL');
      const subscription = await client.user.getSubscription();

      expect(stock).toBeDefined();
      expect(stock.symbol).toBe('AAPL');
      expect(subscription.account_type).toBe('premium');
      expect(subscription.status).toBe('active');
    });
  });

  describe('Watchlist Resource', () => {
    it('should create, list, update, swap and delete watchlist items', async () => {
      const item = await client.watchlist.create({
        stock_symbol: 'GOOGL',
        intention: 'buy',
        target_price: 150,
        notes: 'integration-test',
      });

      const listAfterCreate = await client.watchlist.list();
      expect(listAfterCreate.meta?.rate_limit?.limit).toBeGreaterThan(0);
      expect(listAfterCreate.data.some((entry) => entry.id === item.id)).toBe(true);

      const updated = await client.watchlist.update(item.id, {
        target_price: 180,
        notes: 'Updated during integration test',
      });
      expect(updated.target_price).toBe(180);
      expect(updated.notes).toBe('Updated during integration test');

      const result = await client.watchlist.swapIntention({
        item_id: item.id,
        stock_symbol: item.stock_symbol,
        new_intention: 'sell',
      });
      expect(result.item.intention).toBe('sell');

      const removed = await client.watchlist.remove(item.id);
      expect(removed.deleted).toBe(true);
    });
  });
});
