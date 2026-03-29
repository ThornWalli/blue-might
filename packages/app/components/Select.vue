<template>
  <div class="bm-select">
    <base-select
      :id="id"
      :model-value="modelValue"
      :options="options"
      :attrs="attrs"
      @update:model-value="$emit('update:modelValue', $event)" />
    <span v-if="!attrs?.size" class="indicator"> </span>
  </div>
</template>

<script lang="ts" setup generic="T">
import type { SelectHTMLAttributes } from 'vue';

import BaseSelect from './base/Select.vue';
import type { SelectOption } from './base/SelectOption.vue';

defineProps<{
  id?: string;
  modelValue: T;
  attrs?: SelectHTMLAttributes;
  options: SelectOption<T>[];
}>();

defineEmits<{
  (event: 'update:modelValue', value: T): void;
}>();
</script>

<style lang="postcss" scoped>
.bm-select {
  --color-border: var(--color-black);
  --color-background: var(--color-green-dark);
  --color-background-hover: var(--color-green-dark);
  --color-foreground: var(--color-white);

  position: relative;
  display: inline-flex;
  gap: var(--bm-spacing-small);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--color-background);

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    content: '';
    border: solid 3px;
    border-color: rgb(255 255 255 / 30%) rgb(0 0 0 / 30%) rgb(0 0 0 / 30%)
      rgb(255 255 255 / 30%);
  }

  &:has(select:active) {
    background: var(--color-background-hover);

    &::after {
      border-color: rgb(0 0 0 / 30%) rgb(255 255 255 / 30%)
        rgb(255 255 255 / 30%) rgb(0 0 0 / 30%);
    }
  }

  &:hover {
    background: var(--color-background-hover);

    & span {
      opacity: 1;
    }
  }

  & select {
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: var(--bm-spacing-medium) var(--bm-spacing-medium);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: calc(var(--line-height-bit-font) * 1.2);
    color: var(--color-foreground);
    appearance: none;
    cursor: pointer;
    outline: none;
    background: transparent;
    border: none;
  }

  & span {
    position: absolute;
    top: 50%;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0.75;
    transform: translateY(-50%);
    transition: opacity var(--bm-easing-duration-short) var(--bm-easing-base);

    &::before,
    &::after {
      display: block;
      width: 12px;
      height: 2px;
      content: '';
      background: currentColor;
    }
  }
}
</style>
