#!/usr/bin/env tsx
import { StockAlert } from './src/index';

const API_KEY = 'sk_d4a622c84ff73395e4f828b2c7a2f4dec35c0cfcc599e369a20f608dcff1f614';
const BASE_URL = 'https://stockalert.pro';

const client = new StockAlert({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  debug: true
});

async function debugApi() {
  console.log('Testing /api/v1/alerts endpoint...\n');

  try {
    const response = await client.alerts.list();
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('Error:', error);
    if (error.response) {
      console.error('Response data:', error.response);
    }
  }
}

debugApi();
