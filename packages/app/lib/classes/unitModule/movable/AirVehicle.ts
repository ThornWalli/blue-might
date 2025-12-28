import { ReplaySubject } from 'rxjs';

import type MovableUnit from '../../unit/Movable';
import MovableUnitModule, {
  type MovableUnitModuleObservables,
  type MovableUnitModuleOptions,
  type MovableUnitModuleState
} from '../Movable';

import { FLIGHT_STATUS } from './airVehicle/Helicopter';

declare module '../../Unit' {
  interface ModuleStates {
    building: Partial<AirVehicleUnitModuleState>;
  }
  interface ModuleOptions {
    building: Partial<AirVehicleUnitModuleOptions>;
  }
  interface ModuleDebug {
    building: boolean;
  }
}

export interface AirVehicleUnitModuleObservables extends MovableUnitModuleObservables {
  flightStatus$: ReplaySubject<FLIGHT_STATUS>;
  gearsActive$: ReplaySubject<boolean>;
  gearsOpened$: ReplaySubject<boolean>;
}
export interface AirVehicleUnitModuleOptions extends MovableUnitModuleOptions {
  maxAltitude: number; // clamp altitude
  gearsHeight: number;
}
export interface AirVehicleUnitModuleState extends MovableUnitModuleState {
  gearsOpened: boolean;
  gearsActive: boolean;
  isAirborne?: boolean;
  flightStatus: FLIGHT_STATUS;
}

export const MAX_AIR_VEHICLE_ALTITUDE = 3;

export default class AirVehicleUnitModule<
  Options extends AirVehicleUnitModuleOptions = AirVehicleUnitModuleOptions,
  State extends AirVehicleUnitModuleState = AirVehicleUnitModuleState,
  Observable extends AirVehicleUnitModuleObservables =
    AirVehicleUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends MovableUnitModule<Options, State, Observable, U> {
  static override TYPE = 'airVehicle';

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        gearsHeight: options.gearsHeight ?? 0,
        maxAltitude: options.maxAltitude ?? MAX_AIR_VEHICLE_ALTITUDE
      } as Options,
      {
        ...state,
        flightStatus: FLIGHT_STATUS.LANDED,
        isAirborne: state.isAirborne ?? false,
        gearsActive: false,
        gearsOpened: state.gearsOpened ?? true
      } as State,
      debug
    );

    //#region observables
    this.observables.flightStatus$ = new ReplaySubject<FLIGHT_STATUS>(1);
    this.observables.flightStatus$.next(this.state.flightStatus);
    this.observables.gearsActive$ = new ReplaySubject<boolean>(1);
    this.observables.gearsActive$.next(this.state.gearsActive);
    this.observables.gearsOpened$ = new ReplaySubject<boolean>(1);
    this.observables.gearsOpened$.next(this.state.gearsOpened);
    //#endregion
  }

  toggleGears() {
    if (!this.state.gearsActive) {
      this.state.gearsActive = true;
      this.observables.gearsActive$.next(this.state.gearsActive);
      console.log('Toggling gears to', this.state.gearsActive);
    }
  }
  getGearsOpened() {
    return this.state.gearsOpened;
  }

  protected setGearsOpened(opened: boolean) {
    this.state.gearsActive = false;
    this.state.gearsOpened = opened;
    this.observables.gearsOpened$.next(this.state.gearsOpened);
    this.observables.gearsActive$.next(this.state.gearsActive);
  }

  getFlightStatus() {
    return this.state.flightStatus;
  }

  setFlightStatus(flightStatus: FLIGHT_STATUS) {
    if (this.state.flightStatus === flightStatus) return;
    this.state.flightStatus = flightStatus;
    this.observables.flightStatus$.next(flightStatus);
  }
}
