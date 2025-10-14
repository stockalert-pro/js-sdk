#!/usr/bin/env tsx
/**
 * Comprehensive API v1 Test Script
 * Tests all endpoints with the provided API key
 */

import { StockAlert } from './src/index';

const API_KEY = 'sk_d4a622c84ff73395e4f828b2c7a2f4dec35c0cfcc599e369a20f608dcff1f614';
const BASE_URL = 'https://stockalert.pro';

const client = new StockAlert({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  debug: true
});

let testAlertId: string | null = null;
let testWebhookId: string | null = null;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAlertsEndpoints() {
  console.log('\n🔍 Testing Alerts Endpoints...\n');

  try {
    // Test 1: List alerts
    console.log('1️⃣  Testing alerts.list()...');
    const allAlerts = await client.alerts.list();
    console.log(`✅ Found ${allAlerts.data.length} alerts`);
    console.log(`   Pagination: page ${allAlerts.meta.pagination.page}/${allAlerts.meta.pagination.totalPages}, total: ${allAlerts.meta.pagination.total}`);

    // Test 2: List with filters
    console.log('\n2️⃣  Testing alerts.list() with filters...');
    const filteredAlerts = await client.alerts.list({
      status: 'active',
      limit: 5,
      sortDirection: 'desc'
    });
    console.log(`✅ Found ${filteredAlerts.data.length} active alerts`);

    // Test 3: Create alert
    console.log('\n3️⃣  Testing alerts.create()...');
    const newAlert = await client.alerts.create({
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 200,
      notification: 'email'
    });
    testAlertId = newAlert.id;
    console.log(`✅ Created alert ${testAlertId}`);
    console.log(`   Symbol: ${newAlert.symbol}, Condition: ${newAlert.condition}, Threshold: ${newAlert.threshold}`);
    console.log(`   Status: ${newAlert.status}, Initial Price: ${newAlert.initial_price}`);

    await sleep(1000);

    // Test 4: Retrieve alert
    console.log('\n4️⃣  Testing alerts.retrieve()...');
    const retrievedAlert = await client.alerts.retrieve(testAlertId);
    console.log(`✅ Retrieved alert ${retrievedAlert.id}`);
    console.log(`   Symbol: ${retrievedAlert.symbol}, Status: ${retrievedAlert.status}`);
    if (retrievedAlert.stock) {
      console.log(`   Stock Info: ${retrievedAlert.stock.name}, Price: $${retrievedAlert.stock.last_price}`);
    }

    await sleep(1000);

    // Test 5: Update alert
    console.log('\n5️⃣  Testing alerts.update()...');
    const updatedAlert = await client.alerts.update(testAlertId, {
      threshold: 210,
      notification: 'email'
    });
    console.log(`✅ Updated alert ${updatedAlert.id}`);
    console.log(`   New threshold: ${updatedAlert.threshold}`);

    await sleep(1000);

    return true;
  } catch (error) {
    console.error('❌ Alerts endpoints test failed:', error);
    throw error;
  }
}

async function testNewAlertMethods() {
  console.log('\n🔍 Testing New Alert Methods...\n');

  if (!testAlertId) {
    console.log('⚠️  Skipping - no test alert available');
    return;
  }

  try {
    // Test 1: Pause alert
    console.log('1️⃣  Testing alerts.pause()...');
    const pausedAlert = await client.alerts.pause(testAlertId);
    console.log(`✅ Paused alert ${pausedAlert.id}`);
    console.log(`   Status: ${pausedAlert.status}`);

    await sleep(1000);

    // Test 2: Activate alert
    console.log('\n2️⃣  Testing alerts.activate()...');
    const activatedAlert = await client.alerts.activate(testAlertId);
    console.log(`✅ Activated alert ${activatedAlert.id}`);
    console.log(`   Status: ${activatedAlert.status}`);

    await sleep(1000);

    // Test 3: Get alert history
    console.log('\n3️⃣  Testing alerts.history()...');
    const history = await client.alerts.history(testAlertId, { page: 1, limit: 10 });
    console.log(`✅ Retrieved ${history.data.length} history entries`);
    if (history.data.length > 0) {
      console.log(`   Latest action: ${history.data[0].action_type} at ${history.data[0].action_timestamp}`);
    }

    await sleep(1000);

    // Test 4: Get stats
    console.log('\n4️⃣  Testing alerts.stats()...');
    const stats = await client.alerts.stats();
    console.log(`✅ Retrieved alert statistics`);
    console.log(`   Total alerts: ${stats.total}`);
    console.log(`   Status counts:`, stats.statusCounts);

    return true;
  } catch (error) {
    console.error('❌ New alert methods test failed:', error);
    throw error;
  }
}

