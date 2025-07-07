// Alert Types
export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  notification: NotificationChannel;
  status: AlertStatus;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  initial_price?: number;
  parameters?: AlertParameters;
}

export type AlertCondition = 
  | 'price_above'
  | 'price_below'
  | 'price_change_up'
  | 'price_change_down'
  | 'new_high'
  | 'new_low'
  | 'ma_crossover_golden'
  | 'ma_crossover_death'
  | 'ma_touch_above'
  | 'ma_touch_below'
  | 'rsi_limit'
  | 'reminder'
  | 'daily_reminder'
  | 'volume_change'
  | 'pe_ratio_below'
  | 'pe_ratio_above';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
export type AlertStatus = 'active' | 'paused' | 'triggered';

export interface AlertParameters {
  ma_period?: number;
  rsi_period?: number;
  rsi_threshold?: number;
  volume_threshold?: number;
  pe_ratio?: number;
  reminder_date?: string;
  reminder_time?: string;
  [key: string]: string | number | boolean | undefined;
}

// Request Types
export interface CreateAlertRequest {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  notification: NotificationChannel;
  parameters?: AlertParameters;
}

export interface UpdateAlertRequest {
  status: 'active' | 'paused';
}

export interface ListAlertsParams {
  status?: AlertStatus;
  condition?: AlertCondition;
  symbol?: string;
  limit?: number;
  offset?: number;
}

// API Key Types
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  permissions: string[];
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
}

// Response Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DeleteResponse {
  message: string;
}

// Config Types
export interface StockAlertConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
}

// Internal Types
export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
}

// Type Guards
export function isAlert(obj: unknown): obj is Alert {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'symbol' in obj &&
    'condition' in obj &&
    'threshold' in obj
  );
}

export function isApiError(error: unknown): error is { error: string; statusCode?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as Record<string, unknown>)['error'] === 'string'
  );
}
