/* eslint-disable complexity */
import { fromEvent, ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';

interface Observables extends PlayerModuleObservables {
  controls$: ReplaySubject<ControlState>;
}

interface State extends PlayerModuleState {
  controls: ControlState;
}

export function getDefaultControls<
  Controls extends ControlState = ControlState
>() {
  return {
    space: false,
    gear: false,
    landing: false,
    modifier: false,
    rotateLeft: false,
    rotateRight: false,
    moveLeft: false,
    moveRight: false,
    moveForward: false,
    moveBackward: false,
    ascend: false,
    descend: false,
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false
  } as Controls;
}

export default class ControlsModule extends PlayerModule<State, Observables> {
  static override TYPE = 'controls';

  override state: State = {
    controls: {
      space: false,
      gear: false,
      landing: false,
      modifier: false,
      rotateLeft: false,
      rotateRight: false,
      moveLeft: false,
      moveRight: false,
      moveForward: false,
      moveBackward: false,
      ascend: false,
      descend: false,
      pitchUp: false,
      pitchDown: false,
      rollLeft: false,
      rollRight: false
    }
  };

  constructor(player: Player, state: State, debug?: boolean) {
    super(player, state, debug);

    //#region observables
    this.observables.controls$ = new ReplaySubject<ControlState>();
    //#endregion
  }

  getControls() {
    return this.state.controls;
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      fromEvent<KeyboardEvent>(window, 'keydown').subscribe(event => {
        this.handleKeyEvent(event, true);
      })
    );

    this.subscription.add(
      fromEvent<KeyboardEvent>(window, 'keyup').subscribe(event => {
        this.handleKeyEvent(event, false);
      })
    );
  }

  private handleKeyEvent(event: KeyboardEvent, isKeyDown: boolean) {
    const vehicle = this.player.modules.vehicle.getVehicle();
    if (!vehicle) return;

    const controls: ControlState = this.state.controls;

    controls.modifier = event.shiftKey;

    switch (event.code) {
      case 'KeyQ':
        controls.rotateLeft = isKeyDown;
        break;
      case 'KeyG':
        controls.gear = isKeyDown;
        break;
      case 'KeyL':
        controls.landing = isKeyDown;
        break;
      case 'KeyE':
        controls.rotateRight = isKeyDown;
        break;
      case 'KeyR':
        controls.ascend = isKeyDown;
        break;
      case 'KeyF':
        controls.descend = isKeyDown;
        break;
      case 'KeyW':
      case 'ArrowUp':
        controls.moveForward = isKeyDown;
        controls.pitchUp = isKeyDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        controls.moveBackward = isKeyDown;
        controls.pitchDown = isKeyDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        controls.moveLeft = isKeyDown;
        controls.rollLeft = isKeyDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        controls.moveRight = isKeyDown;
        controls.rollRight = isKeyDown;
        break;
      case 'Space':
        controls.space = isKeyDown;
        break;
    }
    this.observables.controls$.next({ ...controls });
  }

  override destroy(): void {
    super.destroy();
  }
}

export interface ControlState {
  space: boolean;

  gear: boolean;
  landing: boolean;
  modifier: boolean;

  rotateLeft: boolean | number;
  rotateRight: boolean | number;
  moveLeft: boolean | number;
  moveRight: boolean | number;
  moveForward: boolean | number;
  moveBackward: boolean | number;

  ascend: boolean | number; // aufsteigen
  descend: boolean | number; // absteigen
  /**
   * forward tilt
   */
  pitchUp: boolean | number;
  /**
   * backward tilt
   */
  pitchDown: boolean | number;
  /**
   *left tilt
   */
  rollLeft: boolean | number;
  /**
   * right tilt
   */
  rollRight: boolean | number;
}

export enum Controls {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  SPACE = 'space'
}
