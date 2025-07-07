// Branded types for better type safety
export type Brand<T, B> = T & { __brand: B };
export type AlertId = Brand<string, 'AlertId'>;
export type ApiKeyId = Brand<string, 'ApiKeyId'>;
export type UserId = Brand<string, 'UserId'>;

// Alert Types with proper discriminated unions
export type AlertConditionConfig = 
  | {
      condition: 'price_above' | 'price_below';
      threshold: number;
    }
  | {
      condition: 'price_change_up' | 'price_change_down';
      threshold: number; // percentage
    }
  | {
      condition: 'new_high' | 'new_low';
      threshold: number; // days (52-week high = 365)
    }
  | {
      condition: 'ma_crossover_golden' | 'ma_crossover_death';
      threshold?: never;
    }
  | {
      condition: 'ma_touch_above' | 'ma_touch_below';
      threshold: number;
      ma_period: 50 | 200;
    }
  | {
      condition: 'rsi_limit';
      threshold: number; // 0-100
      rsi_period?: number; // default 14
    }
  | {
      condition: 'reminder';
      threshold?: never;
      reminder_date: string; // ISO date
      reminder_time: string; // HH:MM
    }
  | {
      condition: 'daily_reminder';
      threshold?: never;
      reminder_time: string; // HH:MM
    }
  | {
      condition: 'volume_change';
      threshold: number; // percentage
    }
  | {
      condition: 'pe_ratio_below' | 'pe_ratio_above';
      threshold: number;
    };

export interface Alert {
  id: string; // Will be AlertId when fetched through SDK
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

export type AlertCondition = AlertConditionConfig['condition'];

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
  id: string; // Will be ApiKeyId when fetched through SDK
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  permissions: ApiKeyPermission[];
}

export type ApiKeyPermission = 'alerts:read' | 'alerts:write' | 'api_keys:read' | 'api_keys:write';

export interface CreateApiKeyRequest {
  name: string;
  permissions?: ApiKeyPermission[];
}

// Response Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  request_id?: string;
}

export interface DeleteResponse {
  message: string;
  id: string;
}

// Config Types
export interface StockAlertConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
  userAgent?: string;
}

// Internal Types
export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

// Error response types
export interface ErrorResponse {
  error: string;
  error_code?: string;
  status_code: number;
  request_id?: string;
  details?: Record<string, unknown>;
}

// Type Guards with better implementation
export function isAlert(obj: unknown): obj is Alert {
  if (!obj || typeof obj !== 'object') return false;
  
  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.symbol === 'string' &&
    typeof a.condition === 'string' &&
    typeof a.threshold === 'number' &&
    typeof a.notification === 'string' &&
    typeof a.status === 'string' &&
    typeof a.created_at === 'string' &&
    typeof a.updated_at === 'string'
  );
}

export function isApiError(error: unknown): error is ErrorResponse {
  if (!error || typeof error !== 'object') return false;
  
  const e = error as Record<string, unknown>;
  return (
    typeof e.error === 'string' &&
    typeof e.status_code === 'number'
  );
}

export function isPaginatedResponse<T>(
  obj: unknown,
  itemGuard: (item: unknown) => item is T
): obj is PaginatedResponse<T> {
  if (!obj || typeof obj !== 'object') return false;
  
  const r = obj as Record<string, unknown>;
  return (
    Array.isArray(r.data) &&
    r.data.every(itemGuard) &&
    typeof r.meta === 'object' &&
    r.meta !== null &&
    typeof (r.meta as any).total === 'number' &&
    typeof (r.meta as any).limit === 'number' &&
    typeof (r.meta as any).offset === 'number'
  );
}