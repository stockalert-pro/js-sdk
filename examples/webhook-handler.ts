import express from 'express';
import { WebhooksResource } from '@stockalert/sdk';
import type { WebhookEvent } from '@stockalert/sdk';

const app = express();

const webhookUtils = new WebhooksResource({
  apiKey: 'sk_placeholder',
  baseUrl: 'https://stockalert.pro/api/v1',
  timeout: 5000,
  maxRetries: 0,
  debug: false,
  userAgent: '@stockalert/sdk/webhook-handler'
} as any);

// Use raw body for signature verification
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-stockalert-signature'] as string;
  const timestamp = req.headers['x-stockalert-timestamp'] as string;
  const secret = process.env.WEBHOOK_SECRET!;
  
  // Verify signature
  const isValid = webhookUtils.verifySignature(
    req.body,
    signature,
    secret,
    timestamp
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Parse payload
  const payload: WebhookEvent = webhookUtils.parse(req.body);
  
  // Handle different event types
  switch (payload.event) {
    case 'alert.triggered':
      console.log('🚨 Alert triggered!');
      console.log(`Alert ID: ${payload.data.alert_id}`);
      console.log(`Symbol: ${payload.data.symbol}`);
      console.log(`Condition: ${payload.data.condition}`);
      console.log(`Threshold: ${payload.data.threshold}`);
      console.log(`Notification: ${payload.data.notification}`);
      console.log(`Status: ${payload.data.status}`);
      console.log(`Triggered at: ${payload.data.triggered_at}`);
      console.log(`Price: $${payload.data.price}`);

      // Your custom logic here
      // e.g., send notification, execute trade, update database, etc.

      break;

    default:
      console.log(`Unknown event type: ${payload.event}`);
  }
  
  // Always respond with 200 OK
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
