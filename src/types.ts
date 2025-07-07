export interface StockAlertConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export type AlertStatus = 'active' | 'paused' | 'triggered';
export type NotificationChannel = 'email' | 'sms';

export type AlertCondition = 
  | 'price_above' 
  | 'price_below' 
  | 'price_change_up' 
  | 'price_change_down' 
  | 'new_high' 
  | 'new_low'
  | 'reminder'
  | 'daily_reminder'
  | 'ma_crossover_golden'
  | 'ma_crossover_death'
  | 'ma_touch_above'
  | 'ma_touch_below'
  | 'volume_change'
  | 'rsi_limit'
  | 'pe_ratio_below'
  | 'pe_ratio_above'
  | 'forward_pe_below'
  | 'forward_pe_above'
  | 'earnings_announcement'
  | 'dividend_ex_date'
  | 'dividend_payment';

export interface CreateAlertRequest {
  symbol: string;
  condition: AlertCondition;
  threshold?: number;
  notification?: NotificationChannel;
  parameters?: Record<string, any>;
}

export interface UpdateAlertRequest {
  status: 'active' | 'paused';
}

export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number | null;
  notification: NotificationChannel;
  status: AlertStatus;
  created_at: string;
  initial_price: number;
  parameters: Record<string, any> | null;
  stocks?: {
    name: string;
    last_price: number;
  };
}

export interface ListAlertsParams {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  condition?: AlertCondition;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
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
    parameters: Record<string, any> | null;
  };
}