// Shared utility types
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

// Branded identifiers
export type Brand<T, B> = T & { __brand: B };
export type AlertId = Brand<string, 'AlertId'>;
export type ApiKeyId = Brand<string, 'ApiKeyId'>;
export type UserId = Brand<string, 'UserId'>;

// Alerts
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

export type AlertStatus = 'active' | 'paused' | 'triggered' | 'inactive';
export type NotificationChannel = 'email' | 'sms';

export interface AlertParameters {
  ma_period?: number;
  rsi_period?: number;
  rsi_threshold?: number;
  volume_threshold?: number;
  reminder_date?: string;
  reminder_time?: string;
  [key: string]: JsonValue | undefined;
}

export interface AlertStockSnapshot {
  name?: string;
  last_price?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
  rsi?: number | null;
  ma_50?: number | null;
  ma_200?: number | null;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold?: number | null;
  notification: NotificationChannel;
  status: AlertStatus;
  created_at: string;
  triggered_at?: string | null;
  initial_price?: number | null;
  parameters?: AlertParameters | null;
  stock?: AlertStockSnapshot | null;
  email?: string | null;
  user_id?: string | null;
  verified?: boolean;
  verification_token?: string | null;
  last_evaluated_at?: string | null;
  last_metric_value?: number | null;
}

export interface CreateAlertRequest {
  symbol: string;
  condition: AlertCondition;
  email?: string;
  threshold?: number | null;
  notification?: NotificationChannel;
  parameters?: AlertParameters;
}

export interface UpdateAlertRequest {
  condition?: AlertCondition;
  threshold?: number | null;
  notification?: NotificationChannel;
  parameters?: AlertParameters | null;
}

export interface ListAlertsParams {
  status?: AlertStatus;
  condition?: AlertCondition;
  symbol?: string;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  minimal?: boolean;
  extended?: boolean;
  limit?: number;
  page?: number;
}

export interface AlertHistory {
  alert_id: string;
  user_id?: string | null;
  email?: string | null;
  symbol: string;
  action_type: 'created' | 'deleted' | 'triggered' | 'paused' | 'reactivated' | 'verified';
  action_timestamp: string;
  previous_status?: AlertStatus | null;
  new_status?: AlertStatus | 'deleted' | null;
  alert_data?: JsonObject | null;
  trigger_price?: number | null;
  notification_status?: string | null;
}

export interface AlertDeleteData {
  alert_id: string;
  status: 'deleted';
}

export interface AlertPauseData {
  alert_id: string;
  status: 'paused';
}

export interface AlertActivateData {
  alert_id: string;
  status: 'active';
  initial_price?: number | null;
}

export interface AlertStats {
  total: number;
  status_counts: Record<string, number>;
}

export interface AlertVerificationResult {
  alert_id: string;
  symbol: string;
}

// Stocks
export interface StockSummary {
  symbol: string;
  name?: string | null;
  last_price?: number | null;
  previous_close?: number | null;
  ma_50?: number | null;
  ma_200?: number | null;
  rsi?: number | null;
  type?: string | null;
  is_active: boolean;
}

export interface StockDetails {
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  isin?: string | null;
  alt_symbols?: JsonObject | null;
}

export interface Stock extends StockSummary {
  high_52w?: number | null;
  low_52w?: number | null;
  volume?: number | null;
  volume_ma_20?: number | null;
  volume_ma_100?: number | null;
  details?: StockDetails | null;
  fundamentals?: JsonObject | null;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type?: string | null;
  last_price?: number | null;
}

// Watchlist
export interface StockBrief {
  symbol: string;
  name: string;
  last_price?: number | null;
}

export interface WatchlistItem {
  id: string;
  stock_symbol: string;
  intention: 'buy' | 'sell';
  target_price?: number | null;
  notes?: string | null;
  initial_price?: number | null;
  auto_alerts_enabled: boolean;
  is_active?: boolean;
}

export interface WatchlistItemWithStock extends WatchlistItem {
  stocks?: StockBrief | null;
  active_alert_count?: number | null;
}

export interface CreateWatchlistItemRequest {
  stock_symbol: string;
  stock_name?: string;
  intention: 'buy' | 'sell';
  target_price?: number;
  notes?: string;
}

