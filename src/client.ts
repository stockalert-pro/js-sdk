import { AlertsResource } from './resources/alerts';
import { WebhooksResource } from './resources/webhooks';
import { ApiKeysResource } from './resources/api-keys';
import { ValidationError } from './errors';
import type { StockAlertConfig } from './types';

const DEFAULT_BASE_URL = 'https://stockalert.pro/api/public/v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

export class StockAlert {
  public readonly alerts: AlertsResource;
  public readonly webhooks: WebhooksResource;
  public readonly apiKeys: ApiKeysResource;
  
  private readonly config: Required<StockAlertConfig>;

  constructor(config: StockAlertConfig) {
    if (!config.apiKey) {
      throw new ValidationError('API key is required');
    }

    if (!config.apiKey.startsWith('sk_') || config.apiKey.length < 10) {
      throw new ValidationError('Invalid API key format');
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: this.normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL),
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      debug: config.debug ?? false,
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

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<StockAlertConfig>> {
    return { ...this.config };
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }
}

export default StockAlert;
