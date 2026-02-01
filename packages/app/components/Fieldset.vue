<template>
  <fieldset class="bm-fieldset">
    <legend>{{ label }}</legend>
    <div><slot /></div>
  </fieldset>
</template>

<script lang="ts" setup>
defineProps<{
  label: string;
}>();
</script>

<style lang="postcss" scoped>
.bm-fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
  padding: 0;
  margin: 0;
  border: none;

  & legend {
    display: flex;
    gap: var(--bm-spacing-medium);
    align-items: center;
    width: 100%;
    margin-bottom: var(--bm-spacing-medium);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: var(--bm-fieldset-foreground);

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
