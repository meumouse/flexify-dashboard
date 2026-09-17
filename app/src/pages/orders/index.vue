<script setup>
import WooPageWrapper from '@/components/woocommerce/WooPageWrapper.vue';
</script>

<template>
  <WooPageWrapper>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.fullPath.startsWith('/order/') ? route.params.id : 'list'" />
    </RouterView>
  </WooPageWrapper>
</template>
