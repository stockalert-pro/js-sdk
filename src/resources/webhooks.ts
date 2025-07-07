import * as crypto from 'crypto';
import { BaseResource } from './base';

export class Webhooks extends BaseResource {
  /**
   * Verify webhook signature
   * @param payload - The raw webhook payload (as string)
   * @param signature - The signature from X-Webhook-Signature header
   * @param secret - Your webhook secret
   * @returns true if signature is valid
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse webhook payload
   * @param payload - The webhook payload (as string or object)
   * @returns Parsed webhook payload
   */
  parse(payload: string | object): WebhookPayload {
    if (typeof payload === 'string') {
      return JSON.parse(payload);
    }
    return payload as WebhookPayload;
  }
}

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
