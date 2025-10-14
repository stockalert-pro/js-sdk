import * as crypto from 'crypto';
import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type { DeleteResponse } from '../types';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret?: string; // Only returned on create
  is_active: boolean;
  created_at: string;
  last_triggered_at?: string;
  failure_count?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateWebhookRequest {
  url: string;
  events?: string[];
}

export interface WebhookTestRequest {
  url: string;
  secret: string;
}

export interface WebhookTestResponse {
  status: number;
  statusText: string;
  response: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    alert: {
      id: string;
      symbol: string;
      condition: string;
      threshold?: number;
      status: string;
    };
    stock: {
      symbol: string;
      price: number;
      change?: number;
      change_percent?: number;
    };
  };
}

export class WebhooksResource extends BaseResource {
  /**
   * List all webhooks
   * @returns List of webhooks
   */
  list(): Promise<Webhook[]> {
    return this.get<Webhook[]>('/api/v1/webhooks');
  }

  /**
   * Create a new webhook
   * @param data - Webhook configuration
   * @returns Created webhook (includes secret)
   * @throws {ValidationError} If input validation fails
   */
  create(data: CreateWebhookRequest): Promise<Webhook> {
    this.validateCreateRequest(data);
    return this.post<Webhook>('/api/v1/webhooks', this.toRecord(data));
  }

  /**
   * Get a specific webhook by ID
   * @param id - Webhook ID
   * @returns Webhook details
   * @throws {ValidationError} If ID is invalid
   */
  retrieve(id: string): Promise<Webhook> {
    this.validateId(id, 'Webhook');
    return this.get<Webhook>(`/api/v1/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * Delete a webhook
   * @param id - Webhook ID
   * @returns Deletion confirmation
   * @throws {ValidationError} If ID is invalid
   */
  remove(id: string): Promise<DeleteResponse> {
    this.validateId(id, 'Webhook');
    return this.delete<DeleteResponse>(`/api/v1/webhooks/${encodeURIComponent(id)}`);
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
    return this.post<WebhookTestResponse>('/api/v1/webhooks/test', this.toRecord(data));
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   *
   * @param payload - The raw webhook payload (as string)
   * @param signature - The signature from X-StockAlert-Signature header
   * @param secret - Your webhook secret
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    if (payload.length === 0 || signature.length === 0 || secret.length === 0) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
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
  parse(payload: string | object): WebhookPayload {
    let parsed: unknown;

    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new ValidationError('Invalid JSON payload');
      }
    } else {
      parsed = payload;
    }

    if (!this.isValidWebhookPayload(parsed)) {
      throw new ValidationError('Invalid webhook payload structure');
    }

    return parsed;
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

    // Validate events if provided
    if (data.events !== undefined) {
      if (!Array.isArray(data.events)) {
        throw new ValidationError('Events must be an array');
      }
      const validEvents = ['alert.triggered'];
      const invalidEvents = data.events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        throw new ValidationError(`Invalid events: ${invalidEvents.join(', ')}`);
      }
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

  private isValidWebhookPayload(payload: unknown): payload is WebhookPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const p = payload as Record<string, unknown>;

    if (typeof p['event'] !== 'string' || typeof p['timestamp'] !== 'string') {
      return false;
    }

    if (typeof p['data'] !== 'object' || p['data'] === null) {
      return false;
    }

    const data = p['data'] as Record<string, unknown>;

    return (
      typeof data['alert'] === 'object' && data['alert'] !== null &&
      typeof data['stock'] === 'object' && data['stock'] !== null
    );
  }
}
