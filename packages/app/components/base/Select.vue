<template>
  <select @input="onInput">
    <component
      :is="group ? 'optgroup' : 'option'"
      v-for="{ group, label, value, options } in preparedOptions"
      :key="`${label}-${value}`"
      :label="label"
      :value="value">
      {{ group ? undefined : label }}
      <option
        v-for="option in options"
        :key="String(option.value ?? option.label)"
        :value="option.value">
        {{ option.label }}
      </option>
    </component>
  </select>
</template>

<script lang="ts" setup generic="T">
import { computed } from 'vue';

interface Option {
  group?: string;
  label: string;
  value?: T;
  options?: Option[];
}

const $props = defineProps<{
  modelValue: T;
  options: Option[];
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
