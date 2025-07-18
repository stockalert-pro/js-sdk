import express from 'express';
import { WebhooksResource } from '@stockalert/sdk';
import type { WebhookPayload } from '@stockalert/sdk';

const app = express();

// Use raw body for signature verification
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-stockalert-signature'] as string;
  const secret = process.env.WEBHOOK_SECRET!;
  
  // Verify signature
  const isValid = WebhooksResource.verifySignature(
    req.body,
    signature,
    secret
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Parse payload
  const payload: WebhookPayload = JSON.parse(req.body.toString());
  
  // Handle different event types
  switch (payload.event) {
    case 'alert.triggered':
      console.log('🚨 Alert triggered!');
      console.log(`Stock: ${payload.data.symbol}`);
      console.log(`Condition: ${payload.data.condition}`);
      console.log(`Threshold: $${payload.data.threshold}`);
      console.log(`Current: $${payload.data.current_value}`);
      console.log(`Reason: ${payload.data.reason}`);
      
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