<template>
  <bm-panel
    v-if="unit && ready"
    class="bm-panel-player-unit"
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
      <strong>Height:</strong> {{ ((position?.y ?? 0) * 2).toFixed(2) }} m<br />
    </p>
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
    app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(
          player => player?.modules.vehicle.observables.vehicle$ || EMPTY
        )
      )
      .subscribe(({ current }) => {
        unit.value = current ? markRaw(current) : null;
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
</script>

<style lang="postcss" scoped>
.bm-panel-player-unit {
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
