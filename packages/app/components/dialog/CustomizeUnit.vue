<template>
  <div class="bm-dialog-customize-unit">
    <bm-fieldset label="Current Slots">
      <div class="current-weapons">
        <button
          v-for="slot in currentWeaponSlots"
          :key="slot.slot.index"
          :class="{ selected: currentSlot?.slot === slot.slot }"
          @click="onClickCurrentWeaponSlot(slot.slot.index)">
          <img
            :src="slot.thumb"
            :alt="`Current Weapon (${slot.slot.weapon.name})`"
            :title="slot.slot.weapon.name" />
          <span>{{ slot.slot.weapon.name }}</span>
        </button>
      </div>
    </bm-fieldset>
    <bm-fieldset label="Available Weapons">
      <div class="weapons">
        <button
          v-for="slot in filteredWeaponSlots"
          :key="slot.weapon.id"
          :class="{
            selected: slot.weapon.id === currentSlot?.slot.weapon.id
          }"
          @click="onClickWeaponSlot(slot.weapon.id)">
          <img
            :src="slot.thumb"
            :alt="`Available Weapon (${slot.weapon.name})`"
            :title="slot.weapon.name" />
          <span>{{ slot.weapon.name }}</span>
        </button>
      </div>
    </bm-fieldset>
    <bm-fieldset v-if="filteredProjectiles.length" label="Available Projectile">
      <div class="projectiles">
        <button
          v-for="projectile in filteredProjectiles"
          :key="projectile.id"
          :class="{
            selected: currentSlot?.slot.weapon.projectile.id === projectile.id
          }"
          @click="onClickProjectile(projectile)">
          <img
            :src="projectile.thumb"
            :alt="`Available Projectile (${projectile.name})`"
            :title="projectile.name" />
          <span>{{ projectile.shortName }}</span>
        </button>
      </div>
      <div class="info">
        <div>
          {{ currentSlot?.slot.weapon.projectile.description }}
        </div>
      </div>
    </bm-fieldset>
  </div>
</template>

<script lang="ts" setup>
import { computed, inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';
import type { Units } from '@blue-might/units';
import { concatMap, Subscription } from 'rxjs';
import type {
  WeaponSlotIndex,
  WeaponSlotThumb
} from '@blue-might/app/lib/classes/WeaponSlot';
import thumbGenerator from '@blue-might/app/services/thumbGenerator';
import { projectiles, weapons } from '@blue-might/weapon';
import type { Projectiles } from '@blue-might/weapon/projectile';
import type Weapon from '@blue-might/app/lib/classes/Weapon';
import type { WeaponIdentifier } from '@blue-might/app/lib/types/weapon';

import BmFieldset from '../Fieldset.vue';
import type { DialogContext } from '../base/Dialog.vue';

inject<DialogContext>('dialog')!;

type WeaponThumb = {
  weapon: Weapon;
  thumb: string;
};
const currentSlotIndex = ref<WeaponSlotIndex>(0);

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

const currentSlot = computed(
  () => currentWeaponSlots.value[currentSlotIndex.value]
);

const filteredProjectiles = computed(() => {
  return preparedProjectiles.value.filter(
    projectile =>
      currentSlot.value?.slot.weapon.projectileType === projectile.type
  );
});

const preparedWeapons = ref<WeaponThumb[]>(
  await Promise.all(
    Object.values(weapons).map(async weaponClass => {
      const weapon = new weaponClass();
      return {
        weapon,
        thumb: await thumbGenerator.getFromProjectile(weapon.projectile.id, {
          size: 64,
          view: 'isometric',
          withCase: false
        })
      } as WeaponThumb;
    })
  )
);

const filteredWeaponSlots = computed(() => {
  return preparedWeapons.value.filter(slot => {
    return (
      currentSlot.value?.slot.weapon.projectileType ===
      slot.weapon.projectileType
    );
  });
});

const currentWeaponSlots = ref<WeaponSlotThumb[]>([]);
const subscription = new Subscription();
subscription.add(
  weaponModule.observables.slots$
    .pipe(
      concatMap(slots => {
        return Promise.all(
          slots.map(async slot => {
            return {
              slot,
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
      console.log('Update weapon slots', slots);
      currentWeaponSlots.value = slots;
      // currentSlotIndex.value =
      //   slots.find(slot => slot.slot.active)?.slot.index ?? 0;
    })
);

function onClickCurrentWeaponSlot(slotIndex: WeaponSlotIndex) {
  currentSlotIndex.value = slotIndex;
}

function onClickWeaponSlot(weaponId: WeaponIdentifier) {
  const weaponClass = weapons[weaponId as keyof typeof weapons];
  currentSlot.value?.slot.setWeapon(new weaponClass());
  weaponModule.setSlots(currentWeaponSlots.value.map(slot => slot.slot));
}

function onClickProjectile(projectile: Projectiles) {
  currentSlot.value?.slot.weapon.setProjectile(projectile.id);
  weaponModule.setSlots(currentWeaponSlots.value.map(slot => slot.slot));
}
</script>

<style lang="postcss" scoped>
.bm-dialog-customize-unit {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);

  & .current-weapons,
  & .weapons,
  & .projectiles,
  & .info {
    --columns: 3;
    --size: 98px;

    display: flex;
    gap: var(--bm-spacing-small);
    width: calc(
      (var(--size) * 3) + var(--bm-spacing-small) * (var(--columns) - 1)
    );
  }

  & button {
    position: relative;
    box-sizing: border-box;
    width: var(--size);
    padding: var(--bm-spacing-large);
    padding-top: var(--bm-spacing-medium);
    padding-bottom: calc(
      var(--bm-spacing-very-large) - var(--bm-spacing-medium)
    );
    margin: 0;
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    appearance: none;
    cursor: pointer;
    background-color: #333;
    border: none;

    &::after {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      display: block;
      width: 100%;
      height: 100%;
      content: '';
      border: solid 3px;
      border-color: rgb(255 255 255 / 30%) rgb(0 0 0 / 30%) rgb(0 0 0 / 30%)
        rgb(255 255 255 / 30%);
    }

    &:active,
    &.selected {
      background-color: #2f2f2f;

      &::after {
        border-color: rgb(0 0 0 / 30%) rgb(255 255 255 / 30%)
          rgb(255 255 255 / 30%) rgb(0 0 0 / 30%);
      }
    }

    & img {
      width: 100%;
      object-fit: contain;
      image-rendering: pixelated;

      /* --contour: #000;
      --size: 1px;

      filter: drop-shadow(var(--size) 0 0 var(--contour))
        drop-shadow(calc(var(--size) * -1) 0 0 var(--contour))
        drop-shadow(0 var(--size) 0 var(--contour))
        drop-shadow(0 calc(var(--size) * -1) 0 var(--contour)); */

      /* filter: drop-shadow(0 2px 4px rgb(0 0 0 / 30%)); */
    }

    & span {
      position: absolute;
      right: var(--bm-spacing-medium);
      bottom: var(--bm-spacing-medium);
      left: var(--bm-spacing-medium);
      box-sizing: border-box;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      color: white;
      white-space: nowrap;
    }
  }

  & .info {
    box-sizing: border-box;
    display: block;
    padding: var(--bm-spacing-small);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: calc(var(--line-height-bit-font) + 4px);

    & > div {
      min-height: calc(var(--font-size-bit-font) * 3 + 3 * 4px);
    }
  }
}
</style>
