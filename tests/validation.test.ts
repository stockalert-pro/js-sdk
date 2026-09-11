import { describe, expect, it } from 'vitest';
import { AlertsResource } from '../src/resources/alerts';

const alerts = new AlertsResource({
  apiKey: 'test',
  baseUrl: 'https://test.com',
  timeout: 30000,
  maxRetries: 3,
  debug: false,
  userAgent: '@stockalert/sdk/test',
} as any);

const validateCreateRequest = (data: unknown): void =>
  (alerts as any).validateCreateRequest(data);
const validateUpdateRequest = (data: unknown): void =>
  (alerts as any).validateUpdateRequest(data);
const validateId = (id: string, type: string): void =>
  (alerts as any).validateId(id, type);

describe('AlertsResource validation', () => {
  it('rejects invalid base fields', () => {
    expect(() =>
      validateCreateRequest({
        symbol: '',
        condition: 'price_above',
        threshold: 100,
        notification: 'email',
      })
    ).toThrow('Symbol is required and must be a non-empty string');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL!',
        condition: 'price_above',
        threshold: 100,
        notification: 'email',
      })
    ).toThrow('Symbol must be 1-10 chars: A-Z, 0-9, dot or hyphen');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: '',
        threshold: 100,
        notification: 'email',
      })
    ).toThrow('Condition is required and must be a non-empty string');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        notification: 'push',
      })
    ).toThrow('Notification must be one of: email, sms');
  });

  it('enforces threshold rules for current alert types', () => {
    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'price_above',
        notification: 'email',
      })
    ).toThrow('price_above requires a valid threshold value');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'new_high',
        notification: 'email',
      })
    ).not.toThrow();

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'daily_reminder',
        threshold: 10,
        notification: 'email',
      })
    ).toThrow('daily_reminder does not use a threshold value');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'earnings_announcement',
        notification: 'email',
      })
    ).toThrow('earnings_announcement requires a valid threshold value');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'ma_touch_above',
        threshold: 50,
        notification: 'email',
      })
    ).not.toThrow();

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'ma_touch_below',
        threshold: 12.5,
        notification: 'email',
      })
    ).toThrow('ma_touch_below requires a positive moving average period as threshold');
  });

  it('validates current parameter contracts', () => {
    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'reminder',
        threshold: 30,
        notification: 'email',
      })
    ).toThrow('Reminder alerts require reminder_date and reminder_time parameters');

    expect(() =>
      validateCreateRequest({
        symbol: 'AAPL',
        condition: 'daily_reminder',
        notification: 'email',
        parameters: { deliveryTime: 'market_open' },
      })
    ).not.toThrow();

    expect(() =>
      validateCreateRequest({
        symbol: 'KO',
        condition: 'dividend_payment',
        notification: 'email',
      })
    ).toThrow('Dividend payment alerts require a positive shares parameter');

    expect(() =>
      validateCreateRequest({
        symbol: 'KO',
        condition: 'dividend_payment',
        notification: 'email',
        parameters: { shares: 25 },
      })
    ).not.toThrow();

    expect(() =>
      validateCreateRequest({
        symbol: 'MSFT',
        condition: 'insider_transactions',
        threshold: 100000,
        notification: 'email',
        parameters: { direction: 'invalid' },
      })
    ).toThrow('insider_transactions direction must be buy, sell or both');

    expect(() =>
      validateCreateRequest({
        symbol: 'MSFT',
        condition: 'insider_transactions',
        threshold: 100000,
        notification: 'email',
        parameters: {
          direction: 'both',
          minExecutives: 2,
          windowDays: 14,
          openMarketOnly: true,
        },
      })
    ).not.toThrow();

    expect(() =>
      validateCreateRequest({
        symbol: 'TSLA',
        condition: 'social_buzz',
        notification: 'email',
      })
    ).toThrow('social_buzz direction must be rising or falling');

    expect(() =>
      validateCreateRequest({
        symbol: 'TSLA',
        condition: 'social_buzz',
        threshold: 10,
        notification: 'email',
        parameters: { direction: 'rising' },
      })
    ).toThrow('social_buzz does not use a threshold value');

    expect(() =>
      validateCreateRequest({
        symbol: 'TSLA',
        condition: 'social_buzz',
        notification: 'email',
        parameters: { direction: 'rising' },
      })
    ).not.toThrow();
  });

  it('validates update payloads', () => {
    expect(() => validateUpdateRequest({})).toThrow(
      'At least one field must be provided for update'
    );

    expect(() =>
      validateUpdateRequest({
        threshold: Number.NaN,
      })
    ).toThrow('Threshold must be a valid number');

    expect(() =>
      validateUpdateRequest({
        notification: 'push',
      })
    ).toThrow('Notification must be one of: email, sms');

    expect(() =>
      validateUpdateRequest({
        threshold: 125,
      })
    ).not.toThrow();

    expect(() =>
      validateUpdateRequest({
        parameters: { deliveryTime: 'after_market_close' },
      })
    ).not.toThrow();
  });

  it('validates alert identifiers', () => {
    expect(() => validateId('', 'Alert')).toThrow('Alert ID is required');
    expect(() => validateId('not-a-uuid', 'Alert')).toThrow(
      'Alert ID must be a valid UUID'
    );
    expect(() =>
      validateId('77b9c1a8-5a7e-4f1c-9b8a-6b2d5c1e2f33', 'Alert')
    ).not.toThrow();
  });
});
