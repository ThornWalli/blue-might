import { fromEvent, ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';

export enum ControlAction {
  SPACE = 'space',
  POWER = 'power',
  GEAR = 'gear',
  LANDING = 'landing',
  MODIFIER = 'modifier',
  MOVE_FORWARD = 'moveForward',
  MOVE_BACKWARD = 'moveBackward',
  MOVE_LEFT = 'moveLeft',
  MOVE_RIGHT = 'moveRight',

  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',

  ASCEND = 'ascend',
  DESCEND = 'descend',
  ROTATE_LEFT = 'rotateLeft',
  ROTATE_RIGHT = 'rotateRight',
  PITCH_UP = 'pitchUp',
  PITCH_DOWN = 'pitchDown',
  ROLL_LEFT = 'rollLeft',
  ROLL_RIGHT = 'rollRight',
  FIRE_PRIMARY = 'firePrimary',
  FIRE_SECONDARY = 'fireSecondary'
}

type KeyBindings = {
  [key: string]: {
    keyCode: string[];
    modifier?: boolean;
  };
};

const actionBindings: KeyBindings = {
  [ControlAction.POWER]: {
    keyCode: ['KeyP']
  },
  [ControlAction.GEAR]: {
    keyCode: ['KeyG']
  },
  [ControlAction.MOVE_FORWARD]: {
    keyCode: ['KeyW']
  },
  [ControlAction.MOVE_BACKWARD]: {
    keyCode: ['KeyS']
  },
  [ControlAction.MOVE_LEFT]: {
    keyCode: ['KeyA']
  },
  [ControlAction.MOVE_RIGHT]: {
    keyCode: ['KeyD']
  },

  [ControlAction.UP]: {
    keyCode: ['ArrowUp']
  },
  [ControlAction.DOWN]: {
    keyCode: ['ArrowDown']
  },
  [ControlAction.LEFT]: {
    keyCode: ['ArrowLeft']
  },
  [ControlAction.RIGHT]: {
    keyCode: ['ArrowRight']
  },

  [ControlAction.ASCEND]: {
    keyCode: ['KeyR']
  },
  [ControlAction.DESCEND]: {
    keyCode: ['KeyF']
  },
  [ControlAction.ROTATE_LEFT]: {
    keyCode: ['KeyQ']
  },
  [ControlAction.ROTATE_RIGHT]: {
    keyCode: ['KeyE']
  },
  [ControlAction.PITCH_UP]: {
    keyCode: ['KeyW']
  },
  [ControlAction.PITCH_DOWN]: {
    keyCode: ['KeyS']
  },
  [ControlAction.ROLL_LEFT]: {
    keyCode: ['KeyA']
  },
  [ControlAction.ROLL_RIGHT]: {
    keyCode: ['KeyD']
  },
  [ControlAction.FIRE_PRIMARY]: {
    keyCode: ['Space']
  },
  [ControlAction.FIRE_SECONDARY]: {
    keyCode: ['Space'],
    modifier: true
  }
};

function getKeyMap(keyBindings: KeyBindings) {
  const keyMap: {
    [key: string]: { action: ControlAction; modifier?: boolean }[];
  } = {};
  for (const action in keyBindings) {
    const binding = keyBindings[action];
    if (!binding) {
      throw new Error(`No key binding found for action: ${action}`);
    }
    binding.keyCode.forEach(key => {
      keyMap[key] = keyMap[key] ?? [];
      keyMap[key].push({
        action: action as ControlAction,
        modifier: binding.modifier
      });
    });
  }
  return keyMap;
}

const keyBindings: {
  [key: string]: {
    modifier?: boolean;
    action: ControlAction;
  }[];
} = getKeyMap(actionBindings);

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
    [ControlAction.FIRE_PRIMARY]: false,
    [ControlAction.FIRE_SECONDARY]: false,
    [ControlAction.SPACE]: false,
    [ControlAction.GEAR]: false,
    [ControlAction.LANDING]: false,
    [ControlAction.MODIFIER]: false,
    [ControlAction.ROTATE_LEFT]: false,
    [ControlAction.ROTATE_RIGHT]: false,
    [ControlAction.MOVE_LEFT]: false,
    [ControlAction.MOVE_RIGHT]: false,
    [ControlAction.MOVE_FORWARD]: false,
    [ControlAction.MOVE_BACKWARD]: false,
    [ControlAction.UP]: false,
    [ControlAction.DOWN]: false,
    [ControlAction.LEFT]: false,
    [ControlAction.RIGHT]: false,
    [ControlAction.ASCEND]: false,
    [ControlAction.DESCEND]: false,
    [ControlAction.PITCH_UP]: false,
    [ControlAction.PITCH_DOWN]: false,
    [ControlAction.ROLL_LEFT]: false,
    [ControlAction.ROLL_RIGHT]: false
  } as Controls;
}

