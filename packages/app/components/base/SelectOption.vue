<template>
  <optgroup
    v-if="options && options.length"
    :label="label"
    :disabled="options.every(option => option.disabled)">
    <bm-select-option
      v-for="option in options"
      :key="String(option.value ?? option.label)"
      :label="option.label"
      :value="option.value"
      :disabled="option.disabled"
      :model-value="modelValue"
      :selected="option.value === modelValue">
      {{ option.label }}
    </bm-select-option>
  </optgroup>
  <option
    v-else
    :value="value"
    :disabled="disabled"
    :selected="modelValue === value">
    {{ label }}
  </option>
</template>

<script lang="ts" setup generic="T">
import BmSelectOption from './SelectOption.vue';

defineProps<SelectOption<T>>();
</script>

<script lang="ts">
export interface SelectOption<T> {
  label: string;
  modelValue?: T;
  value?: T;

  options?: SelectOption<T>[];
  disabled?: boolean;
}
</script>

<style lang="postcss" scoped>
option {
  padding: var(--bm-spacing-small) var(--bm-spacing-medium);
}

optgroup {
  padding: var(--bm-spacing-small) 0;
}
</style>
