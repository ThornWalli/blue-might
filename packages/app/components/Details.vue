<template>
  <details class="bm-details">
    <summary>{{ label }}</summary>
    <div><slot /></div>
  </details>
</template>

<script lang="ts" setup>
defineProps<{
  label: string;
}>();
</script>

<style lang="postcss" scoped>
.bm-details {
  padding: 2px;

  &[open] summary {
    &::before {
      background: var(--bm-fieldset-border-color);
    }
  }

  & summary {
    display: flex;
    gap: var(--bm-spacing-medium);
    align-items: center;
    width: 100%;
    margin-bottom: var(--bm-spacing-medium);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: var(--bm-fieldset-foreground);
    cursor: pointer;

    &::before {
      width: 1em;
      height: 1em;
      content: '';
      background: transparent;
      border: solid var(--bm-fieldset-border-color) 2px;
    }

    &::after {
      flex: 1;
      content: '';
      border-top: solid var(--bm-fieldset-border-color) 2px;
    }
  }

  & > div {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
  }
}
</style>
