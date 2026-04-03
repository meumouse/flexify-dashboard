<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { returnOriginalLinkAttribute } from '../utils/returnOriginalLinkAttribute.js';
import AppIcon from '@/components/utility/icons/index.vue';
import MenuIcon from './MenuIcon.vue';

const props = defineProps({
  menuItems: {
    type: Array,
    required: true,
    default: () => [],
  },
  isMenuMinified: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['select-item', 'navigate']);

const searchQuery = ref('');
const isOpen = ref(false);
const focusedIndex = ref(-1);
const searchInputRef = ref(null);
const resultsContainerRef = ref(null);
const blurTimeoutId = ref(null);

/**
 * Flattens menu items including submenu items for search
 * @returns {Array} Flattened array of menu items with parent reference
 */
const flattenedMenuItems = computed(() => {
  const items = [];

  props.menuItems.forEach((item) => {
    // Skip separators
    if (item.type === 'separator' || item.settings?.hidden) {
      return;
    }

    // Add top-level item
    items.push({
      ...item,
      level: 'top',
      parent: null,
    });

    // Add submenu items if they exist
    if (Array.isArray(item.submenu) && item.submenu.length > 0) {
      item.submenu.forEach((subItem) => {
        if (!subItem.settings?.hidden) {
          items.push({
            ...subItem,
            level: 'sub',
            parent: item,
          });
        }
      });
    }
  });

  return items;
});

/**
 * Gets the display name for a menu item
 * @param {Object} item - Menu item object
 * @returns {string} Display name
 */
const getItemName = (item) => {
  if (item.settings?.name) {
    // Strip HTML tags for search matching
    const temp = document.createElement('div');
    temp.innerHTML = item.settings.name;
    return temp.textContent || temp.innerText || '';
  }

  const name = returnOriginalLinkAttribute(item, 'name', item.name);
  if (!name) return '';

  // Strip HTML tags
  const temp = document.createElement('div');
  temp.innerHTML = name;
  return temp.textContent || temp.innerText || '';
};

/**
 * Filters menu items based on search query
 * @returns {Array} Filtered menu items
 */
const filteredResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return [];
  }

  const query = searchQuery.value.toLowerCase().trim();
  const results = [];

  flattenedMenuItems.value.forEach((item) => {
    const name = getItemName(item).toLowerCase();
    const url = (item.url || '').toLowerCase();
    const id = (item.id || '').toLowerCase();

    // Check if query matches name, URL, or ID
    if (name.includes(query) || url.includes(query) || id.includes(query)) {
      results.push(item);
    }
  });

  // Sort results: exact matches first, then name matches, then URL matches
  return results.sort((a, b) => {
    const aName = getItemName(a).toLowerCase();
    const bName = getItemName(b).toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets priority
    if (aName === queryLower && bName !== queryLower) return -1;
    if (bName === queryLower && aName !== queryLower) return 1;

    // Starts with query gets priority
    if (aName.startsWith(queryLower) && !bName.startsWith(queryLower))
      return -1;
    if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1;

    // Top-level items before submenu items
    if (a.level === 'top' && b.level === 'sub') return -1;
    if (b.level === 'top' && a.level === 'sub') return 1;

    // Alphabetical order
    return aName.localeCompare(bName);
  });
});

/**
 * Highlights matching text in a string
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted matches
 */
const highlightMatch = (text, query) => {
  if (!query || !text) return text;

  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
  return text.replace(
    regex,
    '<mark class="bg-brand-200 dark:bg-brand-800/50 text-brand-900 dark:text-brand-100 rounded px-0.5">$1</mark>'
  );
};

/**
 * Handles item selection
 * @param {Object} item - Selected menu item
 */
const selectItem = (item) => {
  emit('select-item', item);
  emit('navigate', item);

  // Navigate to the item's URL
  if (item.url) {
    window.location.href = item.url;
  }

  // Close search
  closeSearch();
};

/**
 * Closes the search interface
 */
const closeSearch = () => {
	if ( blurTimeoutId.value ) {
		window.clearTimeout(blurTimeoutId.value);
		blurTimeoutId.value = null;
	}

    isOpen.value = false;
    searchQuery.value = '';
    focusedIndex.value = -1;
};

