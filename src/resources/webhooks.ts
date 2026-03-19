import * as crypto from 'crypto';
import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type {
  ListResponse,
  ResourceResponse,
  WebhookAlertData,
  WebhookEvent,
  WebhookEventData,
  WebhookEventName,
  WebhookStockData,
  WebhookEventType,
} from '../types';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: WebhookEventType[];
  is_active: boolean;
  created_at: string;
  last_triggered_at?: string;
  failure_count?: number;
  metadata?: Record<string, unknown>;
}

export interface WebhookCreated extends Webhook {
  secret: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEventType[];
  secret?: string;
}

export interface WebhookTestRequest {
  url: string;
  secret: string;
}

export interface WebhookTestResponse {
  status: number;
  status_text: string;
  response: string;
}

export type { WebhookEvent, WebhookPayload } from '../types';

const SUBSCRIBABLE_WEBHOOK_EVENTS: ReadonlyArray<WebhookEventType> = ['alert.triggered'];
const KNOWN_WEBHOOK_EVENT_NAMES: ReadonlyArray<WebhookEventName> = [
  'alert.triggered',
  'alert.paused',
  'alert.activated',
  'alert.deleted',
  'alert.created',
];
const KNOWN_ALERT_STATUSES = ['active', 'paused', 'triggered', 'inactive'] as const;
const KNOWN_NOTIFICATION_CHANNELS = ['email', 'sms'] as const;

export class WebhooksResource extends BaseResource {
  /**
   * List all webhooks
   * @returns List of webhooks
   */
  list(): Promise<ListResponse<Webhook>> {
    return this.get<ListResponse<Webhook>>('/webhooks');
  }

  /**
   * Create a new webhook
   * @param data - Webhook configuration
   * @returns Created webhook (includes secret)
   * @throws {ValidationError} If input validation fails
   */
  create(data: CreateWebhookRequest): Promise<WebhookCreated> {
    this.validateCreateRequest(data);
    const sanitizedEvents = Array.from(new Set(data.events));
    return this.unwrap(
      this.post<ResourceResponse<WebhookCreated>>(
        '/webhooks',
        this.toRecord({
          ...data,
          events: sanitizedEvents,
        })
      )
    );
  }

  /**
   * Get a specific webhook by ID
   * @param id - Webhook ID
   * @returns Webhook details
   * @throws {ValidationError} If ID is invalid
   */
  retrieve(id: string): Promise<Webhook> {
    this.validateId(id, 'Webhook');
    return this.unwrap(
      this.get<ResourceResponse<Webhook>>(`/webhooks/${encodeURIComponent(id)}`)
    );
  }

  /**
   * Delete a webhook
   * @param id - Webhook ID
   * @returns Deletion confirmation
   * @throws {ValidationError} If ID is invalid
   */
  remove(id: string): Promise<{ id: string }> {
    this.validateId(id, 'Webhook');
    return this.unwrap(
      this.delete<ResourceResponse<{ id: string }>>(
        `/webhooks/${encodeURIComponent(id)}`
      )
    );
  }

  /**
   * Test a webhook by sending a test event
   * @param data - Webhook URL and secret to test
   * @returns Test response
   */
  test(data: WebhookTestRequest): Promise<WebhookTestResponse> {
    if (!data.url || typeof data.url !== 'string') {
      throw new ValidationError('Webhook URL is required');
    }
    if (!data.secret || typeof data.secret !== 'string') {
      throw new ValidationError('Webhook secret is required');
    }
    return this.unwrap(
      this.post<ResourceResponse<WebhookTestResponse>>(
        '/webhooks/test',
        this.toRecord(data)
      )
    );
  }

