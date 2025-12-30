<template>
  <bm-panel
    v-if="unit && ready"
    class="bm-panel-unit-preview"
    :title="panelTitle">
    <div>
      <div
        class="graph damage"
        :class="{
          destroyed: unitDamage.value >= DAMAGE_LEVEL.DESTROYED / 2,
          damaged: unitDamage.value >= DAMAGE_LEVEL.DAMAGED / 2
        }"
        :style="{
          '--value': 1 - unitDamage.value
        }">
        <div class="label">D</div>
        <div>
          <div></div>
        </div>
      </div>
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
    </div>
    <p>
      <span>Pos.:</span>
      {{ position?.round().toArray().join(' / ') }}<br />
    </p>
    <bm-button v-if="canFocusUnit" @click="onClickFocusUnit">
      Focus Unit
    </bm-button>
    <bm-button v-if="canUseVehicle" @click="onClickUseVehicle">
      Use Vehicle
    </bm-button>
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { EMPTY, map, Subscription, switchMap } from 'rxjs';
import type { Vector3 } from 'three';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import type MovableUnit from '@blue-might/app/lib/classes/unit/Movable';
import { DAMAGE_LEVEL } from '@blue-might/app/lib/classes/unitModule/Damage';

import BmButton from '../Button.vue';
import type App from '../../lib/classes/App';
import BmPanel from '../Panel.vue';
import BmObjectPreviewUnit from '../objectPreview/Unit.vue';
import type Unit from '../../lib/classes/Unit';

const $props = defineProps<{
  app: App;
}>();

const unit = ref<Raw<Unit> | null>(null);
const unitDamage = ref<{
  value: number;
  level: number;
}>({
  value: 0,
  level: 0
});

const player = computed(() =>
  unit.value?.getModuleByType(PlayerUnitModule)?.getPlayer()
);
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

const ready = ref(false);
const subscription = new Subscription();
const position = ref<Vector3 | null>(null);

async function setup() {
  const app = $props.app;

  const selectedUnit$ = app.modules.selection.observables.selectUnit$;
  subscription.add(
    selectedUnit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );

  subscription.add(
    selectedUnit$
      .pipe(switchMap(unit => unit?.observables.position$ ?? EMPTY))
      .subscribe(p => {
        position.value = p.clone();
      })
  );

  subscription.add(
    selectedUnit$
      .pipe(
        switchMap(
          unit =>
            unit?.modules.damage.observables.damage$.pipe(
              map(() => ({
                value: unit?.modules.damage.getDamageValue(),
                level: unit?.modules.damage.getDamageLevel()
              }))
            ) ?? EMPTY
        )
      )
      .subscribe(value => (unitDamage.value = value))
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
    faction: unit.value.modules.faction.getFaction(),
    action: 'idle'
  };
});

const canUseVehicle = computed(() => {
  if (!unit.value) return false;

  const playerUnitModule = unit.value.getModuleByType(PlayerUnitModule);
  return playerUnitModule && !playerUnitModule.hasPlayer();
});

const canFocusUnit = ref(true);

function onClickUseVehicle() {
  const u = unit.value;
  if (!u) return;
  if (u.hasModuleType(MovableUnitModule)) {
    const app = $props.app;
    const player = app.modules.player.getCurrentPlayer();

    if (!player) return;
    player.modules.vehicle.setVehicle(u as MovableUnit);
    u.getModuleByType(PlayerUnitModule)?.setPlayer(player);
    unit.value = u;
  }
}

function onClickFocusUnit() {
  const u = unit.value;
  if (!u) return;
  const app = $props.app;
  app.modules.unitFocus.focus(u);
}
</script>

<style lang="postcss" scoped>
.bm-panel-unit-preview {
  & .graph {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 16px;

    & .label {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    & .label + div {
      position: relative;
      flex: 1;
      background: #222;
    }
  }

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

:deep(.content) {
  & > div:first-child {
    display: flex;
    gap: var(--bm-spacing-small);
  }
}

.damage {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 16px;

  --color: green;

  &.damaged {
    --color: yellow;
  }

  &.destroyed {
    --color: red;
  }

  & .label + div {
    position: relative;
    flex: 1;

    & > div {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(100% * var(--value));
      background-color: var(--color);
    }
  }
}
</style>
