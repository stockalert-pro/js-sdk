// Main export
export { StockAlert, type StockAlertEvents } from './client';
import { StockAlert } from './client';
export default StockAlert;

// Type exports
export * from './types';

// Error exports
export * from './errors';

// Resource exports (for advanced usage)
export { AlertsResource } from './resources/alerts';
export { ApiKeysResource } from './resources/api-keys';
export { WebhooksResource, type WebhookPayload } from './resources/webhooks';

// Utility exports
export { detectEnvironment, checkBrowserSecurity, type Environment } from './utils/environment';

// Version
export const VERSION = '1.0.2';
