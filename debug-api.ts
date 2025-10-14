#!/usr/bin/env tsx
/**
 * Debug API Test - Tests working endpoints only
 */

import { StockAlert } from './src/index';

const API_KEY = 'sk_d4a622c84ff73395e4f828b2c7a2f4dec35c0cfcc599e369a20f608dcff1f614';

const client = new StockAlert({
  apiKey: API_KEY,
  baseUrl: 'https://stockalert.pro',
  debug: true
});

async function debugTest() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   StockAlert SDK - Debug Test        ║');
  console.log('╚═══════════════════════════════════════╝\n');

  try {
    // Test 1: List alerts
    console.log('1. Testing alerts.list()...');
    const alerts = await client.alerts.list({ limit: 5 });
    console.log('✅ Success!');
    console.log(`   Found ${alerts.data.length} alerts`);
    console.log(`   Pagination: page ${alerts.meta.pagination.page}/${alerts.meta.pagination.totalPages}, total: ${alerts.meta.pagination.total}`);
    console.log(`   Rate Limit: ${alerts.meta.rateLimit.remaining}/${alerts.meta.rateLimit.limit}`);

    if (alerts.data.length > 0) {
      const firstAlert = alerts.data[0];

      // Test 2: Retrieve specific alert
      console.log(`\n2. Testing alerts.retrieve('${firstAlert.id}')...`);
      const alert = await client.alerts.retrieve(firstAlert.id);
      console.log('✅ Success!');
      console.log(`   Symbol: ${alert.symbol}`);
      console.log(`   Condition: ${alert.condition}`);
      console.log(`   Status: ${alert.status}`);
      if (alert.stock) {
        console.log(`   Stock: ${alert.stock.name} @ $${alert.stock.last_price}`);
      }

      // Test 3: Pause alert
      console.log(`\n3. Testing alerts.pause('${firstAlert.id}')...`);
      try {
        const pausedAlert = await client.alerts.pause(firstAlert.id);
        console.log('✅ Success!');
        console.log(`   Status: ${pausedAlert.status}`);

        // Test 4: Activate alert again
        console.log(`\n4. Testing alerts.activate('${firstAlert.id}')...`);
        const activatedAlert = await client.alerts.activate(firstAlert.id);
        console.log('✅ Success!');
        console.log(`   Status: ${activatedAlert.status}`);
      } catch (error: any) {
        console.log(`⚠️  Pause/Activate skipped: ${error.message}`);
      }

      // Test 5: Get alert history
      console.log(`\n5. Testing alerts.history('${firstAlert.id}')...`);
      try {
        const history = await client.alerts.history(firstAlert.id, { page: 1, limit: 5 });
        console.log('✅ Success!');
        console.log(`   Found ${history.data.length} history entries`);
        console.log(`   Pagination: page ${history.meta.pagination.page}/${history.meta.pagination.totalPages}`);
      } catch (error: any) {
        console.log(`⚠️  History skipped: ${error.message}`);
      }
    }

    // Test 6: List with filters
    console.log('\n6. Testing alerts.list() with filters...');
    const filteredAlerts = await client.alerts.list({
      status: 'active',
      limit: 3,
      sortDirection: 'desc'
    });
    console.log('✅ Success!');
    console.log(`   Found ${filteredAlerts.data.length} active alerts`);

    // Test 7: Create, update, and delete alert
    console.log('\n7. Testing CRUD operations...');
    console.log('   Creating test alert...');
    const newAlert = await client.alerts.create({
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 200,
      notification: 'email'
    });
    console.log(`   ✅ Created alert ${newAlert.id}`);
    console.log(`      Symbol: ${newAlert.symbol}, Threshold: ${newAlert.threshold}`);

    console.log(`\n   Updating alert...`);
    const updatedAlert = await client.alerts.update(newAlert.id, {
      threshold: 210
    });
    console.log(`   ✅ Updated alert`);
    console.log(`      New threshold: ${updatedAlert.threshold}`);

    console.log(`\n   Deleting alert...`);
    await client.alerts.remove(newAlert.id);
    console.log(`   ✅ Deleted alert ${newAlert.id}`);

    // Test 8: Webhooks
    console.log('\n8. Testing webhooks.list()...');
    try {
      const webhooks = await client.webhooks.list();
      console.log('✅ Success!');
      console.log(`   Found ${webhooks.length} webhooks`);
    } catch (error: any) {
      console.log(`⚠️  Webhooks skipped: ${error.message}`);
    }

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   ✅ All tests completed!            ║');
    console.log('╚═══════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
    }
    process.exit(1);
  }
}

debugTest();
