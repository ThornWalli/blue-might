<template>
  <div
    class="bm-panel"
    :class="{
      [`position-${position}`]: position,
      [`style-type-${styleType ?? 'default'}`]: true,
      'has-title': !hideTitle && hasTitle
    }">
    <div v-if="!hideTitle && hasTitle" class="title" :title="title">
      <slot name="title">{{ title }}</slot>
    </div>
    <div class="content">
      <slot :title="title"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useSlots, computed } from 'vue';

const $slots = useSlots();

const $props = defineProps<{
  title?: string;
  hideTitle?: boolean;
  position?: PANEL_POSITION | `${PANEL_POSITION}`;
  styleType?: 'none' | 'default' | 'outlined' | 'transparent';
}>();

const hasTitle = computed(() => $props.title || $slots.title);
</script>

<script lang="ts">
export enum PANEL_POSITION {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right'
}
</script>

<style lang="postcss" scoped>
.bm-panel {
  --panel-offset: 1em;

  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);
  max-width: 100%;
  padding: var(--bm-spacing-medium);
  pointer-events: auto;

  &.style-type-transparent {
    background: transparent;
  }

  &.style-type-default {
    align-items: center;
    color: white;
    color: var(--bm-panel-foreground);
    background: var(--bm-panel-background);
  }

  &.style-type-outlined {
    color: white;
    background: var(--bm-panel-background);
    border: solid 2px var(--bm-panel-border-color);
    border-radius: var(--bm-panel-border-radius);
    box-shadow: var(--bm-panel-box-shadow);
  }

  &.has-title {
    padding-top: var(--bm-spacing-medium);
  }

  & .title {
    display: block;
    width: calc(20 * 8px);
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: var(--bm-panel-title);
    text-align: center;
    white-space: nowrap;
  }

  & .content {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
    width: 100%;
  }

  &[class*='position-'] {
    position: absolute;
  }

  &.position-left {
    position: absolute;
    top: 50%;
    left: var(--panel-offset);
    transform: translateY(-50%);
  }

  &.position-right {
    top: 50%;
    right: var(--panel-offset);
    transform: translateY(-50%);
  }

  &.position-top {
    top: var(--panel-offset);
    left: 50%;
    transform: translateX(-50%);
  }

  &.position-bottom {
    bottom: var(--panel-offset);
    left: 50%;
    transform: translateX(-50%);
  }

  &.position-top-left {
    top: var(--panel-offset);
    left: var(--panel-offset);
  }

  &.position-top-right {
    top: var(--panel-offset);
    right: var(--panel-offset);
  }

  &.position-bottom-left {
    bottom: var(--panel-offset);
    left: var(--panel-offset);
  }

  &.position-bottom-right {
    right: var(--panel-offset);
    bottom: var(--panel-offset);
  }
}

:deep(hr) {
  width: 100%;
  margin: 0;
  margin: var(--bm-spacing-small) 0;
  border: none;
  border-top: solid var(--bm-line-color) 3px;
}
</style>
