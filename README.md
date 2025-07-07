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

- 🚀 Full TypeScript support
- 🔄 Automatic retries with exponential backoff
- 🛡️ Built-in request validation
- 📦 Small bundle size
- 🧪 Comprehensive test suite
- 📚 Detailed documentation

## Documentation

Full documentation is available at [https://stockalert.pro/api/docs](https://stockalert.pro/api/docs)

## License

MIT
