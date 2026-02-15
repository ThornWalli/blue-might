<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: true } } }"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/types/map';
import { FACTION } from '@blue-might/app/lib/utils/factions';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [2, 0, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'combat_helicopter_1',
      options: {
        moduleOptions: {
          movable: {
            active: true
          }
        },
        moduleDebug: {
          pathfinding: true
        }
      }
    }
  },
  units: [
    {
      key: 'tank_1',
      id: 'tank-1',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      moduleOptions: {
        movable: {
          active: true
        }
      },
      moduleDebug: {
        pathfinding: true
      }
    },
    {
      key: 'tree_1',
      id: 'tree-1',
      position: [-0.17, 0, 2.83],
      rotation: [0, 0, 0]
    }
  ]
};
</script>
