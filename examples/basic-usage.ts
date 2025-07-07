import { StockAlert } from '@stockalert/sdk';

async function main() {
  const client = new StockAlert({
    apiKey: process.env.STOCKALERT_API_KEY || 'sk_your_api_key'
  });

  try {
    // List all alerts
    const alerts = await client.alerts.list({
      status: 'active',
      limit: 20
    });
    console.log(`Found ${alerts.data.length} alerts`);

    // Create a new alert
    const newAlert = await client.alerts.create({
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 200,
      notification: 'email'
    });
    console.log(`Created alert: ${newAlert.id}`);

    // Get specific alert
    const alert = await client.alerts.retrieve(newAlert.id);
    console.log(`Alert status: ${alert.status}`);

    // Update alert
    const updated = await client.alerts.update(newAlert.id, {
      status: 'paused'
    });
    console.log(`Updated alert status: ${updated.status}`);

    // Delete alert
    await client.alerts.remove(newAlert.id);
    console.log('Alert deleted');

    // Iterate through all alerts
    console.log('\nIterating through all alerts:');
    for await (const alert of client.alerts.iterate()) {
      console.log(`- ${alert.symbol}: ${alert.condition} @ ${alert.threshold}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
