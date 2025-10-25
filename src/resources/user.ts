import { BaseResource } from './base';
import type { ResourceResponse, UserSubscription } from '../types';

export class UserResource extends BaseResource {
  getSubscription(): Promise<UserSubscription> {
    return this.unwrap(
      this.get<ResourceResponse<UserSubscription>>('/user/subscription')
    );
  }
}
