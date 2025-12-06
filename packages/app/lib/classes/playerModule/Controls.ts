import { fromEvent } from 'rxjs';
import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends PlayerModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends PlayerModuleState {}

export default class ControlsModule extends PlayerModule<State, Observables> {
  static override TYPE = 'controls';

  override state: State = {};

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

  // eslint-disable-next-line complexity
  private handleKeyEvent(event: KeyboardEvent, isKeyDown: boolean) {
    const vehicle = this.player.modules.vehicle.getVehicle();
    if (!vehicle) return;

    const state = vehicle.modules.vehicle.getState();

    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.controls.forward = isKeyDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.controls.backward = isKeyDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (state.controls.backward) {
          state.controls.right = false;
          state.controls.left = isKeyDown;
        } else {
          state.controls.left = isKeyDown;
        }
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (state.controls.backward) {
          state.controls.left = false;
          state.controls.right = isKeyDown;
        } else {
          state.controls.right = isKeyDown;
        }
        break;
      case 'Space':
        state.controls.brake = isKeyDown;
        break;
    }
  }

  override destroy(): void {
    super.destroy();
  }
}
