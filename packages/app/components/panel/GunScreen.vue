<template>
  <bm-panel
    v-if="unit"
    hide-title
    class="bm-panel-gun-screen"
    :class="{ fullscreen }"
    title="Gun Screen">
    <teleport to="#testtt" :disabled="!fullscreen">
      <bm-gun-screen
        :app="$props.app"
        :unit="unit"
        @fullscreen="fullscreen = $event" />
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, ref, type Raw } from 'vue';
import { EMPTY, map, Subscription, switchMap } from 'rxjs';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import type { UnitModules } from '@blue-might/app/lib/classes/Unit';

import BmGunScreen from '../GunScreen.vue';
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';

const fullscreen = ref(false);

const $props = defineProps<{
  app: App;
}>();

const subscription = new Subscription();

const unit = ref<Raw<Unit<UnitModules & { weapon: WeaponUnitModule }>> | null>(
  null
);

onMounted(() => {
  subscription.add(
    $props.app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(player => player?.modules.vehicle.observables.unit$ ?? EMPTY),
        map(
          unit =>
            unit as Unit<UnitModules & { weapon: WeaponUnitModule }> | null
        )
      )
      .subscribe(u => {
        unit.value = u?.modules.weapon ? markRaw(u) : null;
      })
  );
});
</script>

<style lang="postcss" scoped>
.bm-panel-gun-screen {
  &.fullscreen {
    display: none;
  }

  & .bm-gun-screen {
    width: 120px;
  }
}
</style>
