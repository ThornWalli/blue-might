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
    padding: var(--bm-spacing-small);
    font-family: var(--font-family-base);
    font-size: 12px;
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
