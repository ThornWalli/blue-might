import { Subject, ReplaySubject } from 'rxjs';

import Faction from '../Faction';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { FactionDescription, FactionIdentifier } from '../Faction';
import type Unit from '../Unit';
import factions, { FACTION } from '../../utils/factions';

declare module '../Map' {
  interface ModuleDebug {
    faction: boolean;
  }
}

interface Observables extends MapModuleObservables {
  add$: Subject<Faction>;
  factions$: ReplaySubject<Faction[]>;
}

interface State extends MapModuleState {
  factions: Faction[];
}

export default class FactionModule extends MapModule<State, Observables> {
  static override TYPE = 'faction';
  readonly neutralFaction = new Faction(factions[FACTION.NEUTRAL]);
  override state: State = {
    factions: [this.neutralFaction]
  };
  constructor(map: Map, debug: boolean) {
    super(map, debug);
    //#region observables
    this.observables.factions$ = new ReplaySubject<Faction[]>(1);
    this.observables.add$ = new Subject<Faction>();
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.setFactions(this.map.description.factions);
  }

  addFaction(faction: Faction) {
    this.state.factions.push(faction);
    this.observables.add$.next(faction);
  }

  getFactions() {
    return this.state.factions;
  }
  setFactions(value: FactionDescription[]) {
    this.state.factions = [
      this.neutralFaction,
      ...value.map(faction => new Faction(faction))
    ];
    this.observables.factions$.next(this.state.factions);
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
