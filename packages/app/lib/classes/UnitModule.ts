import type { Object3D } from 'three';

import type Unit from './Unit';
import type { SetupContext } from './Unit';
import type { SubscriptionLike } from 'rxjs';

import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface UnitModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

export interface UnitModuleState extends ModuleState {
  [key: string]: unknown;
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
  constructor(
    private _unit: U,
    public options: Options = {} as Options,
    public override state: State = {} as State,
    debug?: boolean
  ) {
    super(debug);
  }

  getUnit() {
    return this._unit;
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
