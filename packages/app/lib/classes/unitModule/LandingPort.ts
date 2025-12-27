import { Object3D } from 'three';

import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';

declare module '../Unit' {
  interface ModuleStates {
    landingPort: Partial<LandingPortUnitModuleState>;
  }
  interface ModuleOptions {
    landingPort: Partial<LandingPortUnitModuleOptions>;
  }
  interface ModuleDebug {
    landingPort: boolean;
  }
}

export type LandingPortUnitModuleOptions = UnitModuleOptions;
export type LandingPortUnitModuleState = UnitModuleState;

export default class LandingPortUnitModule extends UnitModule<
  LandingPortUnitModuleOptions,
  LandingPortUnitModuleState
> {
  static override TYPE = 'landing_port';

  root: Object3D;

  constructor(
    unit: Unit,
    options: LandingPortUnitModuleOptions,
    state: LandingPortUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, state, debug);

    this.root = new Object3D();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const mesh = await super.setupMesh(context);
    this.root.add(mesh);
    return this.root;
  }
}
