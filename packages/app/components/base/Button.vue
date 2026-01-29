<template>
  <component :is="tag ?? 'button'">
    <slot />
  </component>
</template>

<script setup lang="ts">
defineProps<{
  tag?: string;
}>();
</script>

<style lang="postcss" scoped>
button {
  display: inline-block;
  padding: 0;
  margin: 0;
  font: initial;
  font-family: var(--font-family-base);
  cursor: pointer;
  background: none;
  border: none;

  &[disabled] {
    pointer-events: none;
  }
}
</style>
