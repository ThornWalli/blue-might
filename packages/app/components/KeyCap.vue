<template>
  <div class="bm-key-cap" :class="`direction-${direction ?? 'bottom-right'}`">
    <span class="key">{{ value }}</span>
    <div class="description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string;
  description: string;
  direction?: 'top' | 'bottom' | 'right' | 'top-right' | 'bottom-right';
}>();
</script>

<style lang="postcss" scoped>
.bm-key-cap {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: calc(40 / 16 * 1em);
  height: calc(38 / 16 * 1em);
  padding: var(--bm-spacing-medium);
  font-family: var(--font-family-base);
  font-size: 14px;
  color: white;
  border: solid 2px currentColor;
  border-radius: 3px;

  & .key {
    font-weight: bold;
  }

  & .description {
    position: absolute;
    left: 100%;

    /* margin-left: var(--bm-spacing-medium); */
    font-size: calc(14 / 16 * 1em);
    white-space: nowrap;
  }

  &.direction-top {
    & .description {
      bottom: 100%;
      left: 50%;
      margin-bottom: var(--bm-spacing-large);
      transform: translateX(-50%);
    }
  }

  &.direction-bottom {
    & .description {
      top: 100%;
      bottom: auto;
      left: 50%;
      transform: translateX(-50%);
    }
  }

  &.direction-left {
    & .description {
      right: 100%;
      left: auto;
      margin-right: var(--bm-spacing-large);
    }
  }

  &.direction-right {
    & .description {
      left: 100%;
      margin-left: var(--bm-spacing-large);
    }
  }

  &.direction-top-right {
    & .description {
      top: auto;
      bottom: 100%;
      left: 100%;
      margin-bottom: var(--bm-spacing-medium);
      transform: rotate(-45deg);
      transform-origin: left center;
    }
  }

  &.direction-bottom-right {
    & .description {
      top: 100%;
      bottom: auto;
      left: 100%;
      margin-top: var(--bm-spacing-medium);
      transform: rotate(45deg);
      transform-origin: left center;
    }
  }
}
</style>
