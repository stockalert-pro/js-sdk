import { AlertsResource } from './resources/alerts';
import { WebhooksResource } from './resources/webhooks';
import { ApiKeysResource } from './resources/api-keys';
import type { StockAlertConfig } from './types';
import { AuthenticationError } from './errors';

const DEFAULT_BASE_URL = 'https://stockalert.pro/api/public/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;

export class StockAlert {
  private config: Required<StockAlertConfig>;
  
  public readonly alerts: AlertsResource;
  public readonly webhooks: WebhooksResource;
  public readonly apiKeys: ApiKeysResource;

  constructor(config: StockAlertConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || DEFAULT_MAX_RETRIES,
    };

    // Initialize resources
    this.alerts = new AlertsResource(this.config);
    this.webhooks = new WebhooksResource(this.config);
    this.apiKeys = new ApiKeysResource(this.config);
  }

  /**
   * Update the API key at runtime
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<StockAlertConfig>> {
    return { ...this.config };
  }
}