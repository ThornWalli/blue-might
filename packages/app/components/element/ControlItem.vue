<template>
  <component
    :is="button ? 'button' : 'div'"
    class="bm-control-item"
    :class="{
      blinking,
      [`status-${indicatorStatus}`]: indicatorStatus
    }">
    <div>
      <div>
        <slot v-if="indicator" name="indicator">
          <span class="indicator-lamp"></span>
        </slot>

        <div class="label">
          <slot name="label">{{ label.padStart(10, '\u00A0') }}</slot>
        </div>
      </div>
      <div v-html="value"></div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const $props = defineProps<{
  indicator?: boolean;
  button?: boolean;
  indicatorStatus?: CONTROL_ITEM_STATUS;
  label: string;
  value: string;
  blink?: boolean;
}>();

const blinking = computed(
  () => $props.blink || $props.indicatorStatus === CONTROL_ITEM_STATUS.WARNING
);
</script>

<script lang="ts">
export enum CONTROL_ITEM_STATUS {
  NORMAL = 'normal',
  WARNING = 'warning',
  DANGER = 'danger',
  INACTIVE = 'inactive'
}
</script>

<style lang="postcss" scoped>
.bm-control-item {
  display: block;
  width: 100%;
  user-select: none;

  --color-inactive: #555;
  --color-normal: lime;
  --color-warning: yellow;
  --color-danger: red;

  &button {
    padding: 0;
    appearance: none;
    cursor: pointer;
    outline: none;
    background: transparent;
    border: none;

    & > div {
      width: 100%;
      border: solid 2px #555;
    }
  }

  & .label {
    flex: 1;
    text-align: right;
  }

  & > div {
    box-sizing: border-box;
    display: flex;
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    white-space: nowrap;
    border: solid 2px transparent;
  }

  & > div > div {
    display: flex;
    gap: var(--bm-spacing-medium);
    align-items: center;
    padding: var(--bm-spacing-small);

    &:nth-child(odd) {
      display: flex;
      flex: 1;
      justify-content: space-between;
    }

    &:nth-child(even) {
      flex: 0;
      text-align: right;
      background-color: #333;
    }
  }

  & .indicator-lamp {
    display: inline-block;
    width: 12px;
    height: 12px;
    background-color: var(--color);
    border-radius: 50%;

    /*
    box-shadow:
      inset 0 0 2px rgb(0 0 0 / 100%),
      inset 0 0 4px rgb(0 0 0 / 100%),
      inset 0 0 6px rgb(0 0 0 / 100%);
   */
  }

  &.blinking {
    & .indicator-lamp {
      animation: blinking var(--bm-easing-duration-very-long) infinite steps(1);
    }
  }

  &.status-inactive .indicator-lamp {
    --color: var(--color-inactive);
  }

  &.status-normal .indicator-lamp {
    --color: var(--color-normal);
  }

  &.status-warning .indicator-lamp {
    --color: var(--color-warning);
  }

  &.status-danger .indicator-lamp {
    --color: var(--color-danger);
  }
}

@keyframes blinking {
  0%,
  100% {
    background-color: var(--color-inactive);
  }

  50% {
    background-color: var(--color);
  }
}
</style>
