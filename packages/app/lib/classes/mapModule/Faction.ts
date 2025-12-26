import { Subject } from 'rxjs';

import Faction from '../Faction';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { FactionIdentifier } from '../Faction';
import type Unit from '../Unit';

declare module '../Map' {
  interface ModuleDebug {
    faction: boolean;
  }
}

interface Observables extends MapModuleObservables {
  factionAdded$: Subject<Faction>;
}

interface State extends MapModuleState {
  factions: Faction[];
}

export default class FactionModule extends MapModule<State, Observables> {
  static override TYPE = 'faction';
  override state: State = {
    factions: [neutralFaction]
  };
  constructor(map: Map, debug: boolean) {
    super(map, debug);
    //#region observables
    this.observables.factionAdded$ = new Subject<Faction>();
    //#endregion
  }

  addFaction(faction: Faction) {
    this.state.factions.push(faction);
    this.observables.factionAdded$.next(faction);
  }

  getFactions() {
    return this.state.factions;
  }

  getFactionById(id: FactionIdentifier): Faction | undefined {
    return this.state.factions.find(faction => faction.id === id);
  }
  getNeutralFactions() {
    return [neutralFaction];
  }

  isFriend(unit: Unit, target: Unit) {
    const friendlyFactions = [
      neutralFaction,
      unit.modules.faction.getFaction()
    ];
    unit.modules.faction.getFaction();
    return friendlyFactions.includes(target.modules.faction.getFaction());
  }
}

function createNeutralFaction() {
  return new Faction({
    id: 'neutral',
    name: 'Neutral Faction',
    colors: [0x808080, 0xffffff]
  });
}

export const neutralFaction = createNeutralFaction();