  /**
   * Verify webhook signature using HMAC-SHA256.
   *
   * @param payload - Raw webhook payload; pass the exact body received.
   * @param signature - Signature string from the X-StockAlert-Signature header.
   * @param secret - Your webhook secret.
   * @param timestamp - Optional timestamp from the X-StockAlert-Timestamp header.
   * @returns true if signature is valid, false otherwise.
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
    timestamp?: number | string
  ): boolean {
    if (
      !payload ||
      typeof signature !== 'string' ||
      typeof secret !== 'string' ||
      signature.length === 0 ||
      secret.length === 0
    ) {
      return false;
    }

    try {
      const body =
        typeof payload === 'string' ? payload : payload.toString('utf8');
      const normalizedSignature = signature.startsWith('sha256=')
        ? signature.slice('sha256='.length)
        : signature;

      if (normalizedSignature.length === 0) {
        return false;
      }

      const normalizedTimestamp =
        timestamp === undefined || timestamp === null || `${timestamp}` === ''
          ? null
          : `${timestamp}`;
      const signingPayload =
        normalizedTimestamp !== null
          ? `${normalizedTimestamp}.${body}`
          : body;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signingPayload, 'utf8')
        .digest('hex');

      const provided = Buffer.from(normalizedSignature, 'hex');
      const expected = Buffer.from(expectedSignature, 'hex');

      if (provided.length !== expected.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        provided,
        expected
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse and validate webhook payload
   *
   * @param payload - The webhook payload (as string or object)
   * @returns Parsed and validated webhook payload
   * @throws ValidationError if payload is invalid
   */
  parse(payload: string | Buffer | object): WebhookEvent {
    let parsed: unknown = payload;

    if (Buffer.isBuffer(parsed)) {
      parsed = parsed.toString('utf8');
    }

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        throw new ValidationError('Invalid JSON payload');
      }
    }

    const normalized = this.normalizeWebhookEvent(parsed);
    if (!normalized) {
      throw new ValidationError('Invalid webhook payload structure');
    }

    return normalized;
  }

  private validateCreateRequest(data: CreateWebhookRequest): void {
    if (!data.url || typeof data.url !== 'string' || data.url.trim() === '') {
      throw new ValidationError('Webhook URL is required and must be a non-empty string');
    }

    // Validate URL format
    try {
      const url = new URL(data.url);
      if (url.protocol !== 'https:') {
        throw new ValidationError('Webhook URL must use HTTPS protocol');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid webhook URL format');
    }

    if (!Array.isArray(data.events) || data.events.length === 0) {
      throw new ValidationError('Events must include at least one value');
    }
    const invalidEvents = data.events.filter(
      event => !SUBSCRIBABLE_WEBHOOK_EVENTS.includes(event)
    );
    if (invalidEvents.length > 0) {
      throw new ValidationError(`Invalid events: ${invalidEvents.join(', ')}`);
    }
  }

  private validateId(id: string, type: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`${type} ID is required`);
    }

    // Basic UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(`${type} ID must be a valid UUID`);
    }
  }

  private normalizeWebhookEvent(payload: unknown): WebhookEvent | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    if (
      typeof payload.event !== 'string' ||
      !KNOWN_WEBHOOK_EVENT_NAMES.includes(payload.event as WebhookEventName)
    ) {
      return null;
    }

    const timestamp = this.normalizeTimestamp(payload.timestamp);
    if (timestamp === null || !this.isRecord(payload.data)) {
      return null;
    }

    const data =
      this.normalizeCurrentEventData(payload.data) ??
      this.normalizeLegacyEventData(payload.data);

    if (!data) {
      return null;
    }

    return {
      id: typeof payload.id === 'string' ? payload.id : undefined,
      event: payload.event as WebhookEventName,
      timestamp,
      data,
    };
  }

  private normalizeCurrentEventData(payload: Record<string, unknown>): WebhookEventData | null {
    if (!this.isRecord(payload.alert)) {
      return null;
    }

    const alert = this.normalizeAlertData(payload.alert);
    if (!alert) {
      return null;
    }

    if (payload.stock === undefined) {
      return { alert };
    }

    if (payload.stock === null) {
      return { alert, stock: null };
    }

    const stock = this.normalizeStockData(payload.stock);
    if (!stock) {
      return null;
    }

    return { alert, stock };
  }

  private normalizeLegacyEventData(payload: Record<string, unknown>): WebhookEventData | null {
    if (
      typeof payload.alert_id !== 'string' ||
      typeof payload.symbol !== 'string' ||
      typeof payload.condition !== 'string' ||
      typeof payload.status !== 'string'
    ) {
      return null;
    }

    const alert: WebhookAlertData = {
      id: payload.alert_id,
      symbol: payload.symbol,
      condition: payload.condition as WebhookAlertData['condition'],
      status: payload.status as WebhookAlertData['status'],
    };

    if (payload.threshold !== undefined) {
      if (payload.threshold !== null && typeof payload.threshold !== 'number') {
        return null;
      }
      alert.threshold = payload.threshold as number | null;
    }

    if (payload.notification !== undefined) {
      if (
        typeof payload.notification !== 'string' ||
        !KNOWN_NOTIFICATION_CHANNELS.includes(
          payload.notification as (typeof KNOWN_NOTIFICATION_CHANNELS)[number]
        )
      ) {
        return null;
      }
      alert.notification = payload.notification as WebhookAlertData['notification'];
    }

    if (payload.triggered_at !== undefined) {
      if (payload.triggered_at !== null && typeof payload.triggered_at !== 'string') {
        return null;
      }
      alert.triggered_at = payload.triggered_at as string | null;
    }

    const eventData: WebhookEventData = { alert };
    if (payload.price !== undefined) {
      if (payload.price !== null && typeof payload.price !== 'number') {
        return null;
      }
      eventData.stock = {
        symbol: payload.symbol,
        price: payload.price as number | null,
      };
    }

    return eventData;
  }

  private normalizeAlertData(payload: Record<string, unknown>): WebhookAlertData | null {
    if (
      typeof payload.id !== 'string' ||
      typeof payload.symbol !== 'string' ||
      typeof payload.condition !== 'string' ||
      typeof payload.status !== 'string' ||
      !KNOWN_ALERT_STATUSES.includes(payload.status as (typeof KNOWN_ALERT_STATUSES)[number])
    ) {
      return null;
    }

    const alert: WebhookAlertData = {
      id: payload.id,
      symbol: payload.symbol,
      condition: payload.condition as WebhookAlertData['condition'],
      status: payload.status as WebhookAlertData['status'],
    };

    if (payload.threshold !== undefined) {
      if (payload.threshold !== null && typeof payload.threshold !== 'number') {
        return null;
      }
      alert.threshold = payload.threshold as number | null;
    }

    if (payload.triggered_at !== undefined) {
      if (payload.triggered_at !== null && typeof payload.triggered_at !== 'string') {
        return null;
      }
      alert.triggered_at = payload.triggered_at as string | null;
    }

    if (payload.notification !== undefined) {
      if (
        typeof payload.notification !== 'string' ||
        !KNOWN_NOTIFICATION_CHANNELS.includes(
          payload.notification as (typeof KNOWN_NOTIFICATION_CHANNELS)[number]
        )
      ) {
        return null;
      }
      alert.notification = payload.notification as WebhookAlertData['notification'];
    }

    if (payload.triggered_value !== undefined) {
      if (payload.triggered_value !== null && typeof payload.triggered_value !== 'number') {
        return null;
      }
      alert.triggered_value = payload.triggered_value as number | null;
    }

    return alert;
  }

  private normalizeStockData(payload: unknown): WebhookStockData | null {
    if (!this.isRecord(payload) || typeof payload.symbol !== 'string') {
      return null;
    }

    const stock: WebhookStockData = {
      symbol: payload.symbol,
    };

    if (payload.price !== undefined) {
      if (payload.price !== null && typeof payload.price !== 'number') {
        return null;
      }
      stock.price = payload.price as number | null;
    }

    if (payload.change !== undefined) {
      if (payload.change !== null && typeof payload.change !== 'number') {
        return null;
      }
      stock.change = payload.change as number | null;
    }

    if (payload.change_percent !== undefined) {
      if (payload.change_percent !== null && typeof payload.change_percent !== 'number') {
        return null;
      }
      stock.change_percent = payload.change_percent as number | null;
    }

    return stock;
  }

  private normalizeTimestamp(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
