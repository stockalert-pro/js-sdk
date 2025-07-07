import { BaseResource } from './base';
import type {
  Webhook,
  CreateWebhookRequest,
  ApiResponse,
} from '../types';

export class WebhooksResource extends BaseResource {
  /**
   * List all webhooks
   */
  async list(): Promise<ApiResponse<Webhook[]>> {
    return this.request<ApiResponse<Webhook[]>>('/webhooks');
  }

  /**
   * Create a new webhook
   */
  async create(data: CreateWebhookRequest): Promise<ApiResponse<Webhook>> {
    return this.request<ApiResponse<Webhook>>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test a webhook (sends a test payload)
   */
  async test(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/webhooks/${id}/test`, {
      method: 'POST',
    });
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    if (typeof window !== 'undefined') {
      throw new Error('Webhook signature verification is only available in Node.js environment');
    }

    // This will only work in Node.js
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
}