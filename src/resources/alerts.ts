import { BaseResource } from './base';
import type {
  Alert,
  CreateAlertRequest,
  UpdateAlertRequest,
  ListAlertsParams,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export class AlertsResource extends BaseResource {
  /**
   * List all alerts
   */
  async list(params: ListAlertsParams = {}): Promise<PaginatedResponse<Alert>> {
    const queryString = this.buildQueryString(params);
    return this.request<PaginatedResponse<Alert>>(`/alerts${queryString}`);
  }

  /**
   * Create a new alert
   */
  async create(data: CreateAlertRequest): Promise<ApiResponse<Alert>> {
    return this.request<ApiResponse<Alert>>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a specific alert
   */
  async get(id: string): Promise<ApiResponse<Alert>> {
    return this.request<ApiResponse<Alert>>(`/alerts/${id}`);
  }

  /**
   * Update an alert's status
   */
  async update(id: string, data: UpdateAlertRequest): Promise<ApiResponse<Alert>> {
    return this.request<ApiResponse<Alert>>(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an alert
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Pause an alert (convenience method)
   */
  async pause(id: string): Promise<ApiResponse<Alert>> {
    return this.update(id, { status: 'paused' });
  }

  /**
   * Activate an alert (convenience method)
   */
  async activate(id: string): Promise<ApiResponse<Alert>> {
    return this.update(id, { status: 'active' });
  }

  /**
   * List all alerts with automatic pagination
   */
  async *listAll(params: Omit<ListAlertsParams, 'page'> = {}): AsyncGenerator<Alert, void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.list({ ...params, page });
      
      for (const alert of response.data) {
        yield alert;
      }

      hasMore = page < response.pagination.totalPages;
      page++;
    }
  }
}