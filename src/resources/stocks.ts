import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type { ResourceResponse, Stock } from '../types';

export interface GetStockOptions {
  fields?: string[];
}

export class StocksResource extends BaseResource {
  retrieve(symbol: string, options?: GetStockOptions): Promise<Stock> {
    this.validateSymbol(symbol);
    const params =
      options?.fields && options.fields.length > 0
        ? { fields: options.fields.join(',') }
        : undefined;

    return this.unwrap(
      this.get<ResourceResponse<Stock>>(
        `/stocks/${encodeURIComponent(symbol.toUpperCase())}`,
        { params }
      )
    );
  }

  private validateSymbol(symbol: string): void {
    if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
      throw new ValidationError('Stock symbol is required');
    }
  }
}
