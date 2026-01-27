<template>
  <bm-button tag="div">
    <template #after="{ disabled }">
      <input
        :disabled="disabled"
        v-bind="{ ...(inputAttrs ?? {}), type: 'file' }"
        @change="onChange" />
    </template>
  </bm-button>
</template>

<script setup lang="ts">
import type { InputHTMLAttributes } from 'vue';

import BmButton from '../Button.vue';

defineProps<{
  inputAttrs?: InputHTMLAttributes;
}>();

const $emit = defineEmits<{
  (e: 'files', files: FileList): void;
}>();

function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    throw new Error('No file selected');
  }
  $emit('files', input.files ?? new FileList());
  input.value = '';
}
</script>

<style lang="postcss" scoped>
input[type='file'] {
  position: absolute;
  inset: 0;
  cursor: pointer;
  opacity: 0;
}
</style>
