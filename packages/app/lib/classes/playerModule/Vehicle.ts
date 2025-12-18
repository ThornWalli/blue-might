import { ReplaySubject } from 'rxjs';
import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type MovableUnit from '../unit/Movable';
import type Player from '../Player';

interface Observables extends PlayerModuleObservables {
  vehicle$: ReplaySubject<{
    current: MovableUnit | null;
    last: MovableUnit | null;
  }>;
}

interface State extends PlayerModuleState {
  vehicle: MovableUnit | null;
}

export default class VehicleModule extends PlayerModule<State, Observables> {
  hasVehicle() {
    return this.state.vehicle !== null;
  }
  static override TYPE = 'vehicle';

  override state: State = {
    vehicle: null
  };

  constructor(player: Player, debug?: boolean) {
    super(player, {} as State, debug);

    //#region observables
    this.observables.vehicle$ = new ReplaySubject<{
      current: MovableUnit | null;
      last: MovableUnit | null;
    }>();
    //#endregion
  }
  getVehicle() {
    return this.state.vehicle;
  }

  setVehicle(vehicle: MovableUnit | null) {
    const last = this.state.vehicle;
    last?.modules.player.setPlayer(null);

    this.state.vehicle = vehicle;

    vehicle?.modules.player.setPlayer(this.player);

    this.observables.vehicle$.next({ current: vehicle, last });
  }
}
