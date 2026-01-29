<template>
  <div class="bm-dialog-menu">
    <ul>
      <li v-for="link in links" :key="link.title">
        <nuxt-link :href="link.href">{{ link.title }}</nuxt-link>
      </li>
    </ul>
    <bm-details label="Debug">
      <ul>
        <li v-for="link in debugLinks" :key="link.title">
          <nuxt-link :href="link.href">{{ link.title }}</nuxt-link>
        </li>
      </ul>
    </bm-details>
    <ul>
      <li>
        <nuxt-link target="_blank" href="https://lammpee.de">Lammpee</nuxt-link>
      </li>
      <li>
        <nuxt-link
          target="_blank"
          href="https://github.com/ThornWalli/blue-might">
          Github
        </nuxt-link>
      </li>
    </ul>
    <div class="version">{{ version }}</div>
  </div>
</template>

<script lang="ts" setup>
import { inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import type { DialogContext } from '../base/Dialog.vue';
import BmDetails from '../Details.vue';

import { useRuntimeConfig } from '#imports';

const runtimeConfig = useRuntimeConfig();

const version = ref(runtimeConfig.public.version);

inject<DialogContext>('dialog')!;

defineProps<{
  app: App;
}>();

const links = ref([
  { title: 'Default', href: '/' },
  { title: 'Editor', href: '/editor' }
]);
const debugLinks = ref([
  { title: 'Attack', href: '/debug/attack' },
  { title: 'Patrol', href: '/debug/patrol' },
  { title: 'Helicopter', href: '/debug/helicopter' },
  { title: 'Tank', href: '/debug/tank' },
  { title: 'Pathfinding', href: '/debug/pathfinding' },
  { title: 'Building', href: '/debug/building' },
  { title: 'Sea', href: '/debug/sea' }
]);
</script>

<style lang="postcss" scoped>
.bm-dialog-menu {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
  width: 420px;

  & a {
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

  & ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--bm-spacing-small);

    & li {
      text-align: center;
    }
  }

  & .version {
    font-family: var(--font-family-base);
    font-size: 12px;
    font-style: italic;
    text-align: center;
    opacity: 0.6;
  }
}
</style>
