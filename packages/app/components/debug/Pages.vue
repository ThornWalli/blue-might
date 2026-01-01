<template>
  <bm-details label="Pages" class="bm-debug-pages">
    <ul>
      <li v-for="link in links" :key="link.title">
        <nuxt-link :href="link.href">{{ link.title }}</nuxt-link>
      </li>
    </ul>
  </bm-details>
</template>

<script lang="ts" setup>
// import BmButton from '../Button.vue';
import { ref } from 'vue';

import BmDetails from '../Details.vue';

const links = ref([
  { title: 'Default', href: '/' },
  { title: 'Attack', href: '/debug/attack' },
  { title: 'Patrol', href: '/debug/patrol' },
  { title: 'Helicopter', href: '/debug/helicopter' },
  { title: 'Tank', href: '/debug/tank' },
  { title: 'Pathfinding', href: '/debug/pathfinding' },
  { title: 'Building', href: '/debug/building' }
]);
</script>

<style lang="postcss" scoped>
a {
  --color-background: var(--color-green-dark);
  --color-background-hover: var(--color-green-mid);
  --color-foreground: var(--color-white);

  display: block;
  padding: var(--bm-spacing-small) var(--bm-spacing-small);
  font-size: 12px;
  color: var(--color-foreground);
  text-decoration: none;
  background: var(--color-background);

  &:hover,
  &.router-link-exact-active {
    background: var(--color-background-hover);
  }
}

ul {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--bm-spacing-small);

  & li {
    text-align: center;
  }
}
</style>
