import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';

declare module '../Unit' {
  interface ModuleStates {
    building: Partial<PlantUnitModuleState>;
  }
  interface ModuleOptions {
    building: Partial<PlantUnitModuleOptions>;
  }
  interface ModuleDebug {
    building: boolean;
  }
}

export type PlantUnitModuleOptions = UnitModuleOptions;
export type PlantUnitModuleState = UnitModuleState;

export default class PlantUnitModule extends UnitModule<
  PlantUnitModuleOptions,
  PlantUnitModuleState
> {
  static override TYPE = 'plant';
}
