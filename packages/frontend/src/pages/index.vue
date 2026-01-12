<template>
  <div>
    <client-only>
      <app-component
        :config="config"
        :map="extendedMap()"
        :on-setup="onSetup" />
    </client-only>
  </div>
</template>

<script lang="ts" setup>
import { APP_MODE, type AppConfig } from '@blue-might/app/lib/classes/App';
import { defineAsyncComponent, markRaw, onUnmounted, ref } from 'vue';
import { extendedMap } from '@blue-might/maps';
import { HumanPlayer } from '@blue-might/app/lib/classes/player/Human';
import { filter, map, Subscription } from 'rxjs';
import type MovableUnit from '@blue-might/app/lib/classes/unit/Movable';
import type App from '@blue-might/app/lib/classes/App';
import { playerFaction } from '@blue-might/maps/default';
import FactionModule from '@blue-might/app/lib/classes/playerModule/Faction';

const subscription = new Subscription();

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

const config = ref<AppConfig>({
  mode: APP_MODE.PLAYGROUND,
  rendererOptions: {
    fog: true,
    pixelated: true,
    controls: true
  },
  debug: {
    map: {
      pathfinding: false
    }
  }
});

async function onSetup(app: App) {
  await setupPlayer(app);
}

async function setupPlayer(app: App) {
  const player = await app.modules.player.addPlayer(
    markRaw(
      new HumanPlayer(app, {
        name: 'Player',
        moduleStates: {
          [FactionModule.TYPE]: {
            faction: playerFaction
          }
        }
      })
    )
  );
  subscription.add(
    app.modules.map.observables.map$
      .pipe(
        map(map =>
          map?.modules.units.getById<MovableUnit>('combat-helicopter-1')
        ),
        filter(Boolean)
      )
      .subscribe(vehicle => player.modules.vehicle.setVehicle(vehicle))
  );
}

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
div {
  position: relative;
  height: 100vh;
  height: 100svh;
}

.bm-app {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
