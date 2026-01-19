import { ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleOptions,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';
import type Unit from '../Unit';
import type MovableUnit from '../unit/Movable';

interface Observables extends PlayerModuleObservables {
  unit$: ReplaySubject<Unit | null>;
}

type Options = PlayerModuleOptions;

interface State extends PlayerModuleState {
  unit: MovableUnit | null;
}

export default class MovablePlayerModule extends PlayerModule<
  Options,
  State,
  Observables
> {
  hasVehicle() {
    return this.state.unit !== null;
  }
  static override TYPE = 'vehicle';

  override state: State = {
    unit: null
  };

  constructor(player: Player, options: Options, state: State, debug?: boolean) {
    super(player, options, state, debug);

    //#region observables
    this.observables.unit$ = new ReplaySubject<Unit | null>();
    //#endregion
  }
  getUnit() {
    return this.state.unit;
  }

  setUnit(vehicle: MovableUnit | null) {
    if (this.state.unit === vehicle) return;
    const last = this.state.unit;
    last?.modules.player.setPlayer(null);

    this.state.unit = vehicle;

    vehicle?.modules.player.setPlayer(this.player);

    this.observables.unit$.next(vehicle);
  }
}
