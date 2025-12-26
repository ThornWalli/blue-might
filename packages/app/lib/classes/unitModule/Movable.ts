/* eslint-disable complexity */
import { ReplaySubject, Subject } from 'rxjs';
import { Vector3 } from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type MovableUnit from '../unit/Movable';
import {
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
  move$: Subject<void>;
  rotate$: Subject<void>;
  stop$: Subject<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MovableUnitModuleOptions extends UnitModuleOptions {}

export interface MovableUnitModuleState extends UnitModuleState {
  velocity: Vector3;
  active: boolean;
  rawPower: number;
  maxPower: number;
  minPower: number;
  idlePower: number;

  lastActive?: boolean;
  lastPower?: number;
}

export default class MovableUnitModule<
  Options extends MovableUnitModuleOptions = MovableUnitModuleOptions,
  State extends MovableUnitModuleState = MovableUnitModuleState,
  Obervables extends
    MovableUnitModuleObservables = MovableUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'movable';
  private _dir = new Vector3();
  private _aiControls?: ControlState;

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options
      },
      {
        ...state,
        velocity: state.velocity ?? new Vector3(0, 0, 0),
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

    this.observables.move$ = new Subject<void>();
    this.observables.rotate$ = new Subject<void>();
    this.observables.stop$ = new Subject<void>();
    //#endregion
  }

  override async setup() {
    this.subscription.add(
      this.getUnit().modules.damage.observables.destroyed$.subscribe(() => {
        this.clearAutopilotControls();
        this.turnOff();
      })
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

  isTurnOn() {
    return this.getActive() ?? false;
  }

  turnOn() {
    this.setActive(true);
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
      moveForward: ai?.moveForward ?? human?.moveForward ?? false,
      moveBackward: ai?.moveBackward ?? human?.moveBackward ?? false,
      moveLeft: ai?.moveLeft ?? human?.moveLeft ?? false,
      moveRight: ai?.moveRight ?? human?.moveRight ?? false,
      space: ai?.space ?? human?.space ?? false,
      gear: ai?.gear ?? human?.gear ?? false,
      landing: ai?.landing ?? human?.landing ?? false,
      modifier: ai?.modifier ?? human?.modifier ?? false,
      rotateLeft: ai?.rotateLeft ?? human?.rotateLeft ?? false,
      rotateRight: ai?.rotateRight ?? human?.rotateRight ?? false,
      ascend: ai?.ascend ?? human?.ascend ?? false,
      descend: ai?.descend ?? human?.descend ?? false,
      pitchDown: ai?.pitchDown ?? human?.pitchDown ?? false,
      pitchUp: ai?.pitchUp ?? human?.pitchUp ?? false,
      rollLeft: ai?.rollLeft ?? human?.rollLeft ?? false,
      rollRight: ai?.rollRight ?? human?.rollRight ?? false
    };
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
