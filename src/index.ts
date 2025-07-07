// Main export
export { StockAlert } from './client';

// Type exports
export * from './types';

// Error exports
export * from './errors';

// Resource exports (for advanced usage)
export { AlertsResource } from './resources/alerts';
export { ApiKeysResource } from './resources/api-keys';
export { WebhooksResource, type WebhookPayload } from './resources/webhooks';

// Version
export const VERSION = '1.0.0';
