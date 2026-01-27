<template>
  <bm-panel
    v-if="unit && patrolModule"
    class="bm-panel-editor-unit-patrol"
    title="Editor Unit Patrol">
    <fieldset>
      <legend>Settings</legend>
      <bm-toggle
        :model-value="patrolActive"
        label="Patrol Active"
        @update:model-value="onUpdatePatrolActive" />
    </fieldset>
    <fieldset>
      <legend>Path</legend>
      <div class="items">
        <template v-for="(p, index) in path" :key="index">
          <div v-if="currentIndex === index">
            <bm-button
              :icon="ICON.PLUS"
              label="Add"
              hide-label
              @click="onClickAddBefore" />
          </div>
          <div class="item">
            <input
              :id="`patrol-path-${index}`"
              type="radio"
              :checked="currentIndex === index"
              @change="editorPatrolModule?.setIndex(index)" />
            <label :for="`patrol-path-${index}`">
              <div class="indicator"></div>
              <span>{{ p[0].toFixed(2) }} / {{ p[1].toFixed(2) }}</span>
            </label>
            <bm-button
              :icon="ICON.CHEVRON_UP"
              hide-label
              label="Add Path"
              @click="onClickMoveUp(index)" />
            <bm-button
              :icon="ICON.CHEVRON_DOWN"
              hide-label
              label="Add Path"
              @click="onClickMoveDown(index)" />
            <bm-button
              :icon="ICON.EYE_DROPPER"
              hide-label
              label="Edit"
              @click="onClickEdit(index)" />
            <bm-button
              :icon="ICON.TRASH"
              hide-label
              label="Delete"
              @click="onClickDelete(index)" />
          </div>
          <div v-if="currentIndex === index">
            <bm-button
              :icon="ICON.PLUS"
              label="Add"
              hide-label
              @click="onClickAddAfter" />
          </div>
        </template>
        <bm-button
          v-if="path.length < 1"
          label="Add first point"
          @click="onClickAdd" />
        <bm-button
          v-else
          :icon="ICON.PLUS"
          label="Add"
          hide-label
          @click="onClickAdd" />
        <div class="controls">
          <bm-button label="Close" @click="onClickClose" />
        </div>
      </div>
    </fieldset>
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import type PatrolUnitModule from '@blue-might/app/lib/classes/unitModule/Patrol';
import { ICON } from '@blue-might/app/utils/icons';
import { Vector2 } from 'three';
import type { PatrolPath } from '@blue-might/app/lib/classes/unitModule/Patrol';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { UnitModules } from '@blue-might/app/lib/classes/Unit';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmToggle from '../Toggle.vue';

type U = UnitModules & { patrol: PatrolUnitModule };
const unit = ref<Raw<Unit> | null>(null);
const patrolActive = ref(false);

const currentIndex = ref<number | null>(0);

const $props = defineProps<{
  app: AppEditor;
}>();

const $emit = defineEmits<{
  (e: 'close'): void;
}>();

const patrolModule = computed(() => {
  if (unit.value && 'patrol' in unit.value.modules) {
    return unit.value.modules.patrol as PatrolUnitModule;
  }
  return null;
});

const editorPatrolModule = $props.app.modules.editorPatrol;
const path = ref<PatrolPath>(editorPatrolModule.getPath() ?? []);

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    editorPatrolModule.observables.index$.subscribe(index => {
      currentIndex.value = index;
    })
  );
  subscription.add(
    editorPatrolModule.observables.unit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );
  subscription.add(
    $props.app.modules.editorUnits.observables.unit$
      .pipe(
        switchMap(u => (u?.modules as U)?.patrol?.observables.active$ ?? EMPTY)
      )
      .subscribe(v => {
        patrolActive.value = v;
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function getCurrentPosition() {
  if ('editorGrid' in $props.app.modules) {
    return $props.app.modules.editorGrid.getCurrentPosition();
  }
  return new Vector2(0, 0);
}

function onClickEdit(_index: number) {
  if (patrolModule.value) {
    const position = getCurrentPosition().toArray();
    const _path = path.value.slice();
    _path[_index] = position;
    setPath(_path);
  }
}

function onClickDelete(index: number) {
  const _path = path.value.slice();
  _path.splice(index, 1);
  setPath(_path);
}

function onClickAdd() {
  const position = getCurrentPosition().toArray();
  const _path = path.value.slice();
  if (currentIndex.value !== null) {
    _path.splice(currentIndex.value + 1, 0, position);
  } else {
    _path.push(position);
  }
  setPath(_path);
}
function onClickAddBefore() {
  const position = getCurrentPosition().toArray();
  const _path = path.value.slice();
  if (currentIndex.value !== null) {
    _path.splice(currentIndex.value, 0, position);
  } else {
    _path.unshift(position);
  }
  setPath(_path);
  editorPatrolModule.setIndex(
    currentIndex.value !== null ? currentIndex.value : 0
  );
}
function onClickAddAfter() {
  const position = getCurrentPosition().toArray();
  const _path = path.value.slice();
  if (currentIndex.value !== null) {
    _path.splice(currentIndex.value + 1, 0, position);
  } else {
    _path.push(position);
  }
  setPath(_path);
  editorPatrolModule.setIndex(
    currentIndex.value !== null ? currentIndex.value + 1 : _path.length - 1
  );
}

function onClickMoveUp(index: number) {
  if (index >= 0) {
    const _path = path.value.slice();
    const lastPosition = _path[index - 1];
    if (lastPosition && _path[index]) {
      _path[index - 1] = _path[index];
      _path[index] = lastPosition;
    }
    setPath(_path);
    editorPatrolModule.setIndex(
      currentIndex.value !== null ? currentIndex.value - 1 : 0
    );
  }
}
function onClickMoveDown(index: number) {
  if (index < path.value.length - 1) {
    const _path = path.value.slice();
    const nextPosition = _path[index + 1];
    if (nextPosition && _path[index]) {
      _path[index + 1] = _path[index];
      _path[index] = nextPosition;
    }
    setPath(_path);
    editorPatrolModule.setIndex(
      currentIndex.value !== null ? currentIndex.value + 1 : _path.length - 1
    );
  }
}

function setPath(newPath: PatrolPath) {
  if (editorPatrolModule) {
    editorPatrolModule.setPath(newPath);
    path.value = newPath;
  }
}

function onClickClose() {
  $emit('close');
}

function onUpdatePatrolActive(active: boolean) {
  if (unit.value) {
    (unit.value.modules as U).patrol.setActive(active);
  }
}
</script>

<style lang="postcss" scoped>
.bm-panel-editor-unit-patrol {
  width: 280px;

  & .items {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
  }

  & .controls {
    display: flex;
  }
}

.item {
  position: relative;
  display: flex;
  flex-direction: row;
  gap: var(--bm-spacing-small);
  align-items: center;

  &:has(input:checked) .indicator {
    background-color: #fd2;
  }

  &:hover,
  &:has(input:checked) {
    background-color: var(--color-gray-very-dark);
  }

  & label {
    display: flex;
    flex: 1;
    gap: var(--bm-spacing-small);
    align-items: center;
    min-width: 80px;
    font-family: var(--font-base);
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;

    & span {
      flex: 1;
      text-align: right;
    }
  }

  & input {
    position: absolute;
    top: 0;
    left: 0;

    /* width: 100%;
    height: 100%; */
    opacity: 0;
  }

  & .indicator {
    display: block;
    width: 16px;
    height: 16px;
    background-color: var(--color-gray-very-dark);
    border: solid #303030 2px;
  }
}

.controls {
  display: flex;
  gap: var(--bm-spacing-small);

  & > * {
    flex: 1;
  }
}
</style>
