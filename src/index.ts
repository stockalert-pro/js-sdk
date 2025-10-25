// Main export
export { StockAlert, type StockAlertEvents } from './client';

// Type exports
export * from './types';

// Error exports
export * from './errors';

// Resource exports (for advanced usage)
export { AlertsResource } from './resources/alerts';
export { ApiKeysResource } from './resources/api-keys';
export { WatchlistResource } from './resources/watchlist';
export { StocksResource, type GetStockOptions } from './resources/stocks';
export { UserResource } from './resources/user';
export {
  WebhooksResource,
  type Webhook,
  type WebhookCreated,
  type CreateWebhookRequest,
  type WebhookTestRequest,
  type WebhookTestResponse,
  type WebhookEvent,
  type WebhookPayload
} from './resources/webhooks';

// Utility exports
export { detectEnvironment, checkBrowserSecurity, type Environment } from './utils/environment';

// Version
export const VERSION = '1.1.0';
