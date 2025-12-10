<template>
  <button>
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
button {
  display: inline-block;
  padding: 0;
  margin: 0;
  font: initial;
  font-family: var(--font-base);
  cursor: pointer;
  background: none;
  border: none;

  &[disabled] {
    pointer-events: none;
  }
}
</style>
