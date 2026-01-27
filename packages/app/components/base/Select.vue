<template>
  <select v-bind="attrs" @input="onInput">
    <bm-select-option
      v-for="option in preparedOptions"
      :key="String(option.value)"
      :label="option.label"
      :value="option.value"
      :selected="modelValue === option.value"
      :options="option.options"
      :disabled="option.disabled" />
  </select>
</template>

<script lang="ts" setup generic="T">
import { computed, type SelectHTMLAttributes } from 'vue';

import type { SelectOption } from './SelectOption.vue';
import BmSelectOption from './SelectOption.vue';

const $props = defineProps<{
  modelValue: T;
  attrs?: SelectHTMLAttributes;
  options: SelectOption<T>[];
}>();

const $emit = defineEmits<{
  (event: 'update:modelValue', value: T): void;
}>();

const preparedOptions = computed(() => $props.options);

function onInput(event: Event) {
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  $emit('update:modelValue', value as T);
}
</script>
