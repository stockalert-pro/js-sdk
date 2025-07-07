# StockAlert.pro JavaScript/TypeScript SDK

Official SDK for the StockAlert.pro API.

## Installation

```bash
npm install @stockalert/sdk
```

## Quick Start

```typescript
import { StockAlert } from '@stockalert/sdk';

const client = new StockAlert({
  apiKey: 'sk_your_api_key'
});

// Create alert
const alert = await client.alerts.create({
  symbol: 'AAPL',
  condition: 'price_above',
  threshold: 200
});
```

## Documentation

Full documentation: [https://stockalert.pro/api/docs](https://stockalert.pro/api/docs)

## License

MIT