import { ReplaySubject } from 'rxjs';
import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';
import type Unit from '../Unit';
import PlayerUnitModule from '../unitModule/Player';
import type MovableUnit from '../unit/Movable';

interface Observables extends PlayerModuleObservables {
  vehicle$: ReplaySubject<{
    current: Unit | null;
    last: Unit | null;
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

  constructor(player: Player, state: State, debug?: boolean) {
    super(player, state, debug);

    //#region observables
    this.observables.vehicle$ = new ReplaySubject<{
      current: Unit | null;
      last: Unit | null;
    }>();
    //#endregion
  }
  getVehicle() {
    return this.state.vehicle;
  }

  setVehicle(vehicle: MovableUnit | null) {
    const last = this.state.vehicle;
    last?.getModuleByType(PlayerUnitModule).setPlayer(null);

    this.state.vehicle = vehicle;

    vehicle?.getModuleByType(PlayerUnitModule).setPlayer(this.player);

    this.observables.vehicle$.next({ current: vehicle, last });
  }
}
