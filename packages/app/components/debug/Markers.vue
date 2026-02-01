<template>
  <bm-details class="bm-debug-markers" label="Position Markers">
    <div class="markers">
      <div
        v-for="marker in positionMarkers"
        :key="marker.position.toArray().join('-')">
        <span>
          {{
            marker.position
              .toArray()
              .map(v => v.toFixed(2))
              .join(' / ')
          }}
        </span>
        <bm-button label="Top" @click="onClickMarkerUp(marker)" />
        <bm-button label="Bottom" @click="onClickMarkerDown(marker)" />
        <bm-button label="X" @click="onClickMarkerRemove(marker)" />
      </div>
    </div>
    <div class="actions">
      <bm-button
        :label="startAddMarker ? 'Abort' : 'Add'"
        @click="onClickAddMarker" />
      <bm-button label="JSON" @click="onClickCopyPositions" />
    </div>
  </bm-details>
</template>

<script lang="ts" setup>
import type { PositionMarker } from '@blue-might/app/lib/classes/appModule/Debug';
import { computed, onMounted, ref } from 'vue';
import { merge, Subscription } from 'rxjs';
import type { App } from '@blue-might/app/lib/types';
import type DebugAppModule from '@blue-might/app/lib/classes/appModule/Debug';

import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

const subscription = new Subscription();

const startAddMarker = ref<boolean>(false);
const positionMarkers = ref<PositionMarker[]>([]);

const $props = defineProps<{
  app: App;
}>();

const debugModule = computed(() => {
  const app = $props.app;
  if ('debug' in app.modules) {
    return app.modules.debug as DebugAppModule;
  }
  return null;
});

onMounted(() => {
  if (debugModule.value) {
    subscription.add(
      debugModule.value.observables.positionMarkers$.subscribe(positions => {
        positionMarkers.value = positions;
      })
    );
    subscription.add(
      merge(
        debugModule.value.observables.abortAddMarker$,
        debugModule.value.observables.endAddMarker$
      ).subscribe(() => {
        startAddMarker.value = false;
      })
    );
    subscription.add(
      debugModule.value.observables.startAddMarker$.subscribe(() => {
        startAddMarker.value = true;
      })
    );
  }
});

function onClickAddMarker() {
  if (startAddMarker.value) {
    debugModule.value?.abortAddMarker();
  } else {
    debugModule.value?.startAddMarker();
  }
}

function onClickMarkerUp(marker: PositionMarker) {
  debugModule.value?.moveMarkerUp(marker);
}

function onClickMarkerDown(marker: PositionMarker) {
  debugModule.value?.moveMarkerDown(marker);
}

function onClickMarkerRemove(marker: PositionMarker) {
  debugModule.value?.removeMarker(marker);
}

function onClickCopyPositions() {
  if (!debugModule.value) return;
  const markers = debugModule.value.getPositionMarkers();
  const positions = markers
    .map(
      marker =>
        `[${marker.position.x.toFixed(2)}, ${marker.position.y.toFixed(2)}]`
    )
    .join(', ');
  navigator.clipboard.writeText(positions);
}
</script>

<style lang="postcss" scoped>
.markers + .actions {
  display: grid;
  flex-direction: row;
  grid-template-columns: auto auto;
  gap: var(--bm-spacing-small);
}

.markers > div {
  display: flex;
  flex-direction: row;
  gap: var(--bm-spacing-small);
  align-items: center;
  margin-bottom: var(--bm-spacing-small);
  font-size: 12px;
}
</style>
