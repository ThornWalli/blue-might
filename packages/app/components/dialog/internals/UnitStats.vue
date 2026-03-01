<template>
  <div class="bm-dialog-internals-unit-stats">
    <div class="style-scrollbar">
      <bm-table :column-definitions="columnDefinitions" :rows="rows" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type Unit from '@blue-might/app/lib/classes/Unit';
import type { App } from '@blue-might/app/lib/types';
import thumbGenerator from '@blue-might/app/services/thumbGenerator';
import * as units from '@blue-might/units';
import { computed, onMounted, ref } from 'vue';

import BmTable from '../../Table.vue';
import type { TableRow, TableColumn } from '../../Table.vue';

defineProps<{
  app: App;
}>();

const preparedItems = ref<
  {
    unit: units.Units;
    image: string;
  }[]
>();

interface Row extends TableRow {
  image: string;
  name: string;
  transport_slots?: number;
  max_damage?: number;
  weapon_1_projectile?: string;
  weapon_1_strength?: number;
  weapon_2_projectile?: string;
  weapon_2_strength?: number;
  weapon_3_projectile?: string;
  weapon_3_strength?: number;
}

const columnDefinitions = ref<TableColumn<Row>[]>([
  { title: '', key: 'image' },
  { title: 'Name', key: 'name', sortable: true, sortType: 'string' },
  {
    title: 'Transport Slots',
    key: 'transport_slots',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Max Damage',
    key: 'max_damage',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Weapon #1 Projectile',
    key: 'weapon_1_projectile',
    sortable: true,
    sortType: 'string'
  },
  {
    title: 'Weapon #1 Strength',
    key: 'weapon_1_strength',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Weapon #2 Projectile',
    key: 'weapon_2_projectile',
    sortable: true,
    sortType: 'string'
  },
  {
    title: 'Weapon #2 Strength',
    key: 'weapon_2_strength',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Weapon #3 Projectile',
    key: 'weapon_3_projectile',
    sortable: true,
    sortType: 'string'
  },
  {
    title: 'Weapon #3 Strength',
    key: 'weapon_3_strength',
    sortable: true,
    sortType: 'number'
  }
]);

const rows = computed<Row[]>(() => {
  const rows = (preparedItems.value || []).map(item => {
    return {
      image: item.image,
      name: item.unit.name,
      transport_slots:
        'transport' in item.unit.modules
          ? item.unit.modules.transport.getMaxSlots()
          : undefined,
      max_damage: item.unit.modules.damage.getMaxDamage(),
      weapon_1_projectile:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(0)?.weapon.projectile.name
          : undefined,
      weapon_1_strength:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(0)?.weapon.projectile.strength
          : undefined,

      weapon_2_projectile:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(1)?.weapon.projectile.name
          : undefined,
      weapon_2_strength:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(1)?.weapon.projectile.strength
          : undefined,

      weapon_3_projectile:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(2)?.weapon.projectile.name
          : undefined,
      weapon_3_strength:
        'weapon' in item.unit.modules
          ? item.unit.modules.weapon.getSlot(2)?.weapon.projectile.strength
          : undefined
    };
  });

  return rows;
});

const items = computed(() => {
  return Object.values(units).map(
    UnitClass =>
      new (UnitClass as unknown as typeof Unit)({
        preview: true
      })
  );
});

onMounted(async () => {
  preparedItems.value = await Promise.all(
    items.value.map(async unit => ({
      unit,
      image: await thumbGenerator.getFromUnit(unit.key, {
        size: 16
      })
    }))
  );
});
</script>

<style lang="postcss" scoped>
.bm-dialog-internals-unit-stats {
  font-family: var(--font-family-base);
  font-size: 12px;

  & > div {
    height: 400px;
    overflow: auto;
  }
}
</style>
