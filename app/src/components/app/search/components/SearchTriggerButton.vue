<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

const emit = defineEmits(['click']);

const handleClick = (evt) => {
  emit('click', evt);
};
</script>

<template>
  <AppButton
    type="transparent"
    @click.prevent="handleClick"
    aria-label="Open search"
    id="fd-search-button"
  >
    <AppIcon icon="search" class="text-xl" />
  </AppButton>
</template>
