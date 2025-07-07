import { AlertsResource } from './resources/alerts';
import { WebhooksResource } from './resources/webhooks';
import { ApiKeysResource } from './resources/api-keys';
import type { StockAlertConfig } from './types';

export class StockAlert {
  public alerts: AlertsResource;
  public webhooks: WebhooksResource;
  public apiKeys: ApiKeysResource;
  
  private config: Required<StockAlertConfig>;

  constructor(config: StockAlertConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://stockalert.pro/api/public/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      debug: config.debug || false,
    };

    const resourceConfig = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      debug: this.config.debug,
    };

    this.alerts = new AlertsResource(resourceConfig);
    this.webhooks = new WebhooksResource(resourceConfig);
    this.apiKeys = new ApiKeysResource(resourceConfig);
  }
}
