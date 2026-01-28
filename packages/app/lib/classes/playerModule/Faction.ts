import { ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleOptions,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';
import type Faction from '../Faction';

interface Observables extends PlayerModuleObservables {
  faction$: ReplaySubject<Faction | null>;
}

type Options = PlayerModuleOptions;

interface State extends PlayerModuleState {
  faction: Faction | null;
}

export default class FactionPlayerModule extends PlayerModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'faction';

  constructor(player: Player, options: Options, state: State, debug?: boolean) {
    super(player, options, state, debug);

    //#region observables
    this.observables.faction$ = new ReplaySubject<Faction | null>();
    this.observables.faction$.next(this.state.faction);
    //#endregion
  }

  getFaction() {
    return this.state.faction;
  }

  setFaction(faction: Faction) {
    if (this.state.faction === faction) return;
    this.state.faction = faction;
    this.observables.faction$.next(faction);
  }
}
