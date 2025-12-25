import { Subject } from 'rxjs';
import type Faction from '../Faction';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { FactionIdentifier } from '../Faction';

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
    factions: []
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
}
