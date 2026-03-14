<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/store/app/app.js';

// Composables
import { useSearchQuery } from './composables/useSearchQuery.js';
import { useQuickActions } from './composables/useQuickActions.js';
import { useOnboarding } from './composables/useOnboarding.js';

// Utils
import { returnItemLink } from './utils/returnItemLink.js';

// Components
import Modal from '@/components/utility/modal/index.vue';
import LayoutFixDialog from './layout-fix-dialog.vue';
import {
  SearchTriggerButton,
  SearchInput,
  SearchOnboarding,
  EmptyStateNoResults,
  EmptyStateInitial,
  CommandHelp,
  SearchHistory,
  RecentlyAccessed,
  FrequentlyUsed,
  QuickActions,
  SearchResults,
  KeyboardShortcuts,
} from './components/index.js';

// Store
const appStore = useAppStore();

// Composables
const {
  searchQuery,
  searchResults,
  isLoading,
  activeResultIndex,
  showHistoryDropdown,
  parsedQuery,
  commandFilter,
  filteredSearchResults,
  returnCategoryName,
  resetSearch,
  searchHistory,
  clearHistory,
  trackAccess,
  getFilteredRecentlyAccessed,
  getFilteredFrequentlyUsed,
} = useSearchQuery();

const { quickActions, getFilteredQuickActions, initializeQuickActions } =
  useQuickActions();

const {
  hasSeenOnboarding,
  showOnboarding,
  markOnboardingSeen,
  showOnboardingTutorial,
  triggerOnboardingIfNeeded,
} = useOnboarding();

// Refs
const searchmodal = ref(null);
const searchInput = ref(null);
const showLayoutFixDialog = ref(false);

// Computed
const filteredQuickActions = computed(() =>
  getFilteredQuickActions(parsedQuery.value.cleanQuery, commandFilter.value)
);

const flattenedResults = computed(() => {
  const results = Object.entries(filteredSearchResults.value).flatMap(
    ([category, results]) => results.map((result) => ({ ...result, category }))
  );

  const allResults = [
    ...filteredQuickActions.value.map((action) => ({
      ...action,
      category: 'quickActions',
    })),
    ...results,
  ];

  if (
    !parsedQuery.value.cleanQuery ||
    parsedQuery.value.cleanQuery.length === 0
  ) {
    const recent = getFilteredRecentlyAccessed(
      parsedQuery.value.cleanQuery
    ).map((item) => ({
      ...item,
      category: item.category || 'recent',
      isRecent: true,
    }));
    allResults.push(...recent);

    const frequent = getFilteredFrequentlyUsed(
      parsedQuery.value.cleanQuery
    ).map((item) => ({
      ...item,
      category: item.category || 'frequent',
      isFrequent: true,
    }));
    allResults.push(...frequent);
  }

  return allResults;
});

const hasNoResults = computed(() => {
  if (commandFilter.value === 'help') return false;
  if (showOnboarding.value) return false;

  const hasQuickActions = filteredQuickActions.value.length > 0;
  const hasRecent = getFilteredRecentlyAccessed().length > 0;
  const hasFrequent = getFilteredFrequentlyUsed().length > 0;
  const hasResults = Object.keys(filteredSearchResults.value).length > 0;
  const hasHistoryItems =
    showHistoryDropdown.value && searchHistory.value.length > 0;

  if (parsedQuery.value.cleanQuery && parsedQuery.value.cleanQuery.length > 0) {
    return !hasResults && !hasQuickActions;
  }

  return !hasQuickActions && !hasRecent && !hasFrequent && !hasHistoryItems;
});

// Methods
const getItemLink = (category, item) => {
  return returnItemLink(category, item, appStore.state.adminUrl);
};

const getResultIndex = (result, category) => {
  return flattenedResults.value.findIndex(
    (r) => r.id === result.id && r.category === category
  );
};

const getActionIndex = (action) => {
  return flattenedResults.value.findIndex(
    (r) => r.id === action.id && r.category === 'quickActions'
  );
};

const getItemIndex = (item) => {
  return flattenedResults.value.findIndex(
    (r) => r.id === item.id && r.category === item.category
  );
};

const openModal = (evt) => {
  document.activeElement.blur();
  searchmodal.value.show(evt);
  activeResultIndex.value = 0;
  triggerOnboardingIfNeeded();
};

const closeModal = () => {
  resetSearch();
  showOnboarding.value = false;
};

const handleKeyDown = (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    event.stopPropagation();
    openModal();
  }
  if (event.key === 'Escape') {
    searchmodal.value.close();
  }
};

const handleArrowDown = (event) => {
  event.preventDefault();
  activeResultIndex.value =
    (activeResultIndex.value + 1) % flattenedResults.value.length;
};

const handleArrowUp = (event) => {
  event.preventDefault();
  activeResultIndex.value =
    (activeResultIndex.value - 1 + flattenedResults.value.length) %
    flattenedResults.value.length;
};

