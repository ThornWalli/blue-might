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
  interface ModuleStates {
    faction: Partial<State>;
  }
  interface ModuleOptions {
    faction: Partial<Options>;
  }
  interface ModuleDebug {
    faction: boolean;
  }
}

interface Observables extends MapModuleObservables {
  add$: Subject<Faction>;
  factions$: ReplaySubject<Faction[]>;
}

interface Options extends MapModuleState {
  factions: FactionDescription[];
}
interface State extends MapModuleState {
  factions: Faction[];
}

export default class FactionModule extends MapModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'faction';
  readonly neutralFaction;

  constructor(map: Map, options: Options, states: State, debug: boolean) {
    const neutralFaction = new Faction(factions[FACTION.NEUTRAL]);
    super(
      map,
      options,
      {
        ...states,
        factions: [neutralFaction]
      },
      debug
    );
    //#region observables
    this.observables.factions$ = new ReplaySubject<Faction[]>(1);
    this.observables.add$ = new Subject<Faction>();
    //#endregion

    this.neutralFaction = neutralFaction;
    this.setFactions(this.options.factions);
  }

  override async setup() {
    await super.setup();
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

  override async getOptions() {
    return {
      factions: Object.values(this.getFactions())
        .filter(faction => !faction.builtin)
        .map(faction => faction.toDescription())
    };
  }
}
