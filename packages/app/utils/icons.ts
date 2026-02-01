import { defineAsyncComponent, markRaw } from 'vue';

export enum ICON {
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
  PLUS = 'plus',
  MINUS = 'minus',
  ARROWS_POINTING_IN = 'arrows-pointing-in',
  ARROWS_POINTING_OUT = 'arrows-pointing-out',
  ARROW_PATH = 'arrow-path',
  X_MARK = 'x-mark',
  CHECK = 'check',
  CUBE_TRANSPARENT = 'cube-transparent',
  TRASH = 'trash',
  MAGNIFYING_GLASS = 'magnifying-glass',
  PENCIL = 'pencil',
  CHEVRON_UP = 'chevron-up',
  CHEVRON_DOWN = 'chevron-down',
  ARROW_TURN_UP_RIGHT = 'arrow-turn-up-right',
  ARROW_TURN_DOWN_RIGHT = 'arrow-turn-down-right',
  EYE_DROPPER = 'eye-dropper',
  PAUSE = 'pause',
  PLAY = 'play',
  ARROW_UTURN_LEFT = 'arrow-uturn-left',
  ARROW_DOWN_TRAY = 'arrow-down-tray',
  ARROW_UP_TRAY = 'arrow-up-tray',
  ARROW_LEFT_START_ON_RECTANGLE = 'arrow-left-start-on-rectangle',
  RESCUE = 'rescue',
  USER_GROUP = 'user-group',
  MAP_PIN = 'map-pin',
  FLAG = 'flag'
}

export default {
  [ICON.LOCKED]: markRaw(
    defineAsyncComponent(() => import('../assets/icons/lock.svg?component'))
  ),
  [ICON.UNLOCKED]: markRaw(
    defineAsyncComponent(() => import('../assets/icons/lock-off.svg?component'))
  ),
  [ICON.PLUS]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/plus.svg?component')
    )
  ),
  [ICON.MINUS]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/minus.svg?component')
    )
  ),
  [ICON.ARROWS_POINTING_IN]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrows-pointing-in.svg?component')
    )
  ),
  [ICON.ARROWS_POINTING_OUT]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrows-pointing-out.svg?component')
    )
  ),
  [ICON.ARROW_PATH]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-path.svg?component')
    )
  ),
  [ICON.CHECK]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/check.svg?component')
    )
  ),
  [ICON.X_MARK]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/x-mark.svg?component')
    )
  ),
  [ICON.CUBE_TRANSPARENT]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/cube-transparent.svg?component')
    )
  ),
  [ICON.TRASH]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/trash.svg?component')
    )
  ),
  [ICON.MAGNIFYING_GLASS]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/magnifying-glass.svg?component')
    )
  ),
  [ICON.PENCIL]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/pencil.svg?component')
    )
  ),
  [ICON.CHEVRON_UP]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/chevron-up.svg?component')
    )
  ),
  [ICON.CHEVRON_DOWN]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/chevron-down.svg?component')
    )
  ),
  [ICON.ARROW_TURN_UP_RIGHT]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-turn-up-right.svg?component')
    )
  ),
  [ICON.ARROW_TURN_DOWN_RIGHT]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-turn-down-right.svg?component')
    )
  ),
  [ICON.EYE_DROPPER]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/eye-dropper.svg?component')
    )
  ),
  [ICON.PAUSE]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/pause.svg?component')
    )
  ),
  [ICON.PLAY]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/play.svg?component')
    )
  ),
  [ICON.ARROW_UTURN_LEFT]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-uturn-left.svg?component')
    )
  ),
  [ICON.ARROW_DOWN_TRAY]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-down-tray.svg?component')
    )
  ),
  [ICON.ARROW_UP_TRAY]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/arrow-up-tray.svg?component')
    )
  ),
  [ICON.ARROW_LEFT_START_ON_RECTANGLE]: markRaw(
    defineAsyncComponent(
      () =>
        import('../assets/icons/micro/arrow-left-start-on-rectangle.svg?component')
    )
  ),
  [ICON.RESCUE]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/rescue.svg?component')
    )
  ),
  [ICON.USER_GROUP]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/user-group.svg?component')
    )
  ),
  [ICON.MAP_PIN]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/map-pin.svg?component')
    )
  ),
  [ICON.FLAG]: markRaw(
    defineAsyncComponent(
      () => import('../assets/icons/micro/flag.svg?component')
    )
  )
};
