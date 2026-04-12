<template>
  <div class="bm-dialog-menu">
    <bm-fieldset label="Mode">
      <ul class="mode">
        <li v-for="link in links" :key="link.title">
          <bm-button :tag="NuxtLink" :href="link.href" :label="link.title" />
        </li>
      </ul>
    </bm-fieldset>
    <bm-fieldset label="Mission">
      <ul class="mission">
        <li v-for="link in missionLinks" :key="link.title">
          <bm-button :tag="NuxtLink" :href="link.href" :label="link.title" />
        </li>
      </ul>
    </bm-fieldset>
    <bm-details label="Debug">
      <ul class="debug">
        <li v-for="link in debugLinks" :key="link.title">
          <bm-button :tag="NuxtLink" :href="link.href" :label="link.title" />
        </li>
      </ul>
    </bm-details>
    <ul>
      <li>
        <bm-button
          :tag="NuxtLink"
          target="_blank"
          href="https://lammpee.de"
          label="Lammpee" />
      </li>
      <li>
        <bm-button
          :tag="NuxtLink"
          target="_blank"
          href="https://github.com/ThornWalli/blue-might"
          label="Github" />
      </li>
    </ul>
    <footer>
      <span>Blue-Might created by Thorn-Welf Walli</span>
      <span class="version">{{ version }}</span>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import type { DialogContext } from '../base/Dialog.vue';
import BmDetails from '../Details.vue';
import BmButton from '../Button.vue';
import BmFieldset from '../Fieldset.vue';

import NuxtLink from '#app/components/nuxt-link';
import { useRoute, useRuntimeConfig } from '#imports';

const runtimeConfig = useRuntimeConfig();

const version = ref(runtimeConfig.public.version);

inject<DialogContext>('dialog')!;

defineProps<{
  app: App;
}>();

const $route = useRoute();

const links = ref([
  {
    title: 'Game',
    href: {
      name: 'map',
      params: {
        map: $route.params.map ?? 'default.zip'
      }
    }
  },
  {
    title: 'Editor',
    href: {
      name: 'editor-map',
      params: {
        map: $route.params.map ?? 'default.zip'
      }
    }
  },
  {
    title: 'Debug',
    href: {
      name: 'debug-map',
      params: {
        map: $route.params.map ?? 'default.zip'
      }
    }
  }
]);

const missionLinks = ref([
  {
    title: 'Example',
    href: {
      name: 'map',
      params: {
        map: 'default.zip'
      }
    }
  },
  {
    title: 'Mission 1',
    href: {
      name: 'map',
      params: {
        map: 'mission_1.zip'
      }
    }
  },
  {
    title: 'Mission 2 (Progress…)',
    href: {
      name: 'map',
      params: {
        map: 'mission_2.zip'
      }
    }
  }
]);
const debugLinks = ref([
  {
    title: 'Default',
    href: {
      path: '/debug'
    }
  },
  {
    title: 'Helicopter',
    href: {
      name: 'debug-map',
      params: { map: 'debug/helicopter.zip' }
    }
  },
  {
    title: 'Tank',
    href: {
      name: 'debug-map',
      params: { map: 'debug/tank.zip' }
    }
  },
  {
    title: 'Turret',
    href: {
      name: 'debug-map',
      params: { map: 'debug/turret.zip' }
    }
  },
  {
    title: 'Rescue',
    href: {
      name: 'debug-map',
      params: { map: 'debug/rescue.zip' }
    }
  },
  {
    title: 'Building',
    href: {
      name: 'debug-map',
      params: { map: 'debug/building.zip' }
    }
  },
  {
    title: 'Carrier',
    href: {
      name: 'debug-map',
      params: { map: 'debug/carrier.zip' }
    }
  }
]);
</script>

<style lang="postcss" scoped>
.bm-dialog-menu {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);
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
    --columns: 2;

    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
    gap: var(--bm-spacing-small);

    & li {
      text-align: center;
    }

    &.mode {
      --columns: 3;
    }

    &.mission {
      --columns: 1;
    }

    &.debug {
      --columns: 3;
    }
  }

  & footer {
    display: flex;
    gap: var(--bm-spacing-small);
    justify-content: center;
    font-family: var(--font-family-base);
    font-size: 12px;
    opacity: 0.6;

    & * + * {
      &::before {
        padding-right: var(--bm-spacing-small);
        font-style: normal;
        content: '|';
      }
    }

    & .version {
      font-style: italic;
    }
  }
}
</style>
