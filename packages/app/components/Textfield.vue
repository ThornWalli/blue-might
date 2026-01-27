<template>
  <div class="bm-textfield">
    <input
      :type="inputAttrs?.type ?? 'text'"
      :value="modelValue"
      v-bind="inputAttrs"
      @input="
        $emit(
          'update:modelValue',
          ($event.target! as HTMLInputElement).value as T
        )
      " />
  </div>
</template>

<script setup lang="ts" generic="T">
import type { InputHTMLAttributes } from 'vue';

defineProps<{
  modelValue: T;
  inputAttrs?: InputHTMLAttributes;
}>();

defineEmits<{
  (e: 'update:modelValue', value: T): void;
}>();
</script>

<style lang="postcss" scoped>
.bm-textfield {
  &:has(input:focus) {
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
