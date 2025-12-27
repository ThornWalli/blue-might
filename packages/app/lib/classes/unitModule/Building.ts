import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';

declare module '../Unit' {
  interface ModuleStates {
    building: Partial<BuildingUnitModuleState>;
  }
  interface ModuleOptions {
    building: Partial<BuildingUnitModuleOptions>;
  }
  interface ModuleDebug {
    building: boolean;
  }
}

export type BuildingUnitModuleOptions = UnitModuleOptions;
export type BuildingUnitModuleState = UnitModuleState;

export default class BuildingUnitModule extends UnitModule<
  BuildingUnitModuleOptions,
  BuildingUnitModuleState
> {
  static override TYPE = 'building';
}
