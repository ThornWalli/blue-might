<template>
  <base-button
    class="bm-button"
    :class="{
      selected,
      [`style-type-${styleType ?? 'primary'}`]: true,
      [`mode-${mode ?? 'normal'}`]: true
    }">
    <slot>Button</slot>
  </base-button>
</template>

<script lang="ts" setup>
import BaseButton from './base/Button.vue';

defineProps<{
  styleType?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  mode?: 'normal';
  selected?: boolean;
}>();
</script>

<style lang="postcss" scoped>
.bm-button {
  --color-border: var(--color-black);
  --color-background: var(--color-white);
  --color-background-hover: var(--color-gray-2);
  --color-foreground: var(--color-white);

  /* indicator */
  --indicator-width: 30px;
  --indicator-foreground: var(--color-white);
  --indicator-background: var(--color-blue-7);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.mode-normal {
    padding: 0.25em 0.5em;
    font-family: var(--font-base);
    font-size: 12px;
    font-weight: bold;
    color: var(--color-foreground);
    background-color: var(--color-background);
    transition:
      background-color var(--bm-easing-duration-short) var(--bm-easing-base),
      outline-color var(--bm-easing-duration-short) var(--bm-easing-base),
      color var(--bm-easing-duration-short) var(--bm-easing-base);

    &.selected,
    &:not([disabled]):hover {
      background: rgb(255 255 255 / 10%);
    }

    &:not([disabled]):hover {
      background: var(--color-background-hover);
    }

    &.style-type-primary {
      --color-background: var(--color-green-dark);
      --color-background-hover: var(--color-green-mid);
      --color-foreground: var(--color-white);
      --color-border: var(--color-gold);
    }
  }
}
</style>
