<template>
  <div class="bm-dialog-internals-projectile-stats">
    <div class="style-scrollbar">
      <bm-table :column-definitions="columnDefinitions" :rows="rows" />
    </div>
    <bm-details label="Infos">
      <p>
        For damage to a unit, the projectile strength is calculated based on the
        unit damage.
      </p>
      <p>Strength value unit equal to value unit damage unit</p>
      <div class="formal">
        <span class="result">CurrentDamage</span> =
        <span class="input-a">UnitDamage</span> +
        <span class="input-b">ProjectileStrength</span>
      </div>
    </bm-details>
  </div>
</template>

<script setup lang="ts">
import type { App } from '@blue-might/app/lib/types';
import { computed, onMounted, ref } from 'vue';
import { projectiles } from '@blue-might/weapon';
import thumbGenerator from '@blue-might/app/services/thumbGenerator';
import type Projectile from '@blue-might/app/lib/classes/Projectile';
import type { Projectiles } from '@blue-might/weapon/projectile';

import BmTable from '../../Table.vue';
import BmDetails from '../../Details.vue';
import type { TableRow, TableColumn } from '../../Table.vue';

defineProps<{
  app: App;
}>();

const preparedItems = ref<
  {
    projectile: Projectiles;
    image: string;
  }[]
>();

interface Row extends TableRow {
  image: string;
  key: string;
  name: string;
  max_life: number;
  speed: number;
  strength: number;
  radius: number;
  air_resistance: number;
  weight: number;
}

const columnDefinitions = ref<TableColumn<Row>[]>([
  { title: '', key: 'image' },
  { title: 'Key', key: 'key', sortable: true, sortType: 'string' },
  {
    title: 'Name',
    key: 'name',
    sortable: true,
    sortType: 'string'
  },

  {
    title: 'Max Life',
    key: 'max_life',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Speed',
    key: 'speed',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Strength (Damage)',
    key: 'strength',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Radius',
    key: 'radius',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Air Resistance',
    key: 'air_resistance',
    sortable: true,
    sortType: 'number'
  },
  {
    title: 'Weight',
    key: 'weight',
    sortable: true,
    sortType: 'number'
  }
]);

const rows = computed<Row[]>(() => {
  const rows = (preparedItems.value || []).map(item => {
    return {
      image: item.image,
      key: item.projectile.id,
      name: item.projectile.name,
      max_life: item.projectile.maxLifetime,
      speed: item.projectile.speed,
      strength: item.projectile.strength,
      radius: item.projectile.radius,
      air_resistance: item.projectile.airResistance,
      weight: item.projectile.weight
    };
  });

  return rows;
});

onMounted(async () => {
  preparedItems.value = await Promise.all(
    Object.values(projectiles).map(async ProjectileClass => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projectile: new (ProjectileClass as unknown as any)() as Projectile,
        image: await thumbGenerator.getFromProjectile(ProjectileClass.KEY, {
          size: 16,
          view: 'side'
        })
      };
    })
  );
});
</script>

<style lang="postcss" scoped>
.bm-dialog-internals-projectile-stats {
  font-family: var(--font-family-base);
  font-size: 12px;

  & > div {
    overflow: auto;
  }
}

.formal {
  display: flex;
  gap: var(--bm-spacing-small);
  align-items: center;
  justify-content: center;
  padding: var(--bm-spacing-small);

  & span {
    font-weight: bold;
  }

  & .result {
    color: blue;
  }

  & .input-a {
    color: green;
  }

  & .input-b {
    color: red;
  }
}
</style>
