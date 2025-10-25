# StockAlert.pro JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for the StockAlert.pro API.

## Requirements

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
npm install @stockalert/sdk
# or
yarn add @stockalert/sdk
# or
pnpm add @stockalert/sdk
```

## Quick Start

```typescript
import { StockAlert } from '@stockalert/sdk';

const client = new StockAlert({
  apiKey: 'sk_your_api_key'
});

// List all alerts
const alerts = await client.alerts.list();

// Create a new alert
const alert = await client.alerts.create({
  symbol: 'AAPL',
  condition: 'price_above',
  threshold: 200,
  notification: 'email'
});

// Update alert status
await client.alerts.update(alert.id, {
  status: 'paused'
});

// Delete alert
await client.alerts.remove(alert.id);
```

## Features

- 🚀 Full TypeScript support with strict typing
- 🔄 Automatic retries with exponential backoff and jitter
- 🛡️ Built-in request validation and error handling
- 📦 Small bundle size with tree shaking support
- 🧪 Comprehensive test suite
- 📚 Detailed JSDoc documentation
- 🔒 Browser security warnings
- ⚡ Request deduplication for GET requests
- 📊 Event emitters for monitoring
- 🎯 Batch operations support

## Advanced Usage

### Event Monitoring

```typescript
const client = new StockAlert({
  apiKey: 'sk_your_api_key',
  debug: true
});

// Subscribe to events
const unsubscribe = client.on('request:success', (event) => {
  console.log(`Request to ${event.path} took ${event.duration}ms`);
});

client.on('rate:limit', (event) => {
  console.warn(`Rate limited! Retry after ${event.retryAfter} seconds`);
});
```

### Batch Operations

```typescript
// Create multiple alerts efficiently
const alerts = await client.alerts.createBatch([
  { symbol: 'AAPL', condition: 'price_above', threshold: 200, notification: 'email' },
  { symbol: 'GOOGL', condition: 'price_below', threshold: 150, notification: 'sms' },
  { symbol: 'MSFT', condition: 'new_high', threshold: 365, notification: 'email' }
]);
```

### Pagination

```typescript
// Manual pagination
const page1 = await client.alerts.list({ limit: 50, offset: 0 });
const page2 = await client.alerts.list({ limit: 50, offset: 50 });

// Automatic iteration
for await (const alert of client.alerts.iterate()) {
  console.log(alert.symbol, alert.condition);
}
```

### Webhook Verification

```typescript
// Verify webhook signatures
const isValid = client.webhooks.verifySignature(
  rawBody,              // Buffer or string
  signatureHeader,      // e.g. "sha256=<hex>"
  webhookSecret,
  timestampHeader       // X-StockAlert-Timestamp header value
);

if (isValid) {
  const event = client.webhooks.parse(rawBody);
  console.log('Received event:', event.event);
}
```

## Configuration Options

```typescript
const client = new StockAlert({
  apiKey: 'sk_your_api_key',       // Required
  baseUrl: 'https://...',          // Optional: Custom API endpoint
  timeout: 30000,                  // Optional: Request timeout in ms (default: 30s)
  maxRetries: 3,                   // Optional: Max retry attempts (default: 3)
  debug: false,                    // Optional: Enable debug logging
  userAgent: 'MyApp/1.0'          // Optional: Custom user agent
});
```

## Security Notes

⚠️ **Browser Usage Warning**: This SDK will warn when used in browsers with production API keys. For browser applications, use a backend proxy to keep your API keys secure.

## Error Handling

```typescript
import { ValidationError, ApiError, RateLimitError } from '@stockalert/sdk';

try {
  await client.alerts.create({
    symbol: 'INVALID_SYMBOL_TOO_LONG',
    condition: 'price_above',
    threshold: 200,
    notification: 'email'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof ApiError) {
    console.error(`API error ${error.statusCode}:`, error.message);
  }
}
```

## Type Safety

The SDK provides comprehensive TypeScript types:

```typescript
import type { 
  Alert, 
  AlertCondition, 
  CreateAlertRequest,
  PaginatedResponse 
} from '@stockalert/sdk';

// Types are strictly enforced
const request: CreateAlertRequest = {
  symbol: 'AAPL',
  condition: 'price_above', // Auto-completed
  threshold: 200,
  notification: 'email'     // Type-checked
};
```

## Documentation

Full documentation is available at [https://stockalert.pro/api/docs](https://stockalert.pro/api/docs)

## License

MIT
