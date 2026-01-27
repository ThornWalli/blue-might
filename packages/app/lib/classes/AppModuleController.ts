import { Subscription, type SubscriptionLike } from 'rxjs';

import type AppPlayground from './app/AppPlayground';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppModuleControllerState {}
export type AppModuleControllerObservables = {
  [key: string]: SubscriptionLike | unknown;
};
export default class AppModuleController<
  State extends AppModuleControllerState = AppModuleControllerState,
  Observables extends AppModuleControllerObservables =
    AppModuleControllerObservables
> {
  id: string = crypto.randomUUID();
  setup() {
    // throw new Error('Method not implemented.');
  }
  app: AppPlayground;
  state: State = {} as State;
  subscription: Subscription = new Subscription();
  observables: Observables = {} as Observables;

  constructor(app: AppPlayground) {
    this.app = app;
  }

  destroy() {
    this.subscription.unsubscribe();
    Object.values(this.observables).forEach(o =>
      (o as SubscriptionLike).unsubscribe()
    );
  }
}
