import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type {
  ApiKey,
  CreateApiKeyRequest,
  PaginatedResponse,
  DeleteResponse,
} from '../types';

export class ApiKeysResource extends BaseResource {
  /**
   * List all API keys
   */
  list(): Promise<PaginatedResponse<ApiKey>> {
    return this.get<PaginatedResponse<ApiKey>>('/api-keys');
  }

  /**
   * Create a new API key
   */
  create(data: CreateApiKeyRequest): Promise<ApiKey> {
    this.validateCreateRequest(data);
    // Type assertion needed due to TypeScript limitations with index signatures
    return this.post<ApiKey>('/api-keys', data as unknown as Record<string, unknown>);
  }

  /**
   * Delete an API key
   */
  remove(id: string): Promise<DeleteResponse> {
    if (!id || id.trim() === '') {
      throw new ValidationError('API key ID is required');
    }
    return this.delete<DeleteResponse>(`/api-keys/${encodeURIComponent(id)}`);
  }

  private validateCreateRequest(data: CreateApiKeyRequest): void {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('API key name is required and must be a non-empty string');
    }
    
    if (data.permissions !== undefined && !Array.isArray(data.permissions)) {
      throw new ValidationError('Permissions must be an array');
    }
  }
}
