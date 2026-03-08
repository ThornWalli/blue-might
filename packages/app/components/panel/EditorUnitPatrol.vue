<template>
  <bm-panel
    v-if="unit && patrolModule"
    class="bm-panel-editor-unit-patrol"
    title="Editor Unit Patrol">
    <bm-fieldset label="Settings">
      <bm-toggle
        :model-value="patrolActive"
        label="Patrol Active"
        @update:model-value="onUpdatePatrolActive" />
      <bm-toggle
        :model-value="patrolLoop"
        label="Patrol infinite loop"
        @update:model-value="onUpdatePatrolLoop" />
      <bm-form-field v-if="!patrolLoop" label="Patrol Rounds">
        <bm-textfield
          :model-value="patrolRounds"
          :el-attrs="{ type: 'number', min: 1, step: '1' }"
          @update:model-value="onUpdatePatrolRounds" />
      </bm-form-field>
    </bm-fieldset>
    <bm-fieldset label="Path">
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
              <span>
                <span>{{ `#${index + 1}` }}</span> {{ p[0].toFixed(2) }} /
                {{ p[1].toFixed(2) }}
              </span>
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
        <div class="controls">
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
          <div>
            <bm-button
              :icon="ICON.ARROW_UP"
              label="Up last item"
              hide-label
              @click="onClickLastItemUp" />
            <bm-button
              :icon="ICON.ARROW_DOWN"
              label="Down last item"
              hide-label
              @click="onClickLastItemDown" />
          </div>
        </div>
        <hr />
        <div class="controls">
          <div>
            <bm-button label="Copy to clipboard" @click="onClickCopy" />
            <bm-button label="Paste from clipboard" @click="onClickPaste" />
          </div>
          <bm-button label="Close" @click="onClickClose" />
        </div>
      </div>
    </bm-fieldset>
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { Subscription } from 'rxjs';
import type PatrolUnitModule from '@blue-might/app/lib/classes/unitModule/Patrol';
import { ICON } from '@blue-might/app/utils/icons';
import { Vector2 } from 'three';
import type { PatrolPath } from '@blue-might/app/lib/classes/unitModule/Patrol';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
// import type { UnitModules } from '@blue-might/app/lib/classes/Unit';

import BmPanel from '../Panel.vue';
import BmFieldset from '../Fieldset.vue';
import BmButton from '../Button.vue';
import BmToggle from '../Toggle.vue';
import BmFormField from '../FormField.vue';
import BmTextfield from '../Textfield.vue';

// type U = UnitModules & { patrol: PatrolUnitModule };
const unit = ref<Raw<Unit> | null>(null);
const patrolActive = ref(false);
const patrolLoop = ref(false);
const patrolRounds = ref(0);

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
const path = ref<PatrolPath>([]);

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    editorPatrolModule.observables.index$.subscribe(index => {
      currentIndex.value = index;
    })
  );
  subscription.add(
    editorPatrolModule.observables.path$.subscribe(p => {
      path.value = Array.from(p);
    })
  );
  subscription.add(
    editorPatrolModule.observables.unit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );
  subscription.add(
    editorPatrolModule.observables.active$.subscribe(v => {
      patrolActive.value = v;
    })
  );
  subscription.add(
    editorPatrolModule.observables.rounds$.subscribe(v => {
      patrolRounds.value = v;
    })
  );
  subscription.add(
    editorPatrolModule.observables.roundsLoop$.subscribe(v => {
      patrolLoop.value = v;
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

function onClickCopy() {
  if (editorPatrolModule) {
    const path = editorPatrolModule.getPath();
    navigator.clipboard.writeText(JSON.stringify(path));
  }
}

async function onClickPaste() {
  if (editorPatrolModule) {
    const text = await navigator.clipboard.readText();
    try {
      const path = JSON.parse(text);
      if (Array.isArray(path) === false || path[0].length !== 2) {
        throw new Error('Invalid path data');
      }
      editorPatrolModule.setPath(path);
    } catch (error) {
      console.error('Failed to parse clipboard text:', error);
      alert('Failed to paste patrol path');
    }
  }
}

function onClickLastItemUp() {
  if (editorPatrolModule) {
    editorPatrolModule.moveLastItemUp();
  }
}

function onClickLastItemDown() {
  if (editorPatrolModule) {
    editorPatrolModule.moveLastItemDown();
  }
}

function onUpdatePatrolActive(active: boolean) {
  editorPatrolModule.setActive(active);
}
function onUpdatePatrolLoop(v: boolean) {
  editorPatrolModule.setRoundsLoop(v);
}

function onUpdatePatrolRounds(rounds: number) {
  editorPatrolModule.setRounds(rounds);
}
</script>

<style lang="postcss" scoped>
.bm-panel-editor-unit-patrol {
  width: 280px;
  max-height: 100%;
  overflow: auto;

  & .items {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
  }

  & .controls {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);

    & button {
      flex: 1;
    }

    & > div {
      display: flex;
      flex-direction: row;
      gap: var(--bm-spacing-small);
      width: 100%;
    }
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
    font-family: var(--font-family-base);
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

    & + span {
      display: flex;

      & span {
        flex: 1;
        text-align: left;
      }
    }
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
