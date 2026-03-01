<template>
  <table class="bm-table">
    <thead>
      <tr>
        <th v-for="column in columnDefinitions" :key="column.key">
          <button
            v-if="column.sortable"
            :class="{ active: sortColumnIndex === column.key }"
            @click="onClickSort(column.key)">
            {{ column.title }}
            <bm-icon
              v-if="sortColumnIndex === column.key"
              :key="sortColumnOrderType"
              size="very-small"
              :name="
                sortColumnOrderType === 'asc'
                  ? icons[ICON.ARROW_UP]
                  : icons[ICON.ARROW_DOWN]
              " />
          </button>
          <span v-else>{{ column.title }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="row.name">
        <td
          v-for="column in Object.values(columnDefinitions)"
          :key="column.key">
          <template v-if="column.key === 'image'">
            <img :src="row.image" :alt="`Image for ${row.name}`" />
          </template>
          <template v-else>
            {{ row[column.key] }}
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts" generic="Row extends TableRow">
import { computed, ref } from 'vue';

import icons, { ICON } from '../utils/icons';

import BmIcon from './base/Icon.vue';

const $props = defineProps<{
  columnDefinitions: TableColumn<Row>[];
  rows: Row[];
}>();

const sortColumnIndex = ref<keyof Row | null>(null);
const sortColumnOrderType = ref<'asc' | 'desc'>('asc');

function onClickSort(index: keyof Row) {
  if (sortColumnIndex.value === index) {
    // sortColumnIndex.value = null;
    sortColumnOrderType.value =
      sortColumnOrderType.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumnIndex.value = index;
  }
}

const sortedRows = computed(() => {
  const rows = [...$props.rows];
  if (sortColumnIndex.value !== null) {
    const index = sortColumnIndex.value;
    const sortType =
      $props.columnDefinitions.find(col => col.key === index)?.sortType ??
      'string';
    const multiplier = sortColumnOrderType.value === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      const aVal = a[index] ?? (sortType === 'number' ? 0 : '');
      const bVal = b[index] ?? (sortType === 'number' ? 0 : '');

      if (sortType === 'number') {
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return multiplier * (aVal - bVal);
        }
      } else if (sortType === 'string') {
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          // Behandle leere Strings als "größer" (sortiere ans Ende)
          if (aVal === '' && bVal !== '') return 1;
          if (bVal === '' && aVal !== '') return -1;
          return multiplier * aVal.localeCompare(bVal);
        }
      }
      return 0;
    });
  }
  return rows;
});
</script>

<script lang="ts">
export interface TableRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface TableColumn<Row extends TableRow = TableRow> {
  title: string;
  key: keyof Row;
  sortable?: boolean;
  sortType?: 'string' | 'number';
}
</script>

<style lang="postcss" scoped>
.bm-table {
  font-family: var(--font-family-base);
  font-size: 12px;

  & thead {
    position: sticky;
    top: 0;
    background-color: black;
  }

  & tr {
    &:nth-child(even) {
      background-color: rgb(255 255 255 / 10%);
    }

    &:hover {
      background-color: rgb(255 255 255 / 20%);
    }

    & td {
      padding: var(--bm-spacing-small);

      &:first-child {
        position: sticky;
        top: 0;
        left: 0;
        background-color: black;
      }
    }
  }

  button {
    display: flex;
    gap: var(--bm-spacing-small);
    align-items: center;
    width: 100%;
    padding: var(--bm-spacing-small);
    color: white;
    white-space: nowrap;
    cursor: pointer;
    background: none;
    border: solid rgb(255 255 255 / 20%) 2px;

    &.active {
      border-color: rgb(255 255 255 / 80%);
    }

    & svg {
      fill: currentColor;
    }
  }

  & td {
    white-space: nowrap;

    &:empty {
      &::before {
        content: '-';
      }
    }
  }
}
</style>
