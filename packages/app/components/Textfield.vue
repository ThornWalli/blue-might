<template>
  <div class="bm-textfield">
    <input
      :type="inputAttrs?.type ?? 'text'"
      :value="modelValue"
      v-bind="inputAttrs"
      @input="onInput" />
    <span v-if="unit">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import type { InputHTMLAttributes } from 'vue';

const $props = defineProps<{
  modelValue: T;
  inputAttrs?: InputHTMLAttributes;
  unit?: string;
}>();

const $emit = defineEmits<{
  (e: 'update:modelValue', value: T): void;
}>();

function onInput(e: InputEvent) {
  let value: string | number = (e.target! as HTMLInputElement).value;
  value = $props.inputAttrs?.type === 'number' ? Number(value) : value;
  $emit('update:modelValue', value as T);
}
</script>

<style lang="postcss" scoped>
.bm-textfield {
  display: flex;
  gap: calc(var(--bm-spacing-medium) / 2);
  align-items: baseline;
  padding-right: calc(var(--bm-spacing-medium) / 2);
  background-color: var(--color-gray-very-very-dark);

  &:has(input:focus),
  .bm-form-field:hover & {
    background-color: var(--color-gray-very-dark);
  }

  & input {
    box-sizing: border-box;
    width: 100%;
    padding: var(--bm-spacing-medium);
    padding-right: calc(var(--bm-spacing-medium) / 2);
    font-family: var(--font-family-base);
    font-size: 12px;
    color: currentColor;
    appearance: none;
    outline: none;
    background: none;
    border: none;
  }

  & span {
    font-size: 12px;
    color: var(--bm-fieldset-foreground);
  }
}

/* input[type='text'] {
  padding: var(--bm-spacing-medium);
  font-family: var(--font-family-base);
  font-size: 12px;
  color: currentColor;
  appearance: none;
  outline: none;
  background: none;
  border: none;

  &:focus {
    background-color: var(--color-gray-very-dark);
  }
} */
</style>