export default class ControlsModule extends PlayerModule<State, Observables> {
  static override TYPE = 'controls';

  override state: State = {
    controls: getDefaultControls()
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

    const actions = keyBindings[event.code];
    if (actions) {
      actions.forEach(({ action, modifier }) => {
        controls[action] = isKeyDown;
        if (modifier) {
          controls.modifier = isKeyDown;
        }
      });
    }

    // switch (event.code) {
    //   case 'KeyQ':
    //     controls.rotateLeft = isKeyDown;
    //     break;
    //   case 'KeyG':
    //     controls.gear = isKeyDown;
    //     break;
    //   case 'KeyL':
    //     controls.landing = isKeyDown;
    //     break;
    //   case 'KeyE':
    //     controls.rotateRight = isKeyDown;
    //     break;
    //   case 'KeyR':
    //     controls.ascend = isKeyDown;
    //     break;
    //   case 'KeyF':
    //     controls.descend = isKeyDown;
    //     break;
    //   case 'KeyW':
    //   case 'ArrowUp':
    //     controls.moveForward = isKeyDown;
    //     controls.pitchUp = isKeyDown;
    //     break;
    //   case 'KeyS':
    //   case 'ArrowDown':
    //     controls.moveBackward = isKeyDown;
    //     controls.pitchDown = isKeyDown;
    //     break;
    //   case 'KeyA':
    //   case 'ArrowLeft':
    //     controls.moveLeft = isKeyDown;
    //     controls.rollLeft = isKeyDown;
    //     break;
    //   case 'KeyD':
    //   case 'ArrowRight':
    //     controls.moveRight = isKeyDown;
    //     controls.rollRight = isKeyDown;
    //     break;
    //   case 'Space':
    //     controls.space = isKeyDown;
    //     break;
    // }
    this.observables.controls$.next({ ...controls });
  }

  override destroy(): void {
    super.destroy();
  }
}

export interface ControlState {
  [ControlAction.FIRE_PRIMARY]: boolean;
  [ControlAction.FIRE_SECONDARY]: boolean;

  [ControlAction.SPACE]: boolean;
  [ControlAction.POWER]: boolean;
  [ControlAction.GEAR]: boolean;
  [ControlAction.LANDING]: boolean;
  [ControlAction.MODIFIER]: boolean;

  [ControlAction.ROTATE_LEFT]: boolean | number;
  [ControlAction.ROTATE_RIGHT]: boolean | number;

  [ControlAction.MOVE_LEFT]: boolean | number;
  [ControlAction.MOVE_RIGHT]: boolean | number;
  [ControlAction.MOVE_FORWARD]: boolean | number;
  [ControlAction.MOVE_BACKWARD]: boolean | number;

  [ControlAction.LEFT]: boolean | number;
  [ControlAction.RIGHT]: boolean | number;
  [ControlAction.UP]: boolean | number;
  [ControlAction.DOWN]: boolean | number;

  [ControlAction.ASCEND]: boolean | number; // aufsteigen
  [ControlAction.DESCEND]: boolean | number; // absteigen
  /**
   * forward tilt
   */
  [ControlAction.PITCH_UP]: boolean | number;
  /**
   * backward tilt
   */
  [ControlAction.PITCH_DOWN]: boolean | number;
  /**
   *left tilt
   */
  [ControlAction.ROLL_LEFT]: boolean | number;
  /**
   * right tilt
   */
  [ControlAction.ROLL_RIGHT]: boolean | number;
}

export enum Controls {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  SPACE = 'space'
}
