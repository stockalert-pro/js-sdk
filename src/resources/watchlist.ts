import { BaseResource } from './base';
import { ValidationError } from '../errors';
import type {
  CreateWatchlistItemRequest,
  ListResponse,
  ResourceResponse,
  SwapIntentionRequest,
  UpdateWatchlistItemRequest,
  WatchlistDeleteData,
  WatchlistItemWithStock,
  WatchlistOrderData,
} from '../types';

export class WatchlistResource extends BaseResource {
  list(): Promise<ListResponse<WatchlistItemWithStock>> {
    return this.get<ListResponse<WatchlistItemWithStock>>('/watchlist');
  }

  create(data: CreateWatchlistItemRequest): Promise<WatchlistItemWithStock> {
    this.validateCreateRequest(data);
    return this.unwrap(
      this.post<ResourceResponse<WatchlistItemWithStock>>(
        '/watchlist',
        this.toRecord({
          ...data,
          stock_symbol: data.stock_symbol.toUpperCase(),
        })
      )
    );
  }

  update(id: string, data: UpdateWatchlistItemRequest): Promise<WatchlistItemWithStock> {
    this.validateId(id);
    this.validateUpdateRequest(data);
    return this.unwrap(
      this.patch<ResourceResponse<WatchlistItemWithStock>>(
        `/watchlist/${encodeURIComponent(id)}`,
        this.toRecord(data)
      )
    );
  }

  remove(id: string): Promise<WatchlistDeleteData> {
    this.validateId(id);
    return this.unwrap(
      this.delete<ResourceResponse<WatchlistDeleteData>>(
        `/watchlist/${encodeURIComponent(id)}`
      )
    );
  }

  swapIntention(data: SwapIntentionRequest): Promise<WatchlistOrderData> {
    this.validateSwapRequest(data);
    return this.unwrap(
      this.put<ResourceResponse<WatchlistOrderData>>(
        '/watchlist/order',
        this.toRecord({
          ...data,
          stock_symbol: data.stock_symbol.toUpperCase(),
        })
      )
    );
  }

  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Watchlist item ID is required');
    }
  }

  private validateCreateRequest(data: CreateWatchlistItemRequest): void {
    if (!data.stock_symbol || typeof data.stock_symbol !== 'string') {
      throw new ValidationError('stock_symbol is required');
    }
    if (!data.intention || !['buy', 'sell'].includes(data.intention)) {
      throw new ValidationError('intention must be either buy or sell');
    }
  }

  private validateUpdateRequest(data: UpdateWatchlistItemRequest): void {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('Provide at least one field to update');
    }
  }

  private validateSwapRequest(data: SwapIntentionRequest): void {
    if (!data.item_id || typeof data.item_id !== 'string') {
      throw new ValidationError('item_id is required');
    }
    if (!data.stock_symbol || typeof data.stock_symbol !== 'string') {
      throw new ValidationError('stock_symbol is required');
    }
    if (!['buy', 'sell'].includes(data.new_intention)) {
      throw new ValidationError('new_intention must be either buy or sell');
    }
  }
}
