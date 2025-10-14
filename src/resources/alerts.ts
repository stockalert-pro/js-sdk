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
   * @param params - Optional filter parameters
   * @returns Paginated list of alerts
   */
  list(params?: ListAlertsParams): Promise<PaginatedResponse<Alert>> {
    const sanitizedParams = params ? this.sanitizeListParams(params) : undefined;
    return this.get<PaginatedResponse<Alert>>('/api/v1/alerts', { params: sanitizedParams });
  }

  /**
   * Create a new alert
   * @param data - Alert configuration
   * @returns Created alert
   * @throws {ValidationError} If input validation fails
   */
  create(data: CreateAlertRequest): Promise<Alert> {
    this.validateCreateRequest(data);
    // Proper solution: convert to Record without type assertion
    return this.post<Alert>('/api/v1/alerts', this.toRecord(data));
  }

  /**
   * Get a specific alert by ID
   * @param id - Alert ID
   * @returns Alert details
   * @throws {ValidationError} If ID is invalid
   */
  retrieve(id: string): Promise<Alert> {
    this.validateId(id, 'Alert');
    return this.get<Alert>(`/api/v1/alerts/${encodeURIComponent(id)}`);
  }

  /**
   * Update an alert's status
   * @param id - Alert ID
   * @param data - Update data
   * @returns Updated alert
   * @throws {ValidationError} If input validation fails
   */
  update(id: string, data: UpdateAlertRequest): Promise<Alert> {
    this.validateId(id, 'Alert');
    this.validateUpdateRequest(data);
    return this.put<Alert>(`/api/v1/alerts/${encodeURIComponent(id)}`, this.toRecord(data));
  }

  /**
   * Delete an alert
   * @param id - Alert ID
   * @returns Deletion confirmation
   * @throws {ValidationError} If ID is invalid
   */
  remove(id: string): Promise<DeleteResponse> {
    this.validateId(id, 'Alert');
    return this.delete<DeleteResponse>(`/api/v1/alerts/${encodeURIComponent(id)}`);
  }

  /**
   * Pause an alert
   * @param id - Alert ID
   * @returns Updated alert
   * @throws {ValidationError} If ID is invalid
   */
  pause(id: string): Promise<Alert> {
    this.validateId(id, 'Alert');
    return this.post<Alert>(`/api/v1/alerts/${encodeURIComponent(id)}/pause`);
  }

  /**
   * Activate (reactivate) an alert
   * @param id - Alert ID
   * @returns Updated alert
   * @throws {ValidationError} If ID is invalid
   */
  activate(id: string): Promise<Alert> {
    this.validateId(id, 'Alert');
    return this.post<Alert>(`/api/v1/alerts/${encodeURIComponent(id)}/activate`);
  }

  /**
   * Get alert history
   * @param id - Alert ID
   * @param params - Optional pagination parameters
   * @returns Paginated alert history
   * @throws {ValidationError} If ID is invalid
   */
  history(id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<any>> {
    this.validateId(id, 'Alert');
    return this.get<PaginatedResponse<any>>(`/api/v1/alerts/${encodeURIComponent(id)}/history`, { params });
  }

  /**
   * Get alert statistics
   * @returns Alert statistics including status counts
   */
  stats(): Promise<{ statusCounts: Record<string, number>; total: number }> {
    return this.get<{ statusCounts: Record<string, number>; total: number }>('/api/v1/alerts/stats');
  }

  /**
   * Verify an alert via token (for guest alerts)
   * @param token - Verification token
   * @returns Verified alert
   */
  verify(token: string): Promise<Alert> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new ValidationError('Verification token is required');
    }
    return this.post<Alert>('/api/v1/alerts/verify', { token });
  }

  /**
   * Iterate through all alerts with automatic pagination
   * @param params - Optional filter parameters
   * @yields Individual alerts
   */
  async *iterate(params?: ListAlertsParams): AsyncGenerator<Alert, void, undefined> {
    let page = 1;
    const limit = Math.min(params?.limit ?? 100, 100); // Cap at 100 for performance
    const baseParams = params ? { ...params } : {};
    delete baseParams.limit;
    delete baseParams.page;

    while (true) {
      const response = await this.list({
        ...baseParams,
        limit,
        page
      });

      for (const alert of response.data) {
        yield alert;
      }

      // Check if we've reached the end
      if (response.data.length < limit ||
          (response.meta.pagination.totalPages !== undefined && page >= response.meta.pagination.totalPages)) {
        break;
      }

      page++;
    }
  }

  /**
   * Batch create multiple alerts
   * @param alerts - Array of alert configurations
   * @returns Array of created alerts
   */
  async createBatch(alerts: CreateAlertRequest[]): Promise<Alert[]> {
    // Validate all alerts first
    alerts.forEach((alert, index) => {
      try {
        this.validateCreateRequest(alert);
      } catch (error) {
        throw new ValidationError(`Alert at index ${index}: ${(error as Error).message}`);
      }
    });

    // Create alerts in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: Alert[] = [];
    
    for (let i = 0; i < alerts.length; i += concurrencyLimit) {
      const batch = alerts.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(alert => this.create(alert))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  private validateCreateRequest(data: CreateAlertRequest): void {
    if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') {
      throw new ValidationError('Symbol is required and must be a non-empty string');
    }
    
    if (!data.condition || typeof data.condition !== 'string' || data.condition.trim() === '') {
      throw new ValidationError('Condition is required and must be a non-empty string');
    }

    // Validate symbol format (basic check)
    if (!/^[A-Z]{1,5}$/.test(data.symbol.trim())) {
      throw new ValidationError('Symbol must be 1-5 uppercase letters');
    }

    // Validate notification channel if provided
    if (data.notification) {
      const validChannels = ['email', 'sms'];
      if (!validChannels.includes(data.notification)) {
        throw new ValidationError(`Notification must be one of: ${validChannels.join(', ')}`);
      }
    }

    // Validate condition-specific requirements
    this.validateConditionSpecificRequirements(data);
  }

  private validateConditionSpecificRequirements(data: CreateAlertRequest): void {
    const requiresThreshold = [
      'price_above', 'price_below', 'price_change_up', 'price_change_down',
      'new_high', 'new_low', 'ma_touch_above', 'ma_touch_below',
      'volume_change', 'rsi_limit', 'pe_ratio_below', 'pe_ratio_above',
      'forward_pe_below', 'forward_pe_above', 'earnings_announcement', 'dividend_ex_date'
    ];

    const noThreshold = [
      'ma_crossover_golden', 'ma_crossover_death', 'reminder', 'daily_reminder', 'dividend_payment'
    ];

    if (requiresThreshold.includes(data.condition)) {
      if (typeof data.threshold !== 'number' || isNaN(data.threshold) || !isFinite(data.threshold)) {
        throw new ValidationError(`${data.condition} requires a valid threshold value`);
      }
    }

    if (noThreshold.includes(data.condition) && data.threshold !== undefined) {
      throw new ValidationError(`${data.condition} does not use a threshold value`);
    }

    // Specific validations
    switch (data.condition) {
      case 'ma_touch_above':
      case 'ma_touch_below':
        if (!data.parameters?.ma_period) {
          throw new ValidationError(`${data.condition} requires ma_period parameter (50 or 200)`);
        }
        if (![50, 200].includes(data.parameters.ma_period as number)) {
          throw new ValidationError('ma_period must be either 50 or 200');
        }
        break;

      case 'rsi_limit':
        if (data.threshold !== undefined && (data.threshold < 0 || data.threshold > 100)) {
          throw new ValidationError('RSI threshold must be between 0 and 100');
        }
        break;

      case 'reminder':
        if (!data.parameters?.reminder_date || !data.parameters?.reminder_time) {
          throw new ValidationError('Reminder alerts require reminder_date and reminder_time parameters');
        }
        break;

      case 'daily_reminder':
        if (!data.parameters?.reminder_time) {
          throw new ValidationError('Daily reminder alerts require reminder_time parameter');
        }
        break;

      case 'price_change_up':
      case 'price_change_down':
      case 'volume_change':
        if (data.threshold !== undefined && data.threshold < 0) {
          throw new ValidationError(`${data.condition} threshold must be a positive percentage`);
        }
        break;
    }
  }

  private validateUpdateRequest(data: UpdateAlertRequest): void {
    // At least one field must be provided
    const hasField = data.condition !== undefined ||
                     data.threshold !== undefined ||
                     data.notification !== undefined ||
                     data.parameters !== undefined;

    if (!hasField) {
      throw new ValidationError('At least one field must be provided for update');
    }

    // Validate notification channel if provided
    if (data.notification !== undefined) {
      const validChannels = ['email', 'sms'];
      if (!validChannels.includes(data.notification)) {
        throw new ValidationError(`Notification must be one of: ${validChannels.join(', ')}`);
      }
    }

    // Validate condition if provided
    if (data.condition !== undefined && typeof data.condition !== 'string') {
      throw new ValidationError('Condition must be a string');
    }

    // Validate threshold if provided
    if (data.threshold !== undefined && (typeof data.threshold !== 'number' || isNaN(data.threshold) || !isFinite(data.threshold))) {
      throw new ValidationError('Threshold must be a valid number');
    }
  }

  private validateId(id: string, type: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`${type} ID is required`);
    }
    
    // Basic UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(`${type} ID must be a valid UUID`);
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
      sanitized['symbol'] = params.symbol.toUpperCase();
    }
    if (params.search !== undefined) {
      sanitized['search'] = params.search;
    }
    if (params.sortField !== undefined) {
      sanitized['sortField'] = params.sortField;
    }
    if (params.sortDirection !== undefined) {
      sanitized['sortDirection'] = params.sortDirection;
    }
    if (params.minimal !== undefined) {
      sanitized['minimal'] = params.minimal;
    }
    if (params.extended !== undefined) {
      sanitized['extended'] = params.extended;
    }
    if (typeof params.limit === 'number' && params.limit > 0 && params.limit <= 100) {
      sanitized['limit'] = Math.floor(params.limit);
    }
    if (typeof params.page === 'number' && params.page >= 1) {
      sanitized['page'] = Math.floor(params.page);
    }

    return sanitized;
  }

  // toRecord method is inherited from BaseResource
}