async function testWebhooksEndpoints() {
  console.log('\n🔍 Testing Webhooks Endpoints...\n');

  try {
    // Test 1: List webhooks
    console.log('1️⃣  Testing webhooks.list()...');
    const allWebhooks = await client.webhooks.list();
    console.log(`✅ Found ${allWebhooks.length} webhooks`);

    // Test 2: Create webhook
    console.log('\n2️⃣  Testing webhooks.create()...');
    const newWebhook = await client.webhooks.create({
      url: 'https://example.com/webhook-test',
      events: ['alert.triggered']
    });
    testWebhookId = newWebhook.id;
    console.log(`✅ Created webhook ${testWebhookId}`);
    console.log(`   URL: ${newWebhook.url}`);
    console.log(`   Events: ${newWebhook.events.join(', ')}`);
    if (newWebhook.secret) {
      console.log(`   Secret: ${newWebhook.secret.substring(0, 20)}...`);
    }

    await sleep(1000);

    // Test 3: Retrieve webhook
    console.log('\n3️⃣  Testing webhooks.retrieve()...');
    const retrievedWebhook = await client.webhooks.retrieve(testWebhookId);
    console.log(`✅ Retrieved webhook ${retrievedWebhook.id}`);
    console.log(`   URL: ${retrievedWebhook.url}, Active: ${retrievedWebhook.is_active}`);

    await sleep(1000);

    return true;
  } catch (error) {
    console.error('❌ Webhooks endpoints test failed:', error);
    throw error;
  }
}

async function testWebhookSignature() {
  console.log('\n🔍 Testing Webhook Signature Verification...\n');

  try {
    const payload = JSON.stringify({
      event: 'alert.triggered',
      timestamp: new Date().toISOString(),
      data: {
        alert: {
          id: 'test-alert-id',
          symbol: 'AAPL',
          condition: 'price_above',
          threshold: 200,
          status: 'triggered'
        },
        stock: {
          symbol: 'AAPL',
          price: 201.5,
          change: 1.5,
          change_percent: 0.75
        }
      }
    });

    const secret = 'test-secret-key';

    // Generate signature
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Verify signature
    console.log('1️⃣  Testing webhook signature verification...');
    const isValid = client.webhooks.verifySignature(payload, expectedSignature, secret);
    console.log(`✅ Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);

    // Test with wrong signature
    const isInvalid = client.webhooks.verifySignature(payload, 'wrong-signature', secret);
    console.log(`✅ Wrong signature detected: ${!isInvalid ? 'CORRECTLY REJECTED' : 'ERROR'}`);

    // Test payload parsing
    console.log('\n2️⃣  Testing webhook payload parsing...');
    const parsed = client.webhooks.parse(payload);
    console.log(`✅ Parsed webhook payload`);
    console.log(`   Event: ${parsed.event}`);
    console.log(`   Alert Symbol: ${parsed.data.alert.symbol}`);
    console.log(`   Stock Price: $${parsed.data.stock.price}`);

    return true;
  } catch (error) {
    console.error('❌ Webhook signature test failed:', error);
    throw error;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    // Delete test webhook
    if (testWebhookId) {
      console.log('1️⃣  Deleting test webhook...');
      await client.webhooks.remove(testWebhookId);
      console.log(`✅ Deleted webhook ${testWebhookId}`);
      await sleep(1000);
    }

    // Delete test alert
    if (testAlertId) {
      console.log('\n2️⃣  Deleting test alert...');
      await client.alerts.remove(testAlertId);
      console.log(`✅ Deleted alert ${testAlertId}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   StockAlert.pro SDK v1 API - Comprehensive Tests    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results = {
    alertsEndpoints: false,
    newAlertMethods: false,
    webhooksEndpoints: false,
    webhookSignature: false,
    cleanup: false
  };

  try {
    // Test alerts endpoints
    results.alertsEndpoints = await testAlertsEndpoints();
    await sleep(2000);

    // Test new alert methods
    results.newAlertMethods = await testNewAlertMethods();
    await sleep(2000);

    // Test webhooks endpoints
    results.webhooksEndpoints = await testWebhooksEndpoints();
    await sleep(2000);

    // Test webhook signature verification
    results.webhookSignature = await testWebhookSignature();
    await sleep(2000);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    // Cleanup
    results.cleanup = await cleanup();
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Alerts Endpoints:        ${results.alertsEndpoints ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`New Alert Methods:       ${results.newAlertMethods ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Webhooks Endpoints:      ${results.webhooksEndpoints ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Webhook Signature:       ${results.webhookSignature ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Cleanup:                 ${results.cleanup ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = Object.values(results).every(r => r === true);

  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
