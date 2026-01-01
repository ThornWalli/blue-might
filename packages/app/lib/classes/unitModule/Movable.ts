/* eslint-disable complexity */
import { ReplaySubject, Subject, switchMap } from 'rxjs';
import { Vector3 } from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type MovableUnit from '../unit/Movable';
import {
  ControlAction,
  getDefaultControls,
  type ControlState
} from '../playerModule/Controls';

declare module '../Unit' {
  interface ModuleStates {
    movable: Partial<MovableUnitModuleState>;
  }
  interface ModuleOptions {
    movable: Partial<MovableUnitModuleOptions>;
  }
  interface ModuleDebug {
    movable: boolean;
  }
}

export interface PowerInfo {
  flightPower: number;
  currentPower: number;
  maxPower: number;
  minPower: number;
  idlePower: number;
}

export interface MovableUnitModuleObservables extends UnitModuleObservables {
  active$: ReplaySubject<boolean>;
  powerInfo$: ReplaySubject<PowerInfo>;
  fuel$: ReplaySubject<number>;
  move$: Subject<void>;
  rotate$: Subject<void>;
  stop$: Subject<void>;
}

export interface MovableUnitModuleOptions extends UnitModuleOptions {
  fuelConsumption: number;
  idleFuelConsumption: number;
  maxPower: number;
  minPower: number;
  idlePower: number;
  maxFuel: number;
}

export interface MovableUnitModuleState extends UnitModuleState {
  velocity: Vector3;
  active: boolean;
  rawPower: number;
  lastActive?: boolean;
  lastPower?: number;
  fuel: number;
}

