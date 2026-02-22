<template>
  <base-button
    :disabled="disabled ? true : undefined"
    :tag="tag"
    class="bm-button"
    :class="{
      selected,
      [`style-type-${styleType ?? 'primary'}`]: true,
      [`mode-${mode ?? 'normal'}`]: true
    }">
    <slot name="before" :disabled="disabled" />
    <bm-base-icon
      v-if="icon && (!iconAlign || iconAlign === 'left')"
      size="very-small"
      :name="icon" />
    <span v-if="!hideLabel">{{ label }}</span>
    <bm-base-icon v-if="icon && iconAlign === 'right'" :name="icon" />
    <slot name="after" :disabled="disabled" />
  </base-button>
</template>

<script lang="ts" setup>
import type { FunctionalComponent } from 'vue';

import type icons from '../utils/icons';
import type { ICON } from '../utils/icons';

import BaseButton from './base/Button.vue';
import BmBaseIcon from './base/Icon.vue';

defineProps<{
  disabled?: boolean;
  tag?: string;
  styleType?: 'primary' | 'secondary' | 'danger';
  mode?: 'normal' | 'icon' | 'text';
  selected?: boolean;
  label?: string;
  hideLabel?: boolean;
  icon?: ICON | keyof typeof icons | FunctionalComponent;
  iconAlign?: 'left' | 'right';
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

  position: relative;
  display: inline-flex;
  gap: var(--bm-spacing-small);
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.mode-normal {
    padding: var(--bm-spacing-small) var(--bm-spacing-medium);
    font-family: var(--font-family-base);
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

    &.style-type-danger {
      --color-background: var(--color-red-dark);
      --color-background-hover: var(--color-red-mid);
      --color-foreground: var(--color-white);
      --color-border: var(--color-gold);
    }
  }

  &.mode-icon {
    padding: var(--bm-spacing-medium);
    color: var(--color-foreground);
  }

  &.mode-text {
    padding: 0;
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;
    color: var(--color-foreground);
    text-decoration: underline;
  }

  & span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    white-space: nowrap;
  }

  &:has(.bm-base-icon) {
    & span {
      margin-right: 16px;
    }
  }
}
</style>
