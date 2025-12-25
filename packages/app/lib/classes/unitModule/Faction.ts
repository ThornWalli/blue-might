import { Subject } from 'rxjs';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type Faction from '../Faction';

declare module '../Unit' {
  interface ModuleStates {
    faction: Partial<FactionUnitModuleState>;
  }
  interface ModuleOptions {
    faction: Partial<FactionUnitModuleOptions>;
  }
  interface ModuleDebug {
    faction: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  faction$: Subject<Faction>;
}
export type FactionUnitModuleOptions = UnitModuleOptions;
export interface FactionUnitModuleState extends UnitModuleState {
  faction: Faction;
}

export default class FactionUnitModule extends UnitModule<
  FactionUnitModuleOptions,
  FactionUnitModuleState,
  Observables
> {
  static override TYPE = 'faction';
  constructor(
    unit: Unit,
    options: FactionUnitModuleOptions,
    state: FactionUnitModuleState,
    debug?: boolean
  ) {
    super(unit, options, state, debug);
    //#region observables
    this.observables.faction$ = new Subject<Faction>();
    //#endregion
  }

  getFaction() {
    return this.state.faction;
  }

  setFaction(faction: Faction) {
    this.state.faction = faction;
    this.observables.faction$.next(faction);
  }
}
