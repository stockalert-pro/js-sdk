import { BaseResource } from './base';
import type { ApiResponse } from '../types';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit_tier: 'free' | 'premium';
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  id: string;
  apiKey: string; // Full key, only shown once
  name: string;
  created_at: string;
}

export class ApiKeysResource extends BaseResource {
  /**
   * List all API keys
   */
  async list(): Promise<ApiResponse<ApiKey[]>> {
    return this.request<ApiResponse<ApiKey[]>>('/api-keys');
  }

  /**
   * Create a new API key
   */
  async create(data: CreateApiKeyRequest): Promise<ApiResponse<CreateApiKeyResponse>> {
    return this.request<ApiResponse<CreateApiKeyResponse>>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an API key
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/api-keys?id=${id}`, {
      method: 'DELETE',
    });
  }
}