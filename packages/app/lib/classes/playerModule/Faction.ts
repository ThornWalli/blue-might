import { ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';
import type Faction from '../Faction';

interface Observables extends PlayerModuleObservables {
  faction$: ReplaySubject<Faction>;
}

interface State extends PlayerModuleState {
  faction: Faction;
}

export default class FactionModule extends PlayerModule<State, Observables> {
  static override TYPE = 'faction';

  constructor(player: Player, state: State, debug?: boolean) {
    super(player, state, debug);

    //#region observables
    this.observables.faction$ = new ReplaySubject<Faction>();
    this.observables.faction$.next(this.state.faction);
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
