<template>
  <div>
    <app-component :config="appConfig" :map="map" :on-setup="onSetupApp" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type { AppConfig } from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { HumanPlayer } from '@blue-might/app/lib/classes/player/Human';
import type MovableUnit from '@blue-might/app/lib/classes/unit/Movable';
import type { UnitIdentifier } from '@blue-might/app/lib/types/unit';
import { debugMap } from '@blue-might/maps';
import { filter, Subscription, map as rxjsMap } from 'rxjs';
import { onUnmounted, defineAsyncComponent, markRaw } from 'vue';
import { defu } from 'defu';
import type Faction from '@blue-might/app/lib/classes/Faction';
const subscription = new Subscription();

const $props = defineProps<{
  config?: Partial<AppConfig>;
  map?: Partial<MapDescription>;
  playerUnit?: UnitIdentifier;
  onSetup: (context: { app: App; map: Map }) => void;
}>();

const appConfig = defu($props.config ?? {}, {
  rendererOptions: {
    pixelated: false,
    controls: true
  }
});
onUnmounted(() => {
  subscription.unsubscribe();
});
const map_ = debugMap();
const map: MapDescription = defu($props.map ?? {}, {
  ...map_,
  factions: [...map_.factions],
  units: [...map_.units]
}) as MapDescription;

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

async function onSetupApp(app: App) {
  subscription.add(
    app.modules.map.observables.map$.subscribe(async map => {
      await setupPlayer(
        app,
        map.modules.faction.getFactionById('blue-faction')!
      );
      if (!map) return;
      $props.onSetup({
        app,
        map
      });
    })
  );
}
async function setupPlayer(app: App, faction: Faction) {
  let player = new HumanPlayer(app, {
    name: 'Player'
  });
  player.modules.faction.setFaction(faction);
  player = await app.modules.player.addPlayer(markRaw(player));
  if ($props.playerUnit) {
    subscription.add(
      app.modules.map.observables.map$
        .pipe(
          rxjsMap(map =>
            map?.modules.units.getById<MovableUnit>($props.playerUnit!)
          ),
          filter(Boolean)
        )
        .subscribe(vehicle => player.modules.vehicle.setVehicle(vehicle))
    );
  }
  return player;
}
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
