<template>
  <bm-panel
    v-if="unit && ready"
    class="bm-panel-unit-preview"
    :title="panelTitle">
    <div :key="unit.key" class="preview">
      <div>
        <bm-object-preview-unit
          v-if="previewOptions"
          :app="app"
          :ratio="1"
          :size="null"
          :model-value="previewOptions" />
      </div>
    </div>

    <p>
      <span>Pos.:</span>
      {{ position?.clone().round().toArray().join(' / ') }}<br />
    </p>
    <bm-button :disabled="!canUseVehicle" @click="onClickUseVehicle"
      >Use Vehicle</bm-button
    >
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '../../lib/classes/Unit';
import BmObjectPreviewUnit from '../objectPreview/Unit.vue';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import type { Vector3 } from 'three';
import BmButton from '../Button.vue';
import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';

const $props = defineProps<{
  app: App;
}>();

const unit = ref<Raw<Unit> | null>(null);

const player = computed(() => unit.value?.modules.player.getPlayer());
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

const ready = ref(false);
const subscription = new Subscription();
const position = ref<Vector3 | null>(null);

async function setup() {
  const app = $props.app;

  subscription.add(
    app.modules.selection.observables.selectUnit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );

  subscription.add(
    app.modules.selection.observables.selectUnit$
      .pipe(
        switchMap(unit => {
          if (!unit) return EMPTY;
          return unit.observables.position$;
        })
      )
      .subscribe(p => {
        position.value = p;
      })
  );

  ready.value = true;
}

onMounted(() => {
  setup();
});

onUnmounted(() => {
  subscription.unsubscribe();
});

const previewOptions = computed(() => {
  if (!unit.value) return null;
  return {
    type: unit.value.key,
    action: 'idle'
  };
});

const canUseVehicle = computed(() => {
  if (!unit.value) return false;
  return (
    unit.value instanceof VehicleUnit && !unit.value.modules.player.hasPlayer()
  );
});

function onClickUseVehicle() {
  if (!unit.value) return;
  if (unit.value instanceof VehicleUnit) {
    const app = $props.app;
    const player = app.modules.player.getCurrentPlayer();
    if (!player) return;

    player.modules.vehicle.setVehicle(unit.value as VehicleUnit);
    unit.value.modules.player.setPlayer(player);
  }
}
</script>

<style lang="postcss" scoped>
.bm-panel-unit-preview {
  & .preview {
    position: relative;
    width: 128px;
    padding: var(--bm-spacing-medium) var(--bm-spacing-large);
    background-color: #000;

    & > div {
      position: relative;

      &::before {
        display: block;
        width: 100%;
        padding-top: calc(100% * 1);
        content: '';
      }

      & > * {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
      }
    }
  }

  p {
    font-size: 12px;

    & span {
      font-weight: bold;
    }
  }

  & .actions {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: center;
  }
}
</style>
