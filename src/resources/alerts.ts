import { BaseResource } from './base';
import type {
  Alert,
  CreateAlertRequest,
  UpdateAlertRequest,
  ListAlertsParams,
  PaginatedResponse,
} from '../types';

export class AlertsResource extends BaseResource {
  /**
   * List all alerts
   */
  async list(params?: ListAlertsParams): Promise<PaginatedResponse<Alert>> {
    return this.get<PaginatedResponse<Alert>>('/alerts', { params });
  }

  /**
   * Create a new alert
   */
  async create(data: CreateAlertRequest): Promise<Alert> {
    return this.post<Alert>('/alerts', data as Record<string, unknown>);
  }

  /**
   * Get a specific alert
   */
  async retrieve(id: string): Promise<Alert> {
    return this.get<Alert>(`/alerts/${id}`);
  }

  /**
   * Update an alert
   */
  async update(id: string, data: UpdateAlertRequest): Promise<Alert> {
    return this.put<Alert>(`/alerts/${id}`, data as Record<string, unknown>);
  }

  /**
   * Delete an alert
   */
  async remove(id: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/alerts/${id}`);
  }

  /**
   * Iterate through all alerts with automatic pagination
   */
  async *iterate(params?: ListAlertsParams): AsyncGenerator<Alert> {
    let offset = 0;
    const limit = params?.limit || 100;
    
    while (true) {
      const response = await this.list({ ...params, limit, offset });
      
      for (const alert of response.data) {
        yield alert;
      }
      
      if (response.data.length < limit) {
        break;
      }
      
      offset += limit;
    }
  }
}
