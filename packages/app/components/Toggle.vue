<template>
  <div class="bm-toggle">
    <div class="track">
      <input
        v-bind="{
          ...elAttrs,
          type: 'checkbox',
          checked: modelValue,
          id: preparedId
        }"
        @input="
          $emit(
            'update:modelValue',
            ($event.target! as HTMLInputElement).checked
          )
        " />
      <div class="thumb"></div>
    </div>
    <bm-base-icon v-if="icon" size="very-small" :name="icon" />
    <label v-if="label" :for="$id">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  useId,
  type FunctionalComponent,
  type InputHTMLAttributes
} from 'vue';

import type { ICON } from '../utils/icons';
import type icons from '../utils/icons';

import BmBaseIcon from './base/Icon.vue';

const $id = useId();

const $props = defineProps<{
  icon?: ICON | keyof typeof icons | FunctionalComponent;
  label?: string;
  modelValue: boolean;
  elAttrs?: InputHTMLAttributes;
}>();

const preparedId = computed(() => $props.elAttrs?.id ?? $id);

defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
</script>

<style lang="postcss" scoped>
.bm-toggle {
  --size: 16px;

  display: flex;
  flex-direction: row;
  gap: var(--bm-spacing-medium);
  align-items: center;

  & input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    opacity: 0;
  }

  & label {
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
  }

  & input:checked + .thumb {
    background: #1f3d2b;
    transform: translateX(var(--size));
  }

  & .track {
    position: relative;
    box-sizing: border-box;
    width: calc(var(--size) * 2 + var(--bm-spacing-small) * 2);
    padding: var(--bm-spacing-small);
    background: #6b6b6b;
  }

  & .thumb {
    width: var(--size);
    height: var(--size);
    pointer-events: none;
    background: #8b0000;
    transition:
      transform var(--bm-easing-duration-short) steps(2),
      background var(--bm-easing-duration-short) steps(2);
  }
}
</style>
