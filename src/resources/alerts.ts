import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type {
  Alert,
  CreateAlertRequest,
  UpdateAlertRequest,
  ListAlertsParams,
  PaginatedResponse,
  DeleteResponse,
} from '../types';

export class AlertsResource extends BaseResource {
  /**
   * List all alerts with optional filtering
   */
  list(params?: ListAlertsParams): Promise<PaginatedResponse<Alert>> {
    const sanitizedParams = params ? this.sanitizeListParams(params) : undefined;
    return this.get<PaginatedResponse<Alert>>('/alerts', { params: sanitizedParams });
  }

  /**
   * Create a new alert
   */
  create(data: CreateAlertRequest): Promise<Alert> {
    this.validateCreateRequest(data);
    // Type assertion needed due to TypeScript limitations with index signatures
    return this.post<Alert>('/alerts', data as unknown as Record<string, unknown>);
  }

  /**
   * Get a specific alert by ID
   */
  retrieve(id: string): Promise<Alert> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Alert ID is required');
    }
    return this.get<Alert>(`/alerts/${encodeURIComponent(id)}`);
  }

  /**
   * Update an alert's status
   */
  update(id: string, data: UpdateAlertRequest): Promise<Alert> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Alert ID is required');
    }
    this.validateUpdateRequest(data);
    // Type assertion needed due to TypeScript limitations with index signatures
    return this.put<Alert>(`/alerts/${encodeURIComponent(id)}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Delete an alert
   */
  remove(id: string): Promise<DeleteResponse> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Alert ID is required');
    }
    return this.delete<DeleteResponse>(`/alerts/${encodeURIComponent(id)}`);
  }

  /**
   * Iterate through all alerts with automatic pagination
   */
  async *iterate(params?: ListAlertsParams): AsyncGenerator<Alert, void, undefined> {
    let offset = 0;
    const limit = params?.limit ?? 100;
    const baseParams = params ? { ...params } : {};
    delete baseParams.limit;
    delete baseParams.offset;
    
    while (true) {
      const response = await this.list({ 
        ...baseParams, 
        limit, 
        offset 
      });
      
      for (const alert of response.data) {
        yield alert;
      }
      
      if (response.data.length < limit || 
          (response.meta.total !== undefined && offset + limit >= response.meta.total)) {
        break;
      }
      
      offset += limit;
    }
  }

  private validateCreateRequest(data: CreateAlertRequest): void {
    if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') {
      throw new ValidationError('Symbol is required and must be a non-empty string');
    }
    
    if (!data.condition || typeof data.condition !== 'string' || data.condition.trim() === '') {
      throw new ValidationError('Condition is required and must be a non-empty string');
    }
    
    if (typeof data.threshold !== 'number' || isNaN(data.threshold)) {
      throw new ValidationError('Threshold is required and must be a number');
    }
    
    if (!data.notification || typeof data.notification !== 'string' || data.notification.trim() === '') {
      throw new ValidationError('Notification channel is required and must be a non-empty string');
    }
  }

  private validateUpdateRequest(data: UpdateAlertRequest): void {
    if (!data.status || !['active', 'paused'].includes(data.status)) {
      throw new ValidationError('Status must be either "active" or "paused"');
    }
  }

  private sanitizeListParams(
    params: ListAlertsParams
  ): Record<string, string | number | boolean | undefined> {
    const sanitized: Record<string, string | number | boolean | undefined> = {};
    
    if (params.status !== undefined) {
      sanitized['status'] = params.status;
    }
    if (params.condition !== undefined) {
      sanitized['condition'] = params.condition;
    }
    if (params.symbol !== undefined) {
      sanitized['symbol'] = params.symbol;
    }
    if (typeof params.limit === 'number') {
      sanitized['limit'] = params.limit;
    }
    if (typeof params.offset === 'number') {
      sanitized['offset'] = params.offset;
    }
    
    return sanitized;
  }
}