export default class MovableUnitModule<
  Options extends MovableUnitModuleOptions = MovableUnitModuleOptions,
  State extends MovableUnitModuleState = MovableUnitModuleState,
  Obervables extends MovableUnitModuleObservables =
    MovableUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'movable';
  private _dir = new Vector3();
  private _aiControls?: ControlState;

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,

        //#region power
        maxPower: options.maxPower ?? 1,
        minPower: options.minPower ?? 0.4,
        idlePower: options.idlePower ?? 0.2,
        //#endregion

        //#region full
        maxFuel: options.maxFuel ?? 100,
        fuelConsumption: options.fuelConsumption ?? 1,
        idleFuelConsumption: options.idleFuelConsumption ?? 0.01
        //#endregion
      },
      {
        ...state,
        velocity: state.velocity ?? new Vector3(0, 0, 0),
        active: state.active ?? false,

        //#region power
        rawPower: state.rawPower ?? 0,
        //#endregion

        //#region fuel
        fuel: state.fuel ?? 100
        //#endregion
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
      maxPower: this.options.maxPower,
      minPower: this.options.minPower,
      idlePower: this.options.idlePower
    });
    this.observables.fuel$ = new ReplaySubject<number>(1);
    this.observables.fuel$.next(this.state.fuel);
    this.observables.move$ = new Subject<void>();
    this.observables.rotate$ = new Subject<void>();
    this.observables.stop$ = new Subject<void>();
    //#endregion
  }

  override async setup() {
    const unit = this.getUnit();
    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(() => {
        this.clearAutopilotControls();
        this.turnOff();
      })
    );

    this.subscription.add(
      unit
        .getMap()
        ?.app.modules.player.observables.currentPlayer$.pipe(
          switchMap(player => {
            return player.modules.controls.observables.controls$;
          })
        )
        .subscribe(controls => {
          const { power } = controls;

          if (power) {
            if (this.state.active) {
              this.turnOff();
            } else {
              this.turnOn();
            }
          }
        })
    );
  }

  override update({ delta: _delta }: AnimationLoopValue): void {
    let currentPower = this.state.rawPower ?? 0;

    const active = this.state.active && this.state.fuel > 0;

    if (active && currentPower >= this.getMaxPower()) {
      this.state.fuel = Math.max(
        this.state.fuel -
          Math.max(
            this.options.idleFuelConsumption,
            this.options.fuelConsumption * this.state.velocity.length()
          ) *
            _delta,
        0
      );
      this.observables.fuel$.next(this.state.fuel);

      if (this.state.fuel <= 0) {
        this.turnOff();
      }
    }
    if (
      (!active && currentPower > 0) || // Off
      (active && currentPower < this.getMaxPower()) ||
      (active && currentPower > this.getMaxPower())
    ) {
      if (active) {
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

      this.state.lastActive = active;
      this.state.lastPower = this.state.rawPower;
      this.state.rawPower = currentPower;

      this.observables.powerInfo$.next({
        flightPower: this.getCurrentPower(),
        currentPower: this.state.rawPower,
        maxPower: this.options.maxPower,
        minPower: this.options.minPower,
        idlePower: this.options.idlePower
      });
    }
  }

  getFuel() {
    return this.state.fuel;
  }

  setFuel(fuel: number) {
    this.state.fuel = Math.max(0, Math.min(fuel, this.options.maxFuel));
    this.observables.fuel$.next(this.state.fuel);
  }

  getMaxFuel() {
    return this.options.maxFuel;
  }

  canTurnOn() {
    return !this.getUnit().modules.damage.isDestroyed();
  }

  isTurnOn() {
    return this.getActive() ?? false;
  }

  turnOn() {
    if (this.canTurnOn()) {
      this.setActive(true);
    }
  }

  turnOff() {
    this.setActive(false);
  }

  getAIControls() {
    return this._aiControls;
  }

  setAutopilotControls(controls?: Partial<ControlState>) {
    this._aiControls = controls
      ? { ...getDefaultControls(), ...controls }
      : undefined;

    if (controls) {
      // Automatisch starten, wenn AI aktiv
      this.turnOn();
    } else {
      // Optional: Stoppen, wenn AI deaktiviert
      this.turnOff();
    }
  }
  clearAutopilotControls() {
    if (!this._aiControls) return;
    this._aiControls = undefined;
    // this.turnOff(); // Stoppen, wenn AI entfernt
  }

  getControls(): ControlState {
    const unit = this.getUnit() as U;
    const human = unit.modules.player
      .getPlayer()
      ?.modules.controls.getControls();
    const ai = this._aiControls;

    if (human && (!ai || !this.hasMinPower())) {
      // Keine AI-Controls, wenn keine Power oder kein AI
      return human;
    }

    // AI-Controls nur anwenden, wenn genug Power da ist
    return {
      [ControlAction.FIRE_PRIMARY]:
        ai?.firePrimary ?? human?.firePrimary ?? false,
      [ControlAction.FIRE_SECONDARY]:
        ai?.fireSecondary ?? human?.fireSecondary ?? false,
      [ControlAction.MOVE_FORWARD]:
        ai?.moveForward ?? human?.moveForward ?? false,
      [ControlAction.MOVE_BACKWARD]:
        ai?.moveBackward ?? human?.moveBackward ?? false,
      [ControlAction.MOVE_LEFT]: ai?.moveLeft ?? human?.moveLeft ?? false,
      [ControlAction.MOVE_RIGHT]: ai?.moveRight ?? human?.moveRight ?? false,

      [ControlAction.UP]: ai?.up ?? human?.up ?? false,
      [ControlAction.DOWN]: ai?.down ?? human?.down ?? false,
      [ControlAction.LEFT]: ai?.left ?? human?.left ?? false,
      [ControlAction.RIGHT]: ai?.right ?? human?.right ?? false,

      [ControlAction.SPACE]: ai?.space ?? human?.space ?? false,
      [ControlAction.POWER]: ai?.power ?? human?.power ?? false,
      [ControlAction.GEAR]: ai?.gear ?? human?.gear ?? false,
      [ControlAction.SWITCH_WEAPON]:
        ai?.switchWeapon ?? human?.switchWeapon ?? false,
      [ControlAction.LANDING]: ai?.landing ?? human?.landing ?? false,
      [ControlAction.MODIFIER]: ai?.modifier ?? human?.modifier ?? false,
      [ControlAction.ROTATE_LEFT]: ai?.rotateLeft ?? human?.rotateLeft ?? false,
      [ControlAction.ROTATE_RIGHT]:
        ai?.rotateRight ?? human?.rotateRight ?? false,
      [ControlAction.ASCEND]: ai?.ascend ?? human?.ascend ?? false,
      [ControlAction.DESCEND]: ai?.descend ?? human?.descend ?? false,
      [ControlAction.PITCH_DOWN]: ai?.pitchDown ?? human?.pitchDown ?? false,
      [ControlAction.PITCH_UP]: ai?.pitchUp ?? human?.pitchUp ?? false,
      [ControlAction.ROLL_LEFT]: ai?.rollLeft ?? human?.rollLeft ?? false,
      [ControlAction.ROLL_RIGHT]: ai?.rollRight ?? human?.rollRight ?? false
    };
  }

  hasMinPower() {
    return this.state.rawPower >= this.options.minPower;
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
      return this.options.maxPower;
    }
    return 0;
  }

  getMinPower() {
    return this.options.minPower;
  }

  getActive() {
    return this.state.active;
  }

  setActive(value: boolean) {
    if (this.state.active === value) return;
    this.state.active = value;
    this.observables.active$.next(this.state.active);
  }

  getTmpDirection() {
    return this._dir;
  }
  setTmpDirection(x: number, y: number, z: number) {
    this._dir.set(x, y, z);
  }

  getVelocity() {
    return this.state.velocity;
  }
}
