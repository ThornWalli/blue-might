import { defineAsyncComponent, markRaw } from 'vue';

export enum ICON {
  LOCKED = 'locked',
  UNLOCKED = 'unlocked'
}

export default {
  [ICON.LOCKED]: markRaw(
    defineAsyncComponent(() => import('../assets/icons/lock.svg?component'))
  ),
  [ICON.UNLOCKED]: markRaw(
    defineAsyncComponent(() => import('../assets/icons/lock-off.svg?component'))
  )
};
