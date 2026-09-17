<script setup>
import WooPageWrapper from '@/components/woocommerce/WooPageWrapper.vue';
</script>

<template>
  <WooPageWrapper>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.name === 'orders' ? 'list' : route.path" />
    </RouterView>
  </WooPageWrapper>
</template>
