<template>
  <div
    class="bm-color-picker"
    :style="{
      '--color': modelValue
    }">
    <input
      v-bind="{ ...elAttrs, type: 'color', value: modelValue }"
      @input="
        $emit('update:modelValue', ($event.target! as HTMLInputElement).value)
      " />
    <div class="preview"></div>
  </div>
</template>

<script setup lang="ts">
import type { InputHTMLAttributes } from 'vue';

defineProps<{
  modelValue: string | number;
  elAttrs?: InputHTMLAttributes;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>

<style lang="postcss" scoped>
.bm-color-picker {
  position: relative;

  & .preview {
    box-sizing: border-box;
    width: 100%;
    min-width: 24px;
    height: 24px;
    background-color: var(--color);
    border: solid #fff 2px;
  }
}

input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
</style>
