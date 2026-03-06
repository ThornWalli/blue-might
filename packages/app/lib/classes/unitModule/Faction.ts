import { EMPTY, ReplaySubject, switchMap } from 'rxjs';
import { Mesh, SkinnedMesh, type Object3D } from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type Faction from '../Faction';
import type { FactionIdentifier } from '../Faction';
import { FACTION } from '../../utils/factions';
import { replaceColors } from '../../utils/material';

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
  faction$: ReplaySubject<FactionIdentifier>;
}
export interface FactionUnitModuleOptions extends UnitModuleOptions {
  disabled?: boolean;
  faction: FactionIdentifier;
  friendlyFactions: FactionIdentifier[];
  /**
   * Wird Beispiel in der UnitPreview verwendet.
   */
  factionOverride?: Faction;
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
        disabled: options.disabled ?? false,
        faction: options.faction ?? FACTION.NEUTRAL,
        friendlyFactions: options.friendlyFactions ?? []
      },
      state,
      debug
    );
    //#region observables
    this.observables.faction$ = new ReplaySubject<FactionIdentifier>();
    this.observables.faction$.next(this.options.faction);
    //#endregion
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    if (!this.options.disabled) {
      this.setupFactionColors(context.mesh);
    }
    return context.mesh;
  }

  public getFaction() {
    return (
      this.options.factionOverride ??
      this.getUnit()
        .getMap()
        ?.modules.faction.getFactionById(this.options.faction)
    );
  }

  public getFactionId() {
    return this.options.faction;
  }

  public setFaction(faction: FactionIdentifier | null) {
    this.options.faction = faction ?? FACTION.NEUTRAL;
    this.observables.faction$.next(this.options.faction);
  }

  public isFriendlyFaction(
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

  private setupFactionColors(object: Object3D) {
    this.subscription.add(
      this.getUnit()
        .observables.map$.pipe(
          switchMap(map => map?.modules.faction.observables.factions$ ?? EMPTY)
        )
        .subscribe(() => {
          useColors(object, this.getFaction()!);
        })
    );
    this.subscription.add(
      this.observables.faction$.subscribe(() => {
        useColors(object, this.getFaction()!);
      })
    );
  }

  override getOptions() {
    return {
      faction: this.options.faction
    };
  }
}

function useColors(object: Object3D, faction?: FactionDescription) {
  object.traverse(child => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      replaceColors(
        [
          ['primary', faction?.colors[0] ?? 0xf2f2f2],
          ['secondary', faction?.colors[1] ?? 0xf2f2f2]
        ],
        child
      );
    }
  });
}
