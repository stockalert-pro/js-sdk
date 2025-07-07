import { AlertsResource } from './resources/alerts';
import { WebhooksResource } from './resources/webhooks';
import { ApiKeysResource } from './resources/api-keys';
import { ValidationError } from './errors';
import { checkBrowserSecurity, detectEnvironment } from './utils/environment';
import type { StockAlertConfig } from './types';

const DEFAULT_BASE_URL = 'https://stockalert.pro/api/public/v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

export interface StockAlertEvents {
  'request:start': (event: { method: string; path: string }) => void;
  'request:success': (event: { method: string; path: string; duration: number }) => void;
  'request:error': (event: { method: string; path: string; error: Error }) => void;
  'rate:limit': (event: { retryAfter: number }) => void;
}

export class StockAlert {
  public readonly alerts: AlertsResource;
  public readonly webhooks: WebhooksResource;
  public readonly apiKeys: ApiKeysResource;
  
  private readonly config: Required<StockAlertConfig>;
  private readonly environment = detectEnvironment();
  private readonly eventHandlers = new Map<keyof StockAlertEvents, Set<Function>>();

  constructor(config: StockAlertConfig) {
    if (!config.apiKey) {
      throw new ValidationError('API key is required');
    }

    if (!config.apiKey.startsWith('sk_') || config.apiKey.length < 10) {
      throw new ValidationError('Invalid API key format');
    }

    // Security check for browser environments
    checkBrowserSecurity(config.apiKey);

    this.config = {
      apiKey: config.apiKey,
      baseUrl: this.normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL),
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      debug: config.debug ?? false,
      userAgent: config.userAgent ?? '@stockalert/sdk/1.0.0',
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

    if (this.config.debug) {
      console.warn('[StockAlert SDK] Initialized in debug mode', {
        environment: this.environment,
        config: { ...this.config, apiKey: 'sk_***' }
      });
    }
  }

  /**
   * Get current configuration (with API key masked)
   */
  getConfig(): Readonly<Required<StockAlertConfig>> {
    return { 
      ...this.config,
      apiKey: this.maskApiKey(this.config.apiKey)
    };
  }

  /**
   * Subscribe to SDK events
   */
  on<E extends keyof StockAlertEvents>(
    event: E, 
    handler: StockAlertEvents[E]
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit an event to all handlers
   */
  protected emit<E extends keyof StockAlertEvents>(
    event: E,
    data: Parameters<StockAlertEvents[E]>[0]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as Function)(data);
        } catch (error) {
          console.error(`[StockAlert SDK] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return 'sk_***';
    return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}