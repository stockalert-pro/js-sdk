import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type {
  ApiKeySummary,
  ApiKeyCreated,
  ApiKeyDeleteData,
  CreateApiKeyRequest,
  ListResponse,
  ResourceResponse,
} from '../types';

export class ApiKeysResource extends BaseResource {
  /**
   * List all API keys
   */
  list(): Promise<ListResponse<ApiKeySummary>> {
    return this.get<ListResponse<ApiKeySummary>>('/api-keys', {
      headers: this.requireBearerHeaders(),
    });
  }

  /**
   * Create a new API key
   */
  create(data: CreateApiKeyRequest): Promise<ApiKeyCreated> {
    this.validateCreateRequest(data);
    return this.unwrap(
      this.post<ResourceResponse<ApiKeyCreated>>(
        '/api-keys',
        this.toRecord(data),
        { headers: this.requireBearerHeaders() }
      )
    );
  }

  /**
   * Delete an API key
   */
  remove(id: string): Promise<ApiKeyDeleteData> {
    if (!id || id.trim() === '') {
      throw new ValidationError('API key ID is required');
    }
    return this.unwrap(
      this.delete<ResourceResponse<ApiKeyDeleteData>>(
        `/api-keys/${encodeURIComponent(id)}`,
        { headers: this.requireBearerHeaders() }
      )
    );
  }

  private validateCreateRequest(data: CreateApiKeyRequest): void {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('API key name is required and must be a non-empty string');
    }
  }

  private requireBearerHeaders(): Record<string, string> {
    const bearer = this.config.bearerToken;
    if (!bearer) {
      throw new ValidationError('API keys endpoints require Bearer token (Authorization header)');
    }
    return { Authorization: `Bearer ${bearer}` };
  }
}
