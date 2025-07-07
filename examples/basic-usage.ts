import { StockAlert } from '@stockalert/sdk';

async function main() {
  // Initialize the client
  const client = new StockAlert({
    apiKey: process.env.STOCKALERT_API_KEY || 'sk_your_api_key'
  });

  try {
    // List all active alerts
    console.log('📋 Listing active alerts...');
    const alerts = await client.alerts.list({ status: 'active' });
    console.log(`Found ${alerts.data.length} active alerts`);
    
    // Create a new alert
    console.log('\n🚨 Creating new alert...');
    const newAlert = await client.alerts.create({
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 200,
      notification: 'email'
    });
    console.log(`Created alert ${newAlert.data.id} for ${newAlert.data.symbol}`);
    
    // Get alert details
    console.log('\n📖 Getting alert details...');
    const alertDetails = await client.alerts.get(newAlert.data.id);
    console.log(`Alert status: ${alertDetails.data.status}`);
    
    // Pause the alert
    console.log('\n⏸️  Pausing alert...');
    await client.alerts.pause(newAlert.data.id);
    console.log('Alert paused');
    
    // Reactivate the alert
    console.log('\n▶️  Reactivating alert...');
    await client.alerts.activate(newAlert.data.id);
    console.log('Alert reactivated');
    
    // Delete the alert
    console.log('\n🗑️  Deleting alert...');
    await client.alerts.delete(newAlert.data.id);
    console.log('Alert deleted');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();