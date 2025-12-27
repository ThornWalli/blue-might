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
        <bm-button @click="onClickMarkerUp(marker)">Top</bm-button>
        <bm-button @click="onClickMarkerDown(marker)">Bottom</bm-button>
        <bm-button @click="onClickMarkerRemove(marker)">X</bm-button>
      </div>
    </div>
    <div class="actions">
      <bm-button @click="onClickAddMarker">
        {{ startAddMarker ? 'Abort' : 'Add' }}
      </bm-button>
      <bm-button @click="onClickCopyPositions"> JSON </bm-button>
    </div>
  </bm-details>
</template>

<script lang="ts" setup>
import type { PositionMarker } from '@blue-might/app/lib/classes/appModule/Debug';
import { onMounted, ref } from 'vue';
import { merge, Subscription } from 'rxjs';

import type App from '../../lib/classes/App';
import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

const subscription = new Subscription();

const startAddMarker = ref<boolean>(false);
const positionMarkers = ref<PositionMarker[]>([]);

const $props = defineProps<{
  app: App;
}>();

onMounted(() => {
  const app = $props.app;

  subscription.add(
    app.modules.debug.observables.positionMarkers$.subscribe(positions => {
      positionMarkers.value = positions;
    })
  );
  subscription.add(
    merge(
      app.modules.debug.observables.abortAddMarker$,
      app.modules.debug.observables.endAddMarker$
    ).subscribe(() => {
      startAddMarker.value = false;
    })
  );
  subscription.add(
    app.modules.debug.observables.startAddMarker$.subscribe(() => {
      startAddMarker.value = true;
    })
  );
});

function onClickAddMarker() {
  const app = $props.app;
  if (startAddMarker.value) {
    app.modules.debug.abortAddMarker();
  } else {
    app.modules.debug.startAddMarker();
  }
}

function onClickMarkerUp(marker: PositionMarker) {
  $props.app.modules.debug.moveMarkerUp(marker);
}

function onClickMarkerDown(marker: PositionMarker) {
  $props.app.modules.debug.moveMarkerDown(marker);
}

function onClickMarkerRemove(marker: PositionMarker) {
  $props.app.modules.debug.removeMarker(marker);
}

function onClickCopyPositions() {
  const app = $props.app;
  const markers = app.modules.debug.getPositionMarkers();
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
