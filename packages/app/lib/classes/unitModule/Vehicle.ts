import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type VehicleUnit from '../unit/Vehicle';
import { ReplaySubject } from 'rxjs';

export interface PowerInfo {
  flightPower: number;
  currentPower: number;
  maxPower: number;
  minPower: number;
  idlePower: number;
}

export interface VehicleUnitModuleObservables extends UnitModuleObservables {
  active$: ReplaySubject<boolean>;
  powerInfo$: ReplaySubject<PowerInfo>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitModuleOptions extends UnitModuleOptions {}

export interface VehicleUnitModuleState extends UnitModuleState {
  active: boolean;
  rawPower: number;
  maxPower: number;
  minPower: number;
  idlePower: number;

  lastActive?: boolean;
  lastPower?: number;
}

export default class VehicleUnitModule<
  Options extends VehicleUnitModuleOptions = VehicleUnitModuleOptions,
  State extends VehicleUnitModuleState = VehicleUnitModuleState,
  Obervables extends
    VehicleUnitModuleObservables = VehicleUnitModuleObservables,
  U extends VehicleUnit = VehicleUnit
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'vehicle';

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options
      },
      {
        ...state,
        active: state.active ?? false,
        rawPower: state.rawPower ?? 0,
        maxPower: state.maxPower ?? 1,
        minPower: state.minPower ?? 0.4,
        idlePower: state.idlePower ?? 0.2
      },
      debug
    );

    //#region observables
    this.observables.active$ = new ReplaySubject<boolean>(1);
    this.observables.active$.next(this.state.active);
    this.observables.powerInfo$ = new ReplaySubject<PowerInfo>(1);
    this.observables.powerInfo$.next({
      flightPower: this.getCurrentPower(),
      currentPower: this.state.rawPower,
      maxPower: this.state.maxPower,
      minPower: this.state.minPower,
      idlePower: this.state.idlePower
    });
    //#endregion
  }

  getControls() {
    const unit = this.getUnit() as U;
    return (
      unit.modules.player.getPlayer()?.modules.controls.getControls() ?? {}
    );
  }

  override update({ delta: _delta }: AnimationLoopValue): void {
    // to be implemented by subclasses

    let currentPower = this.state.rawPower ?? 0;

    if (
      (!this.state.active && currentPower > 0) || // Off
      (this.state.active && currentPower < this.getMaxPower()) ||
      (this.state.active && currentPower > this.getMaxPower())
    ) {
      if (this.state.active) {
        if (currentPower > this.getMaxPower()) {
          currentPower = Math.max(
            (currentPower ?? 0) - 0.01,
            this.getMaxPower()
          );
        } else {
          currentPower = Math.min(
            (currentPower ?? 0) + 0.01,
            this.getMaxPower()
          );
        }
      } else {
        currentPower = Math.max(this.state.rawPower - 0.02, 0);
      }

      this.state.lastActive = this.state.active;
      this.state.lastPower = this.state.rawPower;
      this.state.rawPower = currentPower;

      this.observables.powerInfo$.next({
        flightPower: this.getCurrentPower(),
        currentPower: this.state.rawPower,
        maxPower: this.state.maxPower,
        minPower: this.state.minPower,
        idlePower: this.state.idlePower
      });
    }
  }

  hasMinPower() {
    return this.state.rawPower >= this.state.minPower;
  }

  getRawPower() {
    return this.state.rawPower;
  }

  getCurrentPower() {
    return (
      Math.max(this.state.rawPower - this.getMinPower(), 0) /
      (this.getMaxPower() - this.getMinPower())
    );
  }

  getMaxPower() {
    if (this.state.active) {
      return this.state.maxPower;
    }
    return 0;
  }

  getMinPower() {
    return this.state.minPower;
  }

  getActive() {
    return this.state.active;
  }

  setActive(value: boolean) {
    this.state.active = value;
    this.observables.active$.next(this.state.active);
  }
}
