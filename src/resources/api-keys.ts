import { BaseResource } from './base';
import type {
  ApiKey,
  CreateApiKeyRequest,
  PaginatedResponse,
} from '../types';

export class ApiKeysResource extends BaseResource {
  /**
   * List all API keys
   */
  async list(): Promise<PaginatedResponse<ApiKey>> {
    return this.get<PaginatedResponse<ApiKey>>('/api-keys');
  }

  /**
   * Create a new API key
   */
  async create(data: CreateApiKeyRequest): Promise<ApiKey> {
    return this.post<ApiKey>('/api-keys', data as Record<string, unknown>);
  }

  /**
   * Delete an API key
   */
  async remove(id: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/api-keys/${id}`);
  }
}
