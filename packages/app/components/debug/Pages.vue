<template>
  <bm-details label="Pages" class="bm-debug-pages">
    <ul>
      <li><nuxt-link href="/">Default</nuxt-link></li>
      <li><nuxt-link href="/debug/shoot">Shoot</nuxt-link></li>
      <li><nuxt-link href="/debug/patrol">Patrol</nuxt-link></li>
      <li><nuxt-link href="/debug/helicopter">Helicopter</nuxt-link></li>
      <li><nuxt-link href="/debug/pathfinding">Pathfinding</nuxt-link></li>
    </ul>
  </bm-details>
</template>

<script lang="ts" setup>
// import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';
</script>

<style lang="postcss" scoped>
a {
  font-size: 12px;
  color: currentColor;
}
</style>
