<template>
  <div class="bm-dialog-internals-weapon-stats">
    <div class="style-scrollbar">
      <bm-table :column-definitions="columnDefinitions" :rows="rows" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { App } from '@blue-might/app/lib/types';
import { computed, onMounted, ref } from 'vue';
import { weapons } from '@blue-might/weapon';
import thumbGenerator from '@blue-might/app/services/thumbGenerator';
import type Weapon from '@blue-might/app/lib/classes/Weapon';

import BmTable from '../../Table.vue';
import type { TableRow, TableColumn } from '../../Table.vue';

defineProps<{
  app: App;
}>();

const preparedItems = ref<
  {
    weapon: Weapon;
    image: string;
  }[]
>();

interface Row extends TableRow {
  image: string;
  key: string;
  name: string;
}

const columnDefinitions = ref<TableColumn<Row>[]>([
  { title: '', key: 'image' },
  { title: 'Key', key: 'key', sortable: true, sortType: 'string' },
  { title: 'Name', key: 'name', sortable: true, sortType: 'string' },
  {
    title: 'Projectile',
    key: 'projectile',
    sortable: true,
    sortType: 'string'
  },
  {
    title: 'Spread amount',
    key: 'spread_amount',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Per seconds',
    key: 'per_seconds',
    sortable: true,
    sortType: 'number'
  },
  { title: 'Shoot type', key: 'shoot_type', sortable: true, sortType: 'number' }
]);

const rows = computed<Row[]>(() => {
  const rows = (preparedItems.value || []).map(item => {
    return {
      image: item.image,
      key: item.weapon.id,
      name: item.weapon.name,
      projectile: item.weapon.projectile.name,
      spread_amount: item.weapon.spreadAmount,
      per_seconds: item.weapon.perSeconds,
      shoot_type: item.weapon.shootType
    };
  });

  return rows;
});

onMounted(async () => {
  preparedItems.value = await Promise.all(
    Object.values(weapons).map(async WeaponClass => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weapon = new (WeaponClass as unknown as any)() as Weapon;
      return {
        weapon,
        image: await thumbGenerator.getFromProjectile(weapon.projectile.id, {
          size: 16,
          view: 'side'
        })
      };
    })
  );
});
</script>

<style lang="postcss" scoped>
.bm-dialog-internals-weapon-stats {
  font-family: var(--font-family-base);
  font-size: 12px;

  & > div {
    overflow: auto;
  }
}
</style>
