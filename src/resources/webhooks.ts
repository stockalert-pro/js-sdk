import * as crypto from 'crypto';
import { BaseResource } from './base';
import { ValidationError } from '../errors';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    alert_id: string;
    symbol: string;
    condition: string;
    threshold: number;
    current_value: number;
    triggered_at: string;
    reason: string;
    parameters: Record<string, unknown> | null;
    test?: boolean;
  };
}

export class WebhooksResource extends BaseResource {
  /**
   * Verify webhook signature using HMAC-SHA256
   * 
   * @param payload - The raw webhook payload (as string)
   * @param signature - The signature from X-Webhook-Signature header
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
      typeof data['alert_id'] === 'string' &&
      typeof data['symbol'] === 'string' &&
      typeof data['condition'] === 'string' &&
      typeof data['threshold'] === 'number' &&
      typeof data['current_value'] === 'number' &&
      typeof data['triggered_at'] === 'string' &&
      typeof data['reason'] === 'string'
    );
  }
}
