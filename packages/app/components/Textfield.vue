<template>
  <div class="bm-textfield">
    <input
      :type="inputAttrs?.type ?? 'text'"
      :value="modelValue"
      v-bind="inputAttrs"
      @input="onInput" />
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import type { InputHTMLAttributes } from 'vue';

const $props = defineProps<{
  modelValue: T;
  inputAttrs?: InputHTMLAttributes;
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
  &:has(input:focus),
  .bm-form-field:hover & {
    background-color: var(--color-gray-very-dark);
  }

  input {
    box-sizing: border-box;
    width: 100%;
    padding: var(--bm-spacing-medium);
    font-family: var(--font-base);
    font-size: 12px;
    color: currentColor;
    appearance: none;
    outline: none;
    background: none;
    border: none;
  }
}

/* input[type='text'] {
  padding: var(--bm-spacing-medium);
  font-family: var(--font-base);
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
