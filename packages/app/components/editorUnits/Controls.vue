<template>
  <base-sticky-wrapper
    class="bm-editor-units-controls"
    :app="app"
    :target="target">
    <div>
      <bm-button
        v-for="item in items"
        :key="item.label"
        hide-label
        :icon="item.icon"
        :label="item.label"
        @click="item.action" />
    </div>
  </base-sticky-wrapper>
</template>

<script setup lang="ts">
import type { App } from '@blue-might/app/lib/types';
import type Unit from '@blue-might/app/lib/classes/Unit';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import { ICON } from '@blue-might/app/utils/icons';

import BmButton from '../Button.vue';
import BaseStickyWrapper, {
  type StickyWrapperTarget
} from '../base/StickyWrapper.vue';

const $emit = defineEmits<{
  (e: 'rotate', angle: number): void;
  (e: 'focus' | 'apply' | 'abort' | 'move' | 'delete'): void;
}>();

const $props = defineProps<{
  app: App;
  unit: Unit;
  canAbort: boolean;
}>();

const items = computed(() => [
  { icon: ICON.MAGNIFYING_GLASS, label: 'Focus', action: () => $emit('focus') },
  {
    icon: ICON.ARROW_PATH,
    label: 'Rotate (45°)',
    action: () => $emit('rotate', Math.PI / 4)
  },
  { icon: ICON.TRASH, label: 'Delete', action: () => $emit('delete') },
  { icon: ICON.CUBE_TRANSPARENT, label: 'Move', action: () => $emit('move') },
  { icon: ICON.CHECK, label: 'Apply', action: () => $emit('apply') },
  ...($props.canAbort
    ? [{ icon: ICON.X_MARK, label: 'Abort', action: () => $emit('abort') }]
    : [])
]);

const target = ref<StickyWrapperTarget>($props.unit.getPosition());
const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    $props.unit.observables.position$.subscribe(position => {
      target.value = position;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.bm-editor-units-controls {
  & > div {
    position: absolute;
    top: 50%;
    left: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    pointer-events: auto;
    transform: translateY(-50%);
  }
}
</style>
