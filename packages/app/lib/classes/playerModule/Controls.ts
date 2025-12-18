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

export default class ControlsModule extends PlayerModule<State, Observables> {
  static override TYPE = 'controls';

  override state: State = {
    controls: {}
  };

  constructor(player: Player, debug?: boolean) {
    super(player, {} as State, debug);

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
      case 'KeyW':
      case 'ArrowUp':
        controls.up = isKeyDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        controls.down = isKeyDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        controls.left = isKeyDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        controls.right = isKeyDown;
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
  gear?: boolean;
  landing?: boolean;
  modifier?: boolean;
  rotateLeft?: boolean;
  rotateRight?: boolean;
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  space?: boolean;
}

export enum Controls {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  SPACE = 'space'
}
