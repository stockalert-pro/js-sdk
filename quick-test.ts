#!/usr/bin/env tsx
import { StockAlert } from './src/index';

const API_KEY = 'sk_d4a622c84ff73395e4f828b2c7a2f4dec35c0cfcc599e369a20f608dcff1f614';

const client = new StockAlert({
  apiKey: API_KEY,
  baseUrl: 'https://stockalert.pro',
  debug: true
});

async function quickTest() {
  console.log('Quick API Test\n');

  try {
    console.log('1. Listing alerts...');
    const alerts = await client.alerts.list({ limit: 2 });
    console.log('✅ Success!');
    console.log(`   Type: ${typeof alerts}`);
    console.log(`   Has data: ${alerts.hasOwnProperty('data')}`);
    console.log(`   Has meta: ${alerts.hasOwnProperty('meta')}`);
    console.log(`   Data length: ${alerts.data?.length}`);
    console.log(`   Pagination:`, alerts.meta.pagination);
    console.log(`   Rate Limit:`, alerts.meta.rateLimit);

    console.log('\n2. Getting stats...');
    const stats = await client.alerts.stats();
    console.log('✅ Success!');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Status counts:`, stats.statusCounts);

    console.log('\n3. Creating test alert...');
    const newAlert = await client.alerts.create({
      symbol: 'TSLA',
      condition: 'price_above',
      threshold: 300,
      notification: 'email'
    });
    console.log('✅ Success!');
    console.log(`   ID: ${newAlert.id}`);
    console.log(`   Symbol: ${newAlert.symbol}`);
    console.log(`   Status: ${newAlert.status}`);

    console.log('\n4. Deleting test alert...');
    await client.alerts.remove(newAlert.id);
    console.log('✅ Deleted!');

    console.log('\n✅ All tests passed!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
    }
  }
}

quickTest();
