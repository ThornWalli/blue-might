<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: true } } }"
      :on-setup="onSetup"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
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

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
