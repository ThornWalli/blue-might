import type { SubscriptionLike } from 'rxjs';

import type App from './App';
import type Player from './Player';
import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface AppModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppModuleState extends ModuleState {}

export default abstract class AppModule<
  State extends AppModuleState = AppModuleState,
  Observables extends AppModuleObservables = AppModuleObservables
> extends Module<State, Observables> {
  constructor(
    public app: App,
    state: State,
    debug?: boolean
  ) {
    super(state, debug);
  }

  /**
   * Wird aufgerufen, wenn über die Szene gehovert wird.
   * @returns boolean ob der Hover verarbeitet wurde (true) oder nicht (false), lässt alles andere ignorieren.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty-function
  onSceneHover(context: SceneSelectContext): void {}

  /**
   * Wird wenn in der Szene geklickt wird.
   * @returns boolean ob der Klick verarbeitet wurde (true) oder nicht (false), lässt alles andere ignorieren.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSceneSelect(context: SceneSelectContext): boolean {
    return false;
  }
}

export interface SceneSelectContext {
  player: Player;
}
