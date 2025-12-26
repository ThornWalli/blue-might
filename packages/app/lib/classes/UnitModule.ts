import type { Object3D } from 'three';

import type Unit from './Unit';
import type { SetupContext } from './Unit';
import type { SubscriptionLike } from 'rxjs';

import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface UnitModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnitModuleState extends ModuleState {
  // [key: string]: unknown;
}

export interface UnitModuleSetupContext extends SetupContext {
  root: Object3D;
  mesh: Object3D;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnitModuleOptions {}

export default abstract class UnitModule<
  Options extends UnitModuleOptions = UnitModuleOptions,
  State extends UnitModuleState = UnitModuleState,
  Obervables extends UnitModuleObservables = UnitModuleObservables,
  U extends Unit = Unit
> extends Module<State, Obervables> {
  static PREVIEW = true;

  constructor(
    private _unit: U,
    public options: Options = {} as Options,
    state: State = {} as State,
    debug?: boolean
  ) {
    super(state, debug);
  }

  getUnit() {
    return this._unit as U;
  }

  setupMesh(context: UnitModuleSetupContext) {
    return Promise.resolve(context.mesh);
  }

  getOptions() {
    return {
      ...this.options
    };
  }
}