/**
 * Handles input blur with delay to allow result clicks
 */
const handleInputBlur = () => {
	if ( blurTimeoutId.value ) {
		window.clearTimeout( blurTimeoutId.value );
	}

	blurTimeoutId.value = window.setTimeout(() => {
		if ( ! searchQuery.value ) {
			isOpen.value = false;
		}

		blurTimeoutId.value = null;
	}, 200);
};

/**
 * Opens the search interface
 */
const openSearch = () => {
	isOpen.value = true;
	
	nextTick(() => {
		if ( searchInputRef.value ) {
			searchInputRef.value.focus();
		}

		// Auto-select first item if there are results
		if ( filteredResults.value.length > 0 ) {
			focusedIndex.value = 0;
		}
	});
};

/**
 * Handles keyboard navigation
 * @param {KeyboardEvent} event - Keyboard event
 */
const handleKeydown = (event) => {
  if (!isOpen.value) return;

  const results = filteredResults.value;

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      closeSearch();
      break;

    case 'ArrowDown':
      event.preventDefault();
      // If no item is focused, start at the first item (index 0)
      if (focusedIndex.value === -1) {
        focusedIndex.value = 0;
      } else {
        focusedIndex.value = Math.min(
          focusedIndex.value + 1,
          results.length - 1
        );
      }
      scrollToFocused();
      break;

    case 'ArrowUp':
      event.preventDefault();
      // If at first item or no item focused, go to last item
      if (focusedIndex.value <= 0) {
        focusedIndex.value = results.length - 1;
      } else {
        focusedIndex.value = Math.max(focusedIndex.value - 1, 0);
      }
      scrollToFocused();
      break;

    case 'Enter':
      event.preventDefault();
      // If no item is focused but there are results, select the first one
      if (focusedIndex.value === -1 && results.length > 0) {
        selectItem(results[0]);
      } else if (focusedIndex.value >= 0 && results[focusedIndex.value]) {
        selectItem(results[focusedIndex.value]);
      } else if (results.length === 1) {
        // If only one result, select it
        selectItem(results[0]);
      }
      break;
  }
};

/**
 * Scrolls to the focused item
 */
const scrollToFocused = () => {
  nextTick(() => {
    if (resultsContainerRef.value && focusedIndex.value >= 0) {
      const focusedElement = resultsContainerRef.value.querySelector(
        `[data-index="${focusedIndex.value}"]`
      );
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  });
};

/**
 * Handles click outside to close search
 */
const handleClickOutside = (event) => {
  if (
    isOpen.value &&
    searchInputRef.value &&
    !searchInputRef.value.contains(event.target) &&
    resultsContainerRef.value &&
    !resultsContainerRef.value.contains(event.target)
  ) {
    closeSearch();
  }
};

// Watch for search query changes to auto-select first item
watch(searchQuery, (newQuery) => {
  if (newQuery && newQuery.trim() !== '') {
    // Auto-select first item when user starts typing
    nextTick(() => {
      if (filteredResults.value.length > 0) {
        focusedIndex.value = 0;
      } else {
        focusedIndex.value = -1;
      }
    });
  } else {
    focusedIndex.value = -1;
  }
});

// Watch filtered results to auto-select first item when results appear
watch(filteredResults, (newResults) => {
  if (
    newResults.length > 0 &&
    searchQuery.value &&
    searchQuery.value.trim() !== ''
  ) {
    // Auto-select first item when results appear
    focusedIndex.value = 0;
  } else {
    focusedIndex.value = -1;
  }
});

// Watch for open state changes
watch(isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  } else {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside);
	document.removeEventListener('keydown', handleKeydown);

	if ( blurTimeoutId.value ) {
		window.clearTimeout( blurTimeoutId.value );
	}
});
</script>

