<template>
  <div>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, useHead, useRoute } from '#imports';
import useStats from '~/composables/useStats';

const $route = useRoute();

const { start: startStats, stop: stopStats } = useStats();

useHead({
  link: [
    {
      rel: 'shortcut icon',
      type: 'image/png',
      href: '/favicon.png'
    }
  ]
});

onMounted(async () => {
  if ('stats' in $route.query) {
    await startStats();
  }
});

onUnmounted(() => {
  stopStats();
});
</script>
