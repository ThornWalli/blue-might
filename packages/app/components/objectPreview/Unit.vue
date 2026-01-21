<template>
  <bm-object-preview
    v-if="root"
    :cache-key="modelValue ? JSON.stringify(modelValue) : undefined"
    :root="root"
    :app="app"
    :mode="mode"
    :width="width ?? 'auto'"
    :ratio="ratio"
    :hydrate-when-visible="hydrateWhenVisible"
    class="bm-object-preview-unit"
    :title="title"
    @animation-loop="!animationLoop$.closed && animationLoop$.next($event)" />
</template>

<script lang="ts" setup>
import type { Vector3 } from 'three';
import { Object3D } from 'three';
import { markRaw, onUnmounted, ref, type Raw } from 'vue';
import { Subscription, Subject } from 'rxjs';
import * as units from '@blue-might/units';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';

import BmObjectPreview from '../ObjectPreview.vue';
import type { AnimationLoopValue } from '../../lib/classes/Renderer';
import type App from '../../lib/classes/App';

const unitMap = new Map(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.values(units).map(unit => [unit.KEY, unit] as [string, any])
);

const $props = defineProps<{
  app: App;
  mode?: 'static' | 'loop';
  width?: number | 'auto';
  ratio: number;
  modelValue: UnitPreview;
  hydrateWhenVisible?: boolean;
  showGround?: boolean;
  size?: Vector3 | null;
  title?: string;
}>();

const root = ref<Object3D>(new Object3D());

const animationLoop$ = new Subject<AnimationLoopValue>();

onUnmounted(() => {
  unitInstance.value?.destroy();
  root.value.remove();
  animationLoop$.unsubscribe();
  unitSubscriptions?.unsubscribe();
});

let unitSubscriptions: Subscription;

const unitInstance = ref<Raw<Unit> | null>(null);

async function setup(data: UnitPreview) {
  const UnitClass = (await unitMap.get(
    data.type as keyof typeof units
  )) as unknown as { new (options: Partial<UnitConstructorOptions>): Unit };
  unitInstance.value = markRaw(
    new UnitClass({
      preview: true,
      moduleOptions: {
        faction: {
          factionOverride:
            $props.app.modules.map
              .getMap()
              ?.modules.faction.getFactionById(data.faction ?? 'neutral') ||
            undefined
        }
      }
    }) as Unit
  );

  const instance = unitInstance.value;
  await instance.setup({});
  await instance.afterSetup({});

  unitSubscriptions?.unsubscribe();
  unitSubscriptions = new Subscription();

  return new Promise<Object3D>(resolve => {
    unitSubscriptions.add(
      instance.observables.materialReady$.subscribe(() => {
        unitSubscriptions.add(
          animationLoop$.subscribe(value => {
            unitInstance.value!.update(value);
          })
        );
        if (instance.modules.animation) {
          if (data.action) {
            instance.modules.animation.playAction(data.action);
          } else {
            instance.modules.animation.playAction('idle');
          }
        }
        resolve(instance.root);
      })
    );
  });
}

root.value = markRaw(await setup($props.modelValue));
</script>

<script lang="ts">
export interface UnitPreview {
  type: string;
  faction?: FactionIdentifier;
  action: string;
}
</script>

<style lang="postcss" scoped>
.bm-object-preview-unit {
  /* empty */
}
</style>
