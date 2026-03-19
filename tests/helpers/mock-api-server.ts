import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

const RATE_LIMIT_META = {
  limit: 1000,
  remaining: 999,
  reset: Date.now() + 60_000,
};

const STOCKS = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    last_price: 201.5,
    previous_close: 199.1,
    ma_50: 190.2,
    ma_200: 175.4,
    rsi: 61.2,
    is_active: true,
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    last_price: 180.0,
    previous_close: 182.2,
    ma_50: 177.3,
    ma_200: 168.1,
    rsi: 48.5,
    is_active: true,
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    last_price: 920.0,
    previous_close: 910.0,
    ma_50: 880.0,
    ma_200: 760.0,
    rsi: 69.5,
    is_active: true,
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    last_price: 430.0,
    previous_close: 428.0,
    ma_50: 420.0,
    ma_200: 390.0,
    rsi: 57.0,
    is_active: true,
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    last_price: 165.0,
    previous_close: 164.0,
    ma_50: 158.0,
    ma_200: 149.0,
    rsi: 55.1,
    is_active: true,
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    last_price: 182.0,
    previous_close: 180.0,
    ma_50: 176.0,
    ma_200: 162.0,
    rsi: 52.4,
    is_active: true,
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    last_price: 505.0,
    previous_close: 511.0,
    ma_50: 490.0,
    ma_200: 455.0,
    rsi: 49.2,
    is_active: true,
  },
} as const;

export const VALID_API_KEY = 'sk_test_integration_key_12345';

type AlertRecord = {
  id: string;
  symbol: string;
  condition: string;
  threshold: number | null;
  notification: 'email' | 'sms';
  status: 'active' | 'paused' | 'triggered' | 'inactive';
  created_at: string;
  triggered_at?: string | null;
  initial_price?: number | null;
  parameters?: Record<string, unknown> | null;
};

type AlertHistoryRecord = {
  alert_id: string;
  symbol: string;
  action_type: 'created' | 'deleted' | 'triggered' | 'paused' | 'reactivated';
  action_timestamp: string;
  previous_status?: string | null;
  new_status?: string | null;
};

type WebhookRecord = {
  id: string;
  user_id: string;
  url: string;
  events: ['alert.triggered'];
  is_active: boolean;
  created_at: string;
  secret: string;
};

type WatchlistRecord = {
  id: string;
  stock_symbol: string;
  intention: 'buy' | 'sell';
  target_price?: number | null;
  notes?: string | null;
  initial_price?: number | null;
  auto_alerts_enabled: boolean;
  is_active: boolean;
  stocks: {
    symbol: string;
    name: string;
    last_price?: number | null;
  };
  active_alert_count?: number | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json',
  });
  res.end(JSON.stringify(body));
}

