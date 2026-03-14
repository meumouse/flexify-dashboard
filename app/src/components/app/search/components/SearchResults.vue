<script setup>
import SearchResultItem from './SearchResultItem.vue';

const props = defineProps({
  results: {
    type: Object,
    default: () => ({}),
  },
  activeIndex: {
    type: Number,
    default: -1,
  },
  getResultIndex: {
    type: Function,
    default: () => -1,
  },
  getItemLink: {
    type: Function,
    required: true,
  },
  getCategoryName: {
    type: Function,
    default: (slug) => slug,
  },
});

const emit = defineEmits(['item-click']);

const handleItemClick = (result, category) => {
  emit('item-click', result, category);
};
</script>

<template>
  <Transition mode="out-in" name="slide-up">
    <div v-if="results && Object.keys(results).length > 0" class="flex flex-col gap-6">
      <template v-for="(categoryResults, category) in results" :key="category">
        <div v-if="categoryResults && categoryResults.length > 0">
          <div class="mb-2 capitalize text-zinc-400 dark:text-zinc-200">
            {{ getCategoryName(category) }}
          </div>
          <ul class="flex flex-col">
            <SearchResultItem
              v-for="result in categoryResults"
              :key="result.id"
              :result="result"
              :category="category"
              :link="getItemLink(category, result)"
              :is-active="getResultIndex(result, category) === activeIndex"
              @click="handleItemClick(result, category)"
            />
          </ul>
        </div>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-to,
.slide-up-leave-from {
  opacity: 1;
}
</style>
