import { Subject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type Faction from '../Faction';
import type { FactionIdentifier } from '../Faction';
import { FACTION } from '../../utils/factions';

import type { FactionDescription } from './../Faction';

declare module '../Unit' {
  interface ModuleStates {
    faction: Partial<FactionUnitModuleState>;
    friendlyFactions: Faction[];
  }
  interface ModuleOptions {
    faction: Partial<FactionUnitModuleOptions>;
  }
  interface ModuleDebug {
    faction: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  faction$: Subject<FactionIdentifier>;
}
export interface FactionUnitModuleOptions extends UnitModuleOptions {
  faction: FactionIdentifier;
  friendlyFactions: FactionIdentifier[];
  /**
   * Wird Beispiel in der UnitPreview verwendet.
   */
  factionOverride?: FactionDescription;
}

export type FactionUnitModuleState = UnitModuleState;

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
    super(
      unit,
      {
        ...options,
        faction: options.faction ?? FACTION.NEUTRAL,
        friendlyFactions: options.friendlyFactions ?? []
      },
      state,
      debug
    );
    //#region observables
    this.observables.faction$ = new Subject<FactionIdentifier>();
    //#endregion
  }

  getFaction() {
    return (
      this.options.factionOverride ??
      this.getUnit()
        .getMap()
        ?.modules.faction.getFactionById(this.options.faction)
    );
  }

  getFactionId() {
    return this.options.faction;
  }

  setFaction(faction: FactionIdentifier) {
    this.options.faction = faction;
    this.observables.faction$.next(faction);
  }

  isFriendlyFaction(
    faction: Faction | FactionDescription | FactionIdentifier | undefined
  ) {
    if (faction && typeof faction !== 'string') {
      faction = faction.id;
    }
    const neutralFactions =
      this.getUnit().getMap()?.modules.faction.getNeutralFactions() ?? [];
    return (
      faction &&
      (neutralFactions.includes(faction as FACTION) ||
        this.options.faction === faction ||
        this.options.friendlyFactions.includes(faction))
    );
  }
}
