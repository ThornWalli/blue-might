<template>
  <details>
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
details {
  padding: 2px;
}

details summary {
  margin-bottom: var(--bm-spacing-medium);
  font-size: 12px;
  font-weight: bold;
}

details > div {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
}
</style>