function sendSuccess(
  res: ServerResponse,
  data: unknown,
  meta?: Record<string, unknown>,
): void {
  sendJson(res, 200, {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  sendJson(res, status, {
    success: false,
    error: {
      code,
      message,
    },
  });
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
    rate_limit: RATE_LIMIT_META,
  };
}

function stockPrice(symbol: string): number {
  return STOCKS[symbol as keyof typeof STOCKS]?.last_price ?? 100;
}

export interface MockApiServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

export async function startMockApiServer(): Promise<MockApiServer> {
  const alerts = new Map<string, AlertRecord>();
  const histories = new Map<string, AlertHistoryRecord[]>();
  const webhooks = new Map<string, WebhookRecord>();
  const watchlist = new Map<string, WatchlistRecord>();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const apiKey = req.headers['x-api-key'];
    const authKey = Array.isArray(apiKey) ? apiKey[0] : apiKey;

    if (authKey !== VALID_API_KEY) {
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/alerts') {
      const page = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const status = url.searchParams.get('status');
      const symbol = url.searchParams.get('symbol');
      const condition = url.searchParams.get('condition');

      const filtered = Array.from(alerts.values()).filter((alert) => {
        return (
          (!status || alert.status === status) &&
          (!symbol || alert.symbol === symbol) &&
          (!condition || alert.condition === condition)
        );
      });

      const offset = (page - 1) * limit;
      sendSuccess(
        res,
        filtered.slice(offset, offset + limit),
        paginationMeta(filtered.length, page, limit),
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/alerts') {
      const body = await readBody(req);
      const id = randomUUID();
      const symbol = String(body.symbol ?? '').toUpperCase();
      const alert: AlertRecord = {
        id,
        symbol,
        condition: String(body.condition),
        threshold:
          typeof body.threshold === 'number' ? body.threshold : body.threshold === null ? null : null,
        notification: body.notification === 'sms' ? 'sms' : 'email',
        status: 'active',
        created_at: nowIso(),
        initial_price: stockPrice(symbol),
        parameters:
          body.parameters && typeof body.parameters === 'object'
            ? (body.parameters as Record<string, unknown>)
            : null,
      };
      alerts.set(id, alert);
      histories.set(id, [
        {
          alert_id: id,
          symbol,
          action_type: 'created',
          action_timestamp: nowIso(),
          new_status: 'active',
        },
      ]);
      sendSuccess(res, alert, { rate_limit: RATE_LIMIT_META });
      return;
    }

    if (req.method === 'GET' && /^\/api\/v1\/alerts\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      const alert = alerts.get(id);
      if (!alert) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      sendSuccess(res, alert);
      return;
    }

    if (req.method === 'PUT' && /^\/api\/v1\/alerts\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      const existing = alerts.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      const body = await readBody(req);
      const updated: AlertRecord = {
        ...existing,
        ...(body.threshold !== undefined ? { threshold: body.threshold as number | null } : {}),
        ...(body.notification === 'email' || body.notification === 'sms'
          ? { notification: body.notification }
          : {}),
        ...(body.parameters && typeof body.parameters === 'object'
          ? { parameters: body.parameters as Record<string, unknown> }
          : {}),
      };
      alerts.set(id, updated);
      sendSuccess(res, updated);
      return;
    }

    if (req.method === 'POST' && /^\/api\/v1\/alerts\/[^/]+\/pause$/.test(url.pathname)) {
      const id = url.pathname.split('/')[4]!;
      const existing = alerts.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      existing.status = 'paused';
      histories.get(id)?.push({
        alert_id: id,
        symbol: existing.symbol,
        action_type: 'paused',
        action_timestamp: nowIso(),
        previous_status: 'active',
        new_status: 'paused',
      });
      sendSuccess(res, { alert_id: id, status: 'paused' });
      return;
    }

    if (req.method === 'POST' && /^\/api\/v1\/alerts\/[^/]+\/activate$/.test(url.pathname)) {
      const id = url.pathname.split('/')[4]!;
      const existing = alerts.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      existing.status = 'active';
      histories.get(id)?.push({
        alert_id: id,
        symbol: existing.symbol,
        action_type: 'reactivated',
        action_timestamp: nowIso(),
        previous_status: 'paused',
        new_status: 'active',
      });
      sendSuccess(res, { alert_id: id, status: 'active', initial_price: existing.initial_price ?? null });
      return;
    }

    if (req.method === 'GET' && /^\/api\/v1\/alerts\/[^/]+\/history$/.test(url.pathname)) {
      const id = url.pathname.split('/')[4]!;
      if (!alerts.has(id) && !histories.has(id)) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const page = Number(url.searchParams.get('page') ?? '1');
      const entries = histories.get(id) ?? [];
      const offset = (page - 1) * limit;
      sendSuccess(res, entries.slice(offset, offset + limit), paginationMeta(entries.length, page, limit));
      return;
    }

    if (req.method === 'DELETE' && /^\/api\/v1\/alerts\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      const existing = alerts.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Alert not found');
        return;
      }
      histories.get(id)?.push({
        alert_id: id,
        symbol: existing.symbol,
        action_type: 'deleted',
        action_timestamp: nowIso(),
        previous_status: existing.status,
        new_status: 'deleted',
      });
      alerts.delete(id);
      sendSuccess(res, { alert_id: id, status: 'deleted' });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/webhooks') {
      sendSuccess(res, Array.from(webhooks.values()), { rate_limit: RATE_LIMIT_META });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/webhooks') {
      const body = await readBody(req);
      const id = randomUUID();
      const record: WebhookRecord = {
        id,
        user_id: 'user_test',
        url: String(body.url),
        events: ['alert.triggered'],
        is_active: true,
        created_at: nowIso(),
        secret: `whsec_${randomUUID()}`,
      };
      webhooks.set(id, record);
      sendSuccess(res, record);
      return;
    }

    if (req.method === 'GET' && /^\/api\/v1\/webhooks\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      const webhook = webhooks.get(id);
      if (!webhook) {
        sendError(res, 404, 'NOT_FOUND', 'Webhook not found');
        return;
      }
      sendSuccess(res, webhook);
      return;
    }

    if (req.method === 'DELETE' && /^\/api\/v1\/webhooks\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      if (!webhooks.has(id)) {
        sendError(res, 404, 'NOT_FOUND', 'Webhook not found');
        return;
      }
      webhooks.delete(id);
      sendSuccess(res, { id });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/webhooks/test') {
      sendSuccess(res, {
        status: 200,
        status_text: 'OK',
        response: 'ok',
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/watchlist') {
      sendSuccess(res, Array.from(watchlist.values()), { rate_limit: RATE_LIMIT_META });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/watchlist') {
      const body = await readBody(req);
      const id = randomUUID();
      const symbol = String(body.stock_symbol ?? '').toUpperCase();
      const stock = STOCKS[symbol as keyof typeof STOCKS];
      const item: WatchlistRecord = {
        id,
        stock_symbol: symbol,
        intention: body.intention === 'sell' ? 'sell' : 'buy',
        target_price: typeof body.target_price === 'number' ? body.target_price : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        initial_price: stock?.last_price ?? 100,
        auto_alerts_enabled: body.auto_alerts_enabled !== false,
        is_active: true,
        stocks: {
          symbol,
          name: stock?.name ?? symbol,
          last_price: stock?.last_price ?? null,
        },
        active_alert_count: 0,
      };
      watchlist.set(id, item);
      sendSuccess(res, item);
      return;
    }

    if (req.method === 'PATCH' && /^\/api\/v1\/watchlist\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      const existing = watchlist.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Watchlist item not found');
        return;
      }
      const body = await readBody(req);
      const updated: WatchlistRecord = {
        ...existing,
        ...(body.target_price !== undefined ? { target_price: body.target_price as number | null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes as string | null } : {}),
        ...(body.auto_alerts_enabled !== undefined
          ? { auto_alerts_enabled: Boolean(body.auto_alerts_enabled) }
          : {}),
        ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
      };
      watchlist.set(id, updated);
      sendSuccess(res, updated);
      return;
    }

    if (req.method === 'DELETE' && /^\/api\/v1\/watchlist\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/').pop()!;
      if (!watchlist.has(id)) {
        sendError(res, 404, 'NOT_FOUND', 'Watchlist item not found');
        return;
      }
      watchlist.delete(id);
      sendSuccess(res, { deleted: true });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/v1/watchlist/order') {
      const body = await readBody(req);
      const id = String(body.item_id ?? '');
      const existing = watchlist.get(id);
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Watchlist item not found');
        return;
      }
      existing.intention = body.new_intention === 'buy' ? 'buy' : 'sell';
      watchlist.set(id, existing);
      sendSuccess(res, {
        item: existing,
        deleted_alerts: 0,
      });
      return;
    }

    if (req.method === 'GET' && /^\/api\/v1\/stocks\/[^/]+$/.test(url.pathname)) {
      const symbol = url.pathname.split('/').pop()!.toUpperCase();
      const stock = STOCKS[symbol as keyof typeof STOCKS];
      if (!stock) {
        sendError(res, 404, 'NOT_FOUND', 'Stock not found');
        return;
      }
      sendSuccess(res, stock);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/user/subscription') {
      sendSuccess(res, {
        id: 'sub_test',
        account_type: 'premium',
        status: 'active',
        is_early_bird: false,
        is_early_bird_eligible: false,
        is_premium: true,
        cancel_at_period_end: false,
        quotas: {
          sms: 100,
        },
        usage: {
          count: alerts.size,
        },
        current_period: {
          start: nowIso(),
          end: nowIso(),
        },
        alerts: {
          counts: {
            total: alerts.size,
            by_status: {
              active: Array.from(alerts.values()).filter((alert) => alert.status === 'active').length,
            },
          },
          quota: {
            limit: 100,
            remaining: Math.max(0, 100 - alerts.size),
            unlimited: false,
          },
        },
        watchlist_items_count: watchlist.size,
        watchlist_quota: 100,
      });
      return;
    }

    sendError(res, 404, 'NOT_FOUND', `Unhandled route: ${req.method} ${url.pathname}`);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    stop: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