<template>
  <div class="relative">
    <!-- Search Input -->
    <div class="relative" :class="isMenuMinified ? 'w-full' : ''">
      <div
        class="absolute top-0 left-0 h-full flex items-center px-3 pointer-events-none"
      >
        <AppIcon
          icon="search"
          class="text-zinc-400 dark:text-zinc-500 text-lg"
        />
      </div>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="__('Search menu...', 'flexify-dashboard')"
        class="w-full pl-9 pr-8 py-2 text-sm border rounded-lg transition-all outline outline-transparent outline-offset-[-2px] text-white bg-[#313d4a] border-[#444e59] placeholder:text-zinc-400 focus:bg-[#1c2434] focus:border-[#1c2434] focus:outline-transparent focus:shadow-none"
        @focus="isOpen = true"
        @input="isOpen = true"
		    @blur="handleInputBlur"
        @keydown.escape="closeSearch"
      />
      <button
        v-if="searchQuery"
        @click="closeSearch"
        class="absolute top-0 right-0 h-full flex items-center px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <AppIcon icon="close" class="text-sm" />
      </button>
    </div>

    <!-- Search Results Dropdown -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen && (searchQuery || filteredResults.length > 0)"
        ref="resultsContainerRef"
        @mousedown.prevent
        class="absolute top-full left-0 right-0 mt-2 bg-[#313d4a] rounded-xl shadow-xl border border-[#444e59] z-50"
      >
        <!-- No Results -->
        <div
          v-if="searchQuery && filteredResults.length === 0"
          class="px-4 py-8 text-center"
        >
          <AppIcon
            icon="search"
            class="text-3xl text-zinc-400 dark:text-zinc-500 mx-auto mb-2"
          />
          <p class="text-sm text-zinc-300">
            {{ __('No menu items found', 'flexify-dashboard') }}
          </p>
          <p class="text-xs text-zinc-400 mt-1">
            {{ __('Try a different search term', 'flexify-dashboard') }}
          </p>
        </div>

        <!-- Results List -->
        <div v-else class="p-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          <template
            v-for="(item, index) in filteredResults"
            :key="item.id || index"
          >
            <button
              :data-index="index"
              @click="selectItem(item)"
              class="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors group rounded-lg"
              :class="
                focusedIndex === index
                  ? 'bg-[#1c2434] text-white'
                  : 'text-zinc-100 hover:bg-[#1c2434]' 
              "
            >
              <!-- Icon -->
              <div class="flex-shrink-0">
                <MenuIcon :link="item" />
              </div>

              <!-- Item Info -->
              <div class="flex-1 min-w-0">
                <div
                  class="text-sm font-medium text-zinc-100 truncate"
                  v-html="highlightMatch(getItemName(item), searchQuery)"
                ></div>
                <div
                  v-if="item.level === 'sub' && item.parent"
                  class="text-xs text-zinc-400 truncate mt-0.5"
                >
                  {{ getItemName(item.parent) }}
                </div>
              </div>

              <!-- Level Indicator -->
              <div
                v-if="item.level === 'sub'"
                class="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <AppIcon icon="subdirectory_arrow_right" class="text-base" />
              </div>
            </button>
          </template>
        </div>

        <!-- Results Footer -->
        <div
          v-if="filteredResults.length > 0"
          class="px-4 py-2 border-t border-[#444e59] bg-[#313d4a] rounded-b-xl"
        >
          <div
            class="flex items-center justify-between text-xs text-zinc-300"
          >
            <span>
              {{ filteredResults.length }}
              {{
                filteredResults.length === 1
                  ? __('result', 'flexify-dashboard')
                  : __('results', 'flexify-dashboard')
              }}
            </span>
            <div class="flex items-center gap-2">
              <kbd
                class="px-1.5 py-0.5 bg-[#1c2434] border border-[#444e59] rounded text-xs text-zinc-200"
              >
                ↑↓
              </kbd>
              <span>{{ __('Navigate', 'flexify-dashboard') }}</span>
              <kbd
                class="px-1.5 py-0.5 bg-[#1c2434] border border-[#444e59] rounded text-xs text-zinc-200"
              >
                ↵
              </kbd>
              <span>{{ __('Select', 'flexify-dashboard') }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Highlight mark styling */
mark {
  background-color: rgb(255 255 255 / 0.12);
  color: #fff;
  padding: 0 2px;
  border-radius: 2px;
}

.dark mark {
  background-color: rgb(255 255 255 / 0.16);
}
</style>


