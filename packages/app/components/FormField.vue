<template>
  <div
    class="bm-form-field"
    :class="{
      'label-top': labelTop,
      [`mode-${mode}`]: mode,
      [`style-${styleType ?? 'light'}`]: true
    }">
    <label
      v-if="!hideLabel || $slots.label"
      :for="preparedId"
      :class="{ colon: !hideColon }">
      <slot name="label" :label="label">{{ label }}</slot>
    </label>
    <slot :id="preparedId"></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed, useId } from 'vue';

const defaultId = useId();

const $props = defineProps<{
  id?: string;
  label?: string;
  labelTop?: boolean;
  hideLabel?: boolean;
  hideColon?: boolean;
  mode?: 'compact';
  styleType?: 'dark' | 'light';
}>();

const preparedId = computed(() => $props.id || defaultId);
</script>

<style lang="postcss" scoped>
.bm-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);

  &:not(.label-top) {
    flex-direction: row;
    gap: var(--bm-spacing-small);
    align-items: center;
  }

  & label {
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;
    user-select: none;

    &.colon {
      &::after {
        content: ':';
      }
    }
  }

  & > *:not(label) {
    flex: 1;
  }
}
</style>
