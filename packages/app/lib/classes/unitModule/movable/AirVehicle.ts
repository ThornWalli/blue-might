import { ReplaySubject } from 'rxjs';
import { Vector3 } from 'three';

import MovableUnitModule, {
  type MovableUnitModuleObservables,
  type MovableUnitModuleOptions,
  type MovableUnitModuleState
} from '../Movable';
import type LandingPortUnit from '../../unit/LandingPort';
import type AirVehicleUnit from '../../unit/vehicle/AirVehicle';

import { FLIGHT_STATUS } from './airVehicle/Helicopter';

const MIN_GEARS_ALTITUDE = 3 / 4;

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
  landingPort$: ReplaySubject<LandingPortUnit | null>;
}
export interface AirVehicleUnitModuleOptions extends MovableUnitModuleOptions {
  gearsHeight: number;
}
export interface AirVehicleUnitModuleState extends MovableUnitModuleState {
  tilt: Vector3; // x=pitch, y=unused, z=roll (right-handed; adjust as needed)
  yawVelocity?: number;
  gearsOpened: boolean;
  gearsActive: boolean;
  isAirborne?: boolean;
  flightStatus: FLIGHT_STATUS;
  landingPort: LandingPortUnit | null;
}

export default class AirVehicleUnitModule<
  Options extends AirVehicleUnitModuleOptions = AirVehicleUnitModuleOptions,
  State extends AirVehicleUnitModuleState = AirVehicleUnitModuleState,
  Observable extends AirVehicleUnitModuleObservables =
    AirVehicleUnitModuleObservables,
  U extends AirVehicleUnit = AirVehicleUnit
> extends MovableUnitModule<Options, State, Observable, U> {
  static override TYPE = 'airVehicle';

  private lastFlightStatus: FLIGHT_STATUS = FLIGHT_STATUS.LANDED;

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        gearsHeight: options.gearsHeight ?? 0
      } as Options,
      {
        ...state,
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        yawVelocity: state.yawVelocity ?? 0,
        flightStatus: FLIGHT_STATUS.LANDED,
        isAirborne: state.isAirborne ?? false,
        gearsActive: false,
        gearsOpened: state.gearsOpened ?? true,
        landingPort: state.landingPort ?? null
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
    this.observables.landingPort$ = new ReplaySubject<LandingPortUnit | null>(
      1
    );
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.observables.flightStatus$.subscribe(flightStatus =>
        this.getUnit().modules.player.setCanLeave(
          flightStatus === FLIGHT_STATUS.LANDED
        )
      )
    );
  }

  canToggleGears() {
    const unit = this.getUnit();
    const position = unit.getPosition();
    const groundHeight =
      this.getUnit()
        .getMap()
        ?.modules.surface.getSurfaceHeightAt(
          position.x,
          position.z,
          u => !u.equals(unit)
        ) ?? 0;
    return position.y - groundHeight > MIN_GEARS_ALTITUDE;
  }

  toggleGears() {
    if (
      !this.state.gearsActive &&
      this.state.flightStatus !== FLIGHT_STATUS.LANDED &&
      this.state.flightStatus !== FLIGHT_STATUS.LANDING
    ) {
      this.state.gearsActive = true;
      this.observables.gearsActive$.next(this.state.gearsActive);
    }
  }
  getGearsOpened() {
    return this.state.gearsOpened;
  }

  getGearsHeight() {
    return this.options.gearsHeight;
  }

  isGearsActive() {
    return this.state.gearsActive;
  }

  protected setGearsOpened(opened: boolean) {
    this.state.gearsActive = false;
    this.state.gearsOpened = opened;
    this.observables.gearsOpened$.next(this.state.gearsOpened);
    this.observables.gearsActive$.next(this.state.gearsActive);
    if (this.nextToggle && this.canToggleGears()) {
      this.nextToggle = false;
      this.toggleGears();
    }
  }

  private nextToggle: boolean = false;
  setNextToggle(value: boolean) {
    this.nextToggle = value;
  }

  getFlightStatus() {
    return this.state.flightStatus;
  }

  setFlightStatus(flightStatus: FLIGHT_STATUS) {
    if (this.state.flightStatus === flightStatus) return;
    this.lastFlightStatus = this.state.flightStatus;
    this.state.flightStatus = flightStatus;
    this.observables.flightStatus$.next(flightStatus);
  }

  getLastFlightStatus() {
    return this.lastFlightStatus;
  }

  getLandingPort() {
    return this.state.landingPort;
  }

  setLandingPort(landingPort: LandingPortUnit | null) {
    if (landingPort === this.state.landingPort) return;

    const last = this.state.landingPort;
    this.state.landingPort = landingPort;

    if (last && !landingPort) {
      last.modules.landingPort.setLandedUnit(null);
    }

    this.observables.landingPort$.next(landingPort);
  }

  getMaxPitch() {
    return Math.PI / 2;
  }

  getMaxRoll() {
    return Math.PI / 2;
  }

  getTilt() {
    return this.state.tilt;
  }
}
