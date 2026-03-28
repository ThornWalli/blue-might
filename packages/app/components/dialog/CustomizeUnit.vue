<template>
  <div class="bm-dialog-customize-unit">
    <bm-fieldset label="Weapon">
      <div class="weapons">
        <button
          v-for="slot in weaponSlots"
          :key="slot.index"
          :class="{ selected: currentSlot === slot }"
          @click="onClickWeaponSlot(slot)">
          <img :src="slot.thumb" :alt="slot.weapon.name" />
          <span>{{ slot.weapon.name }}</span>
        </button>
      </div>
    </bm-fieldset>
    <bm-fieldset v-if="filteredProjectiles.length" label="Projectile">
      <div class="projectiles">
        <button
          v-for="projectile in filteredProjectiles"
          :key="projectile.id"
          :class="{
            selected: currentSlot?.weapon.projectile.id === projectile.id
          }"
          @click="onClickProjectile(projectile)">
          <img :src="projectile.thumb" :alt="projectile.name" />
          <span>{{ projectile.shortName }}</span>
        </button>
      </div>
      <div class="info">{{ currentSlot?.weapon.projectile.description }}</div>
    </bm-fieldset>
  </div>
</template>

<script lang="ts" setup>
import { computed, inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';
import type { Units } from '@blue-might/units';
import { concatMap, Subscription } from 'rxjs';
import type { WeaponSlotThumb } from '@blue-might/app/lib/classes/WeaponSlot';
import thumbGenerator from '@blue-might/app/services/thumbGenerator';
import { projectiles } from '@blue-might/weapon';
import type { Projectiles } from '@blue-might/weapon/projectile';

import BmFieldset from '../Fieldset.vue';
import type { DialogContext } from '../base/Dialog.vue';

inject<DialogContext>('dialog')!;

const currentSlot = ref<WeaponSlotThumb | null>(null);

const $props = defineProps<{
  app: App;
  unit: Units;
}>();

if (!('weapon' in $props.unit.modules)) {
  throw new Error('Unit is missing weapon module');
}

const weaponModule = $props.unit.modules.weapon;

const preparedProjectiles = ref(
  await Promise.all(
    Object.values(projectiles).map(async projectileClass => {
      const projectile = new projectileClass();
      return {
        ...projectile,
        thumb: await thumbGenerator.getFromProjectile(projectile.id, {
          size: 64,
          view: 'isometric',
          withCase: false
        })
      } as { thumb: string } & Projectiles;
    })
  )
);

const filteredProjectiles = computed(() => {
  return preparedProjectiles.value.filter(projectile => {
    return currentSlot.value?.weapon.projectileType === projectile.type;
  });
});

const weaponSlots = ref<WeaponSlotThumb[]>([]);
const subscription = new Subscription();
subscription.add(
  weaponModule.observables.slots$
    .pipe(
      concatMap(slots => {
        return Promise.all(
          slots.map(async slot => {
            return {
              ...slot,
              thumb: await thumbGenerator.getFromProjectile(
                slot.weapon.projectile.id,
                {
                  size: 64,
                  view: 'isometric',
                  withCase: false
                }
              )
            } as WeaponSlotThumb;
          })
        );
      })
    )
    .subscribe(slots => {
      weaponSlots.value = slots;
      currentSlot.value = currentSlot.value || slots[0] || null;
    })
);

function onClickWeaponSlot(slot: WeaponSlotThumb) {
  currentSlot.value = slot;
}

function onClickProjectile(projectile: Projectiles) {
  currentSlot.value?.weapon.setProjectile(projectile.id);
  weaponModule.setSlots(weaponSlots.value);
}
</script>

<style lang="postcss" scoped>
.bm-dialog-customize-unit {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);

  & .weapons,
  & .projectiles,
  & .info {
    --columns: 3;
    --size: 98px;

    display: flex;
    gap: calc((302px - var(--size) * 3) / 2);
    width: 302px;
  }

  & button {
    position: relative;
    width: var(--size);
    margin: 0;
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    appearance: none;
    cursor: pointer;
    background-color: #333;
    border: solid 3px;
    border-color: #888 #444 #444 #888;

    &:active,
    &.selected {
      border-color: #444 #888 #888 #444;
    }

    & img {
      width: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      filter: drop-shadow(0 2px 4px rgb(0 0 0 / 30%));
    }

    & span {
      box-sizing: border-box;
      display: block;
      width: 100%;
      padding: var(--bm-spacing-small);
      overflow: hidden;
      text-overflow: ellipsis;
      color: white;
      white-space: nowrap;
    }
  }

  & .info {
    min-height: calc(
      var(--line-height-bit-font) + 4px * 2 + var(--bm-spacing-small) * 3
    );
    padding: var(--bm-spacing-small);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: calc(var(--line-height-bit-font) + 4px);
  }
}
</style>
