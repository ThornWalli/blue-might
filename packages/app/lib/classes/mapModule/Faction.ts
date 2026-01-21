import { Subject } from 'rxjs';

import Faction from '../Faction';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { FactionIdentifier } from '../Faction';
import type Unit from '../Unit';
import factions, { FACTION } from '../../utils/factions';

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
    factions: [new Faction(factions[FACTION.NEUTRAL])]
  };
  constructor(map: Map, debug: boolean) {
    super(map, debug);
    //#region observables
    this.observables.factionAdded$ = new Subject<Faction>();
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.map.description.factions.forEach(faction =>
      this.addFaction(new Faction(faction))
    );
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
    return [FACTION.NEUTRAL];
  }

  isFriend(unit: Unit, target: Unit) {
    const friendlyFactions = [
      FACTION.NEUTRAL,
      unit.modules.faction.getFaction()?.id
    ];
    return friendlyFactions.includes(target.modules.faction.getFaction()?.id);
  }
}