export interface UpdateWatchlistItemRequest {
  target_price?: number | null;
  notes?: string | null;
  is_active?: boolean;
  auto_alerts_enabled?: boolean;
}

export interface SwapIntentionRequest {
  item_id: string;
  new_intention: 'buy' | 'sell';
  stock_symbol: string;
}

export interface WatchlistDeleteData {
  deleted: boolean;
}

export interface WatchlistOrderData {
  item: WatchlistItemWithStock;
  deleted_alerts: number;
}

// API keys
export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_tier: 'basic' | 'premium';
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  rate_limit_tier: 'basic' | 'premium';
  api_key: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface ApiKeyDeleteData {
  id: string;
}

// Webhooks
export type WebhookEventType = 'alert.triggered';

export type WebhookEventName =
  | 'alert.triggered'
  | 'alert.paused'
  | 'alert.activated'
  | 'alert.deleted'
  | 'alert.created';

export interface WebhookEventData {
  alert_id: string;
  symbol: string;
  condition: AlertCondition;
  threshold?: number | null;
  notification: NotificationChannel;
  status: AlertStatus;
  triggered_at?: string | null;
  price?: number | null;
}

export interface WebhookEvent {
  id: string;
  event: WebhookEventName;
  timestamp: number;
  data: WebhookEventData;
}

export type WebhookPayload = WebhookEvent;

// User
export interface UserSubscription {
  id: string | null;
  account_type: 'basic' | 'premium' | 'early_bird';
  status: string;
  is_early_bird: boolean;
  is_early_bird_eligible: boolean;
  is_premium: boolean;
  cancel_at_period_end: boolean | null;
  quotas: {
    sms: number;
    whatsapp: number;
  };
  usage: {
    count: number;
  };
  current_period: {
    start: string | null;
    end: string | null;
  };
  alert_count: number;
  alert_quota: number | null;
  watchlist_items_count: number;
  watchlist_quota: number;
}

// Meta & envelopes
export interface MetaRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

export interface MetaPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponseMeta {
  pagination?: MetaPagination;
  rate_limit?: MetaRateLimit;
  [key: string]: unknown;
}

export interface ResourceResponse<T> {
  data: T;
  meta?: ApiResponseMeta;
}

export interface ListResponse<T> extends ResourceResponse<T[]> {}

export interface PaginatedResponse<T> extends ListResponse<T> {
  meta: {
    pagination: MetaPagination;
    rate_limit?: MetaRateLimit;
    [key: string]: unknown;
  };
}

export interface ApiErrorObject {
  code?: string;
  message: string;
  details?: JsonObject | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: ApiResponseMeta;
  error?: ApiErrorObject | string;
  error_code?: string;
  request_id?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorObject;
}

// Config
export interface StockAlertConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
  userAgent?: string;
  bearerToken?: string;
}

// Internal request options
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

// Type guards
export function isAlert(obj: unknown): obj is Alert {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.symbol === 'string' &&
    typeof a.condition === 'string' &&
    typeof a.notification === 'string' &&
    typeof a.status === 'string' &&
    typeof a.created_at === 'string'
  );
}

export function isApiError(error: unknown): error is ErrorResponse {
  if (!error || typeof error !== 'object') {
    return false;
  }

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
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const r = obj as Record<string, unknown>;
  if (!Array.isArray(r.data) || !r.data.every(itemGuard)) {
    return false;
  }

  if (typeof r.meta !== 'object' || r.meta === null) {
    return false;
  }

  const meta = r.meta as Record<string, unknown>;
  const pagination = meta.pagination as Record<string, unknown> | undefined;
  const rateLimit = meta.rate_limit as Record<string, unknown> | undefined;

  return (
    !!pagination &&
    typeof pagination.page === 'number' &&
    typeof pagination.limit === 'number' &&
    typeof pagination.total === 'number' &&
    typeof pagination.total_pages === 'number' &&
    (!rateLimit ||
      (typeof rateLimit.limit === 'number' &&
        typeof rateLimit.remaining === 'number' &&
        typeof rateLimit.reset === 'number'))
  );
}
