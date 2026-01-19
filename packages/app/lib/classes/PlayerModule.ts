import type { SubscriptionLike } from 'rxjs';

import type Player from './Player';
import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface PlayerModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayerModuleOptions extends ModuleState {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayerModuleState extends ModuleState {}

export default abstract class PlayerModule<
  Options extends PlayerModuleOptions = PlayerModuleOptions,
  State extends PlayerModuleState = PlayerModuleState,
  Observables extends PlayerModuleObservables = PlayerModuleObservables
> extends Module<State, Observables> {
  constructor(
    public player: Player,
    public options: Options = {} as Options,
    state: State,
    debug?: boolean
  ) {
    super(state, debug);
  }

  override destroy() {
    super.destroy();
  }
}
