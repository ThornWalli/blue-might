<template>
  <bm-panel v-if="unit" class="bm-panel-gun-screen" title="Gun Screen">
    <bm-gun-screen :app="$props.app" :unit="unit" />
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, ref, type Raw } from 'vue';
import { EMPTY, map, Subscription, switchMap } from 'rxjs';
import type Unit from '@blue-might/app/lib/classes/Unit';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';

import BmGunScreen from '../GunScreen.vue';
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';

const $props = defineProps<{
  app: App;
}>();

const subscription = new Subscription();

const unit = ref<Raw<Unit> | null>(null);

onMounted(() => {
  subscription.add(
    $props.app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(
          player => player?.modules.vehicle.observables.vehicle$ ?? EMPTY
        ),
        map(({ current }) => current)
      )
      .subscribe(u => {
        unit.value = u?.hasModuleType(WeaponUnitModule) ? markRaw(u) : null;
      })
  );
});
</script>

<style lang="postcss" scoped>
.bm-gun-screen {
  width: 120px;
}
</style>
