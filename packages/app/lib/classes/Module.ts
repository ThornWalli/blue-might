import type { SubscriptionLike } from 'rxjs';
import { Subscription } from 'rxjs';
import type { AnimationLoopValue } from './Renderer';

export type ModuleObservables = {
  [key: string]: SubscriptionLike | unknown;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleState {}

export default class Module<
  State extends ModuleState = ModuleState,
  Observables extends ModuleObservables = ModuleObservables
> {
  static TYPE: string;

  static get TYPES() {
    const types = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current = this;

    while (current && current !== Function.prototype) {
      if (
        Object.prototype.hasOwnProperty.call(current, 'TYPE') &&
        current.TYPE
      ) {
        types.push(current.TYPE);
      }
      current = Object.getPrototypeOf(current);
    }

    return types;
  }

  protected state: State = {} as State;

  subscription = new Subscription();
  observables: Observables = {} as Observables;

  constructor(
    state: State,
    readonly debug: boolean = false
  ) {
    this.state = state;
  }
  async setup(): Promise<void> {
    // This method can be overridden by subclasses to set up specific handlers
    return;
  }

  async afterSetup(): Promise<void> {
    // This method can be overridden by subclasses to set up specific handlers
    return;
  }

  destroy() {
    Object.values(this.observables).forEach(o =>
      (o as SubscriptionLike).unsubscribe()
    );
    this.subscription.unsubscribe();
  }

  update(_v: AnimationLoopValue) {
    // This method can be overridden by subclasses to handle updates
  }

  getState() {
    return {
      ...this.state
    };
  }

  isForceUpdate() {
    return false;
  }
}