const handleKeyEnter = (event) => {
  event.preventDefault();
  const activeResult = flattenedResults.value[activeResultIndex.value];
  if (activeResult) {
    if (activeResult.category === 'quickActions') {
      activeResult.action();
    } else {
      trackAccess({
        id: activeResult.id || activeResult.url,
        category: activeResult.category,
        name:
          activeResult.name ||
          activeResult.title?.rendered ||
          activeResult.email,
        url: getItemLink(activeResult.category, activeResult),
        metadata: activeResult,
      });
      window.location.href = getItemLink(activeResult.category, activeResult);
    }
    searchmodal.value.close();
  }
};

const handleItemClick = (item, category) => {
  if (category !== 'quickActions') {
    trackAccess({
      id: item.id || item.url,
      category: category,
      name: item.name || item.title?.rendered || item.email,
      url: getItemLink(category, item),
      metadata: item,
    });
  }
  searchmodal.value.close();
};

const handleActionClick = (action) => {
  action.action();
  searchmodal.value.close();
};

const handleExampleSearch = (query) => {
  searchQuery.value = query;
  if (showOnboarding.value) {
    markOnboardingSeen();
  }
};

const handleInputBlur = () => {
  setTimeout(() => {
    showHistoryDropdown.value = false;
  }, 200);
};

const handleInputFocus = () => {
  showHistoryDropdown.value =
    !searchQuery.value || searchQuery.value.trim() === '';
};

const closeLayoutFixDialog = () => {
  showLayoutFixDialog.value = false;
};

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  await initializeQuickActions();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <SearchTriggerButton @click="openModal" />

  <Modal ref="searchmodal" position="top">
    <div class="mx-auto p-6 w-[500px] flex flex-col gap-6 max-w-[100vw]">
      <SearchInput
        v-model="searchQuery"
        :is-loading="isLoading"
        @keyup-down="handleArrowDown"
        @keyup-up="handleArrowUp"
        @keyup-enter="handleKeyEnter"
        @focus="handleInputFocus"
        @blur="handleInputBlur"
      />

      <div class="relative">
        <div class="flex flex-col gap-6 max-h-[70dvh] overflow-auto">
          <!-- Onboarding -->
          <SearchOnboarding
            :visible="showOnboarding && !hasSeenOnboarding"
            @dismiss="markOnboardingSeen"
            @example-click="handleExampleSearch"
          />

          <!-- No Results State -->
          <EmptyStateNoResults
            v-if="
              hasNoResults &&
              !showOnboarding &&
              parsedQuery.cleanQuery &&
              parsedQuery.cleanQuery.length > 0
            "
            @view-commands="searchQuery = '?help'"
            @clear-search="searchQuery = ''"
          />

          <!-- Initial Empty State -->
          <EmptyStateInitial
            v-if="
              hasNoResults &&
              !showOnboarding &&
              !parsedQuery.cleanQuery &&
              !isLoading
            "
            :has-seen-onboarding="hasSeenOnboarding"
            @example-click="handleExampleSearch"
            @show-tutorial="showOnboardingTutorial"
          />

          <!-- Command Help -->
          <CommandHelp v-if="commandFilter === 'help'" />

          <!-- Search History -->
          <SearchHistory
            v-if="showHistoryDropdown && !parsedQuery.cleanQuery"
            :history="searchHistory"
            @select="searchQuery = $event"
            @clear="clearHistory"
          />

          <!-- Recently Accessed -->
          <RecentlyAccessed
            v-if="!parsedQuery.cleanQuery"
            :items="getFilteredRecentlyAccessed()"
            :active-index="activeResultIndex"
            :get-item-index="getItemIndex"
            @item-click="(item) => handleItemClick(item, item.category)"
          />

          <!-- Frequently Used -->
          <FrequentlyUsed
            v-if="!parsedQuery.cleanQuery"
            :items="getFilteredFrequentlyUsed()"
            :active-index="activeResultIndex"
            :get-item-index="getItemIndex"
            @item-click="(item) => handleItemClick(item, item.category)"
          />

          <!-- Quick Actions -->
          <QuickActions
            :actions="filteredQuickActions"
            :active-index="activeResultIndex"
            :get-action-index="getActionIndex"
            @action-click="handleActionClick"
          />

          <!-- Search Results -->
          <SearchResults
            :results="filteredSearchResults"
            :active-index="activeResultIndex"
            :get-result-index="getResultIndex"
            :get-item-link="getItemLink"
            :get-category-name="returnCategoryName"
            @item-click="handleItemClick"
          />
        </div>

        <!-- Gradient fade for long lists -->
        <div
          class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none"
          v-if="!isLoading && flattenedResults.length > 20"
        />
      </div>

      <KeyboardShortcuts />
    </div>
  </Modal>

  <!-- Layout Fix Dialog -->
  <LayoutFixDialog
    :visible="showLayoutFixDialog"
    @close="closeLayoutFixDialog"
  />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
