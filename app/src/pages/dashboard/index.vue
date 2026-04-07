<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { VueDraggableNext } from 'vue-draggable-next';
import { useDarkMode } from './src/useDarkMode.js';
import { setVeauryOptions } from 'veaury';
import { createRoot } from 'react-dom/client';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';
import {
  CATEGORY_ALIASES,
  dashboardRegistry,
} from '@/assets/js/dashboard/registry.js';

import './src/cards/index.js';

import { useAppStore } from '@/store/app/app.js';
import Notifications from '@/components/utility/notifications/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import Modal from '@/components/utility/modal/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import CardRender from './src/card-render.vue';
import DateRangePicker from './src/date-range-picker.vue';

const { isDark } = useDarkMode();
const appStore = useAppStore();

setVeauryOptions({
  react: {
    createRoot,
  },
});

const confirm = ref(null);
const visibilityModal = ref(null);
const dashboardGrid = ref(null);

const DASHBOARD_LAYOUT_STORAGE_KEY = 'flexify-dashboard:dashboard-layout:v1';
const DASHBOARD_VISIBILITY_STORAGE_KEY =
  'flexify-dashboard:dashboard-visibility:v2';
const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';
const DASHBOARD_GRID_COLUMNS = 12;
const MIN_CARD_WIDTH = 3;
const MAX_CARD_WIDTH = 12;
const translate = window.wp?.i18n?.__ ?? ((value) => value);

const parseDateFromQuery = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateForQuery = (date) => {
  if (!date) return '';

  const normalized = new Date(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const initializeDateRange = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dateFrom = parseDateFromQuery(urlParams.get('date_from'));
  const dateTo = parseDateFromQuery(urlParams.get('date_to'));

  if (dateFrom && dateTo) {
    return [dateFrom, dateTo];
  }

  return [new Date(new Date().setDate(new Date().getDate() - 7)), new Date()];
};

const dateRange = ref(initializeDateRange());
const registrySnapshot = ref({
  categories: [],
  runtimeCardsByCategory: {},
});
const orderedCardsByCategory = ref({});
const visibleCards = ref([]);
const hiddenCardsByCategory = ref({});
const activeCategory = ref(null);
const isMobileViewport = ref(false);
const resizingCardId = ref(null);

let mediaQueryList = null;
let resizeSession = null;
let unsubscribeRegistry = null;

const isWooCommerceActive = computed(() => {
  const plugins = appStore.state?.activePlugins || [];

  return plugins.some(
    (plugin) =>
      plugin?.path === 'woocommerce/woocommerce.php' || plugin?.slug === 'woocommerce'
  );
});

const registeredCategories = computed(() =>
  registrySnapshot.value.categories.map((category) => ({
    ...category,
    value: category.id,
  }))
);

const formattedCategories = computed(() =>
  registeredCategories.value.reduce((accumulator, category) => {
    accumulator[category.value] = category;
    return accumulator;
  }, {})
);

const activeCategoryIdFromQuery = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardCategory = urlParams.get('dashboard_category');
  const normalizedCategory =
    CATEGORY_ALIASES[dashboardCategory] || dashboardCategory;

  if (
    normalizedCategory &&
    registeredCategories.value.some(
      (category) => category.value === normalizedCategory
    )
  ) {
    return normalizedCategory;
  }

  return registeredCategories.value[0]?.value || null;
});

const hasRegisteredCards = computed(() =>
  Object.values(orderedCardsByCategory.value).some((cards) => cards.length > 0)
);

const hasVisibleCards = computed(() => visibleCards.value.length > 0);

const modalItemsForActiveCategory = computed(() => {
  if (!activeCategory.value) {
    return [];
  }

  return orderedCardsByCategory.value[activeCategory.value] || [];
});

const hiddenCardIdsForActiveCategory = computed(() => {
  if (!activeCategory.value) {
    return new Set();
  }

  return new Set(hiddenCardsByCategory.value[activeCategory.value] || []);
});

const clampGridSpan = (width, fallback = 12, min = 1) => {
  const parsedWidth = Number.parseInt(width, 10);

  if (Number.isNaN(parsedWidth)) {
    return fallback;
  }

  return Math.min(MAX_CARD_WIDTH, Math.max(min, parsedWidth));
};

const clampCardWidth = (width, fallback = 4) =>
  clampGridSpan(width, fallback, MIN_CARD_WIDTH);

const userHasCapability = (capabilities) => {
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    return true;
  }

  const allcaps = appStore.state?.currentUser?.allcaps;
  if (!allcaps) {
    return true;
  }

  return capabilities.some((capability) => Boolean(allcaps[capability]));
};

const hasRequiredPlugins = (requiredPlugins) => {
  if (!Array.isArray(requiredPlugins) || requiredPlugins.length === 0) {
    return true;
  }

  const activePlugins = Array.isArray(appStore.state?.activePlugins)
    ? appStore.state.activePlugins
    : [];

  const activePluginPaths = new Set();
  const activePluginSlugs = new Set();

  activePlugins.forEach((plugin) => {
    if (plugin?.path) {
      activePluginPaths.add(plugin.path);
    }

    if (plugin?.slug) {
      activePluginSlugs.add(plugin.slug);
    }
  });

  return requiredPlugins.every(
    (requiredPlugin) =>
      activePluginPaths.has(requiredPlugin) || activePluginSlugs.has(requiredPlugin)
  );
};

const canRenderItem = (item) => {
  const metadata = item?.metadata || {};

  if (item?.type === 'container' || item?.isGroup) {
    return Array.isArray(item.children) && item.children.some(canRenderItem);
  }

  return (
    Boolean(item?.component) &&
    userHasCapability(
      metadata.requiresCapabilities ?? metadata.requires_capabilities
    ) &&
    hasRequiredPlugins(metadata.requiresPlugins ?? metadata.requires_plugins)
  );
};

const cloneRuntimeCard = (card) => ({
  ...card,
  metadata: {
    ...card.metadata,
    width: clampCardWidth(card.metadata?.width, 4),
    mobileWidth: clampGridSpan(card.metadata?.mobileWidth ?? 12, 12, 1),
  },
  children: Array.isArray(card.children)
    ? card.children.map(cloneRuntimeCard)
    : card.children,
});

const loadStoredLayout = () => {
  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch (error) {
    return {};
  }
};

const loadStoredVisibility = () => {
  try {
    const storedValue = window.localStorage.getItem(
      DASHBOARD_VISIBILITY_STORAGE_KEY
    );
    return storedValue ? JSON.parse(storedValue) : {};
  } catch (error) {
    return {};
  }
};

const normalizeStoredVisibility = (storedVisibility, groupedCards) => {
  if (!storedVisibility || typeof storedVisibility !== 'object') {
    return {};
  }

  const normalizedVisibility = {};

  Object.entries(groupedCards).forEach(([category, cards]) => {
    const registeredIds = new Set(cards.map((card) => card.metadata.id));
    const hiddenIds = Array.isArray(storedVisibility[category])
      ? storedVisibility[category].filter((cardId) => registeredIds.has(cardId))
      : [];

    if (hiddenIds.length > 0) {
      normalizedVisibility[category] = hiddenIds;
    }
  });

  return normalizedVisibility;
};

const applyStoredLayout = (groupedCards, storedLayout) => {
  const categories = storedLayout?.categories || {};
  const nextGroups = {};

  Object.entries(groupedCards).forEach(([category, cards]) => {
    const categoryLayout = categories[category] || {};
    const cardsById = new Map(
      cards.map((card) => [card.metadata.id, cloneRuntimeCard(card)])
    );
    const orderedCards = [];

    (categoryLayout.order || []).forEach((cardId) => {
      if (!cardsById.has(cardId)) {
        return;
      }

      orderedCards.push(cardsById.get(cardId));
      cardsById.delete(cardId);
    });

    cardsById.forEach((card) => {
      orderedCards.push(card);
    });

    orderedCards.forEach((card) => {
      const savedWidth = categoryLayout.widths?.[card.metadata.id];

      if (savedWidth != null) {
        card.metadata.width = clampCardWidth(savedWidth, card.metadata.width);
      }
    });

    nextGroups[category] = orderedCards;
  });

  registeredCategories.value.forEach((category) => {
    if (!nextGroups[category.value]) {
      nextGroups[category.value] = [];
    }
  });

  return nextGroups;
};

const persistDashboardLayout = () => {
  try {
    const categories = {};

    Object.entries(orderedCardsByCategory.value).forEach(([category, cards]) => {
      categories[category] = {
        order: cards.map((card) => card.metadata.id),
        widths: cards.reduce((widths, card) => {
          widths[card.metadata.id] = clampCardWidth(card.metadata.width, 4);
          return widths;
        }, {}),
      };
    });

    window.localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ categories })
    );
  } catch (error) {}
};

const persistHiddenCards = () => {
  try {
    window.localStorage.setItem(
      DASHBOARD_VISIBILITY_STORAGE_KEY,
      JSON.stringify(hiddenCardsByCategory.value)
    );
  } catch (error) {}
};

const syncViewportState = () => {
  if (!window.matchMedia) {
    return;
  }

  isMobileViewport.value = window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
};

const removeResizeListeners = () => {
  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup', handleResizeEnd);
  window.removeEventListener('pointercancel', handleResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const updateDateRangeQueryParams = (range) => {
  if (!Array.isArray(range) || range.length !== 2) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);

  if (range[0]) {
    urlParams.set('date_from', formatDateForQuery(range[0]));
  } else {
    urlParams.delete('date_from');
  }

  if (range[1]) {
    urlParams.set('date_to', formatDateForQuery(range[1]));
  } else {
    urlParams.delete('date_to');
  }

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${urlParams.toString()}`
  );
};

const getHiddenIdsForCategory = (categoryId) =>
  new Set(hiddenCardsByCategory.value?.[categoryId] || []);

const syncVisibleCards = () => {
  if (!activeCategory.value) {
    visibleCards.value = [];
    return;
  }

  const hiddenIds = getHiddenIdsForCategory(activeCategory.value);
  const orderedCards = orderedCardsByCategory.value[activeCategory.value] || [];

  visibleCards.value = orderedCards.filter(
    (card) => !hiddenIds.has(card.metadata.id) && canRenderItem(card)
  );
};

const syncRegistrySnapshot = (snapshot) => {
  registrySnapshot.value = snapshot;
  orderedCardsByCategory.value = applyStoredLayout(
    snapshot.runtimeCardsByCategory || {},
    loadStoredLayout()
  );

  const normalizedVisibility = normalizeStoredVisibility(
    hiddenCardsByCategory.value,
    orderedCardsByCategory.value
  );

  const totalRenderableCards = Object.values(orderedCardsByCategory.value).reduce(
    (count, cards) => count + cards.filter((card) => canRenderItem(card)).length,
    0
  );

  const totalVisibleCards = Object.entries(orderedCardsByCategory.value).reduce(
    (count, [category, cards]) => {
      const hiddenIds = new Set(normalizedVisibility[category] || []);
      return (
        count +
        cards.filter(
          (card) => canRenderItem(card) && !hiddenIds.has(card.metadata.id)
        ).length
      );
    },
    0
  );

  const shouldResetHiddenState =
    totalRenderableCards > 0 && totalVisibleCards === 0;

  hiddenCardsByCategory.value = shouldResetHiddenState
    ? {}
    : normalizedVisibility;

  if (shouldResetHiddenState) {
    persistHiddenCards();
  }

  syncVisibleCards();
};

const isItemVisible = (itemId) => !hiddenCardIdsForActiveCategory.value.has(itemId);

const setItemVisibility = (itemId, isVisible) => {
  if (!activeCategory.value) {
    return;
  }

  const hiddenIds = getHiddenIdsForCategory(activeCategory.value);

  if (isVisible) {
    hiddenIds.delete(itemId);
  } else {
    hiddenIds.add(itemId);
  }

  hiddenCardsByCategory.value = {
    ...hiddenCardsByCategory.value,
    [activeCategory.value]: [...hiddenIds],
  };

  persistHiddenCards();
  syncVisibleCards();
};

const toggleItemVisibility = (itemId) => {
  setItemVisibility(itemId, !isItemVisible(itemId));
};

const openVisibilityModal = () => {
  visibilityModal.value?.show();
};

const closeVisibilityModal = () => {
  visibilityModal.value?.close();
};

const handleResizeStart = ({ event, cardId }) => {
  if (isMobileViewport.value || !dashboardGrid.value) {
    return;
  }

  const activeCard = visibleCards.value.find((card) => card.metadata.id === cardId);

  if (!activeCard) {
    return;
  }

  const gridBounds = dashboardGrid.value.getBoundingClientRect();

  if (!gridBounds.width) {
    return;
  }

  resizeSession = {
    cardId,
    startX: event.clientX,
    startWidth: clampCardWidth(activeCard.metadata.width, 4),
    gridWidth: gridBounds.width,
    category: activeCategory.value,
  };

  resizingCardId.value = cardId;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('pointermove', handleResizeMove);
  window.addEventListener('pointerup', handleResizeEnd);
  window.addEventListener('pointercancel', handleResizeEnd);
};

const handleResizeMove = (event) => {
  if (!resizeSession) {
    return;
  }

  const categoryCards = orderedCardsByCategory.value[resizeSession.category] || [];
  const resizedCard = categoryCards.find(
    (card) => card.metadata.id === resizeSession.cardId
  );

  if (!resizedCard) {
    return;
  }

  const columnWidth = resizeSession.gridWidth / DASHBOARD_GRID_COLUMNS;
  const deltaColumns = Math.round(
    (event.clientX - resizeSession.startX) / columnWidth
  );
  const nextWidth = clampCardWidth(resizeSession.startWidth + deltaColumns);

  if (nextWidth !== resizedCard.metadata.width) {
    resizedCard.metadata.width = nextWidth;
    syncVisibleCards();
  }
};

function handleResizeEnd() {
  if (!resizeSession) {
    return;
  }

  resizeSession = null;
  resizingCardId.value = null;
  removeResizeListeners();
  persistDashboardLayout();
}

const handleCardOrderChange = () => {
  if (!activeCategory.value) {
    return;
  }

  const hiddenIds = getHiddenIdsForCategory(activeCategory.value);
  const fullOrder = orderedCardsByCategory.value[activeCategory.value] || [];
  let visibleIndex = 0;

  orderedCardsByCategory.value[activeCategory.value] = fullOrder.map((card) => {
    if (hiddenIds.has(card.metadata.id)) {
      return card;
    }

    const nextCard = visibleCards.value[visibleIndex];
    visibleIndex += 1;
    return nextCard || card;
  });

  persistDashboardLayout();
  syncVisibleCards();
}

const handleDateRangeChange = (newDateRange) => {
  dateRange.value = newDateRange;
  updateDateRangeQueryParams(newDateRange);
};

watch(
  registeredCategories,
  () => {
    activeCategory.value = activeCategoryIdFromQuery.value;
  },
  { deep: true, immediate: true }
);

watch(activeCategory, (newValue, oldValue) => {
  if (!newValue || newValue === oldValue) {
    syncVisibleCards();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('dashboard_category', newValue);

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${urlParams.toString()}`
  );

  syncVisibleCards();
});

watch(
  () => appStore.state?.currentUser?.allcaps,
  () => {
    syncVisibleCards();
  },
  { deep: true }
);

watch(
  () => appStore.state?.activePlugins,
  () => {
    syncVisibleCards();
  },
  { deep: true }
);

onMounted(async () => {
  hiddenCardsByCategory.value = loadStoredVisibility();
  syncViewportState();

  if (window.matchMedia) {
    mediaQueryList = window.matchMedia(MOBILE_VIEWPORT_QUERY);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', syncViewportState);
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(syncViewportState);
    }
  }

  const readyEvent = new CustomEvent('flexify-dashboard/dashboard/ready');
  document.dispatchEvent(readyEvent);

  await nextTick();

  const filteredCategories = await applyFilters(
    'flexify-dashboard/dashboard/categories/register',
    []
  );

  filteredCategories.forEach((category) => {
    dashboardRegistry.registerCategory(category);
  });

  if (isWooCommerceActive.value) {
    dashboardRegistry.registerCategory({
      id: 'ecommerce',
      label: translate('e-Commerce', 'flexify-dashboard'),
    });
  }

  const filteredCards = await applyFilters(
    'flexify-dashboard/dashboard/cards/register',
    []
  );

  filteredCards.forEach((card) => {
    dashboardRegistry.registerLegacyItem(card, 'legacy-filter');
  });

  syncRegistrySnapshot(dashboardRegistry.getRegistry());
  unsubscribeRegistry = window.flexifyDashboard?.dashboard?.subscribe(
    syncRegistrySnapshot
  );

  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('date_from') || !urlParams.has('date_to')) {
    updateDateRangeQueryParams(dateRange.value);
  }
});

onUnmounted(() => {
  handleResizeEnd();

  if (unsubscribeRegistry) {
    unsubscribeRegistry();
    unsubscribeRegistry = null;
  }

  if (!mediaQueryList) {
    return;
  }

  if (typeof mediaQueryList.removeEventListener === 'function') {
    mediaQueryList.removeEventListener('change', syncViewportState);
  } else if (typeof mediaQueryList.removeListener === 'function') {
    mediaQueryList.removeListener(syncViewportState);
  }
});
</script>

<template>
  <div tag="div" class="flexify-dashboard-isolation">
    <component is="style"> #wpcontent{padding:0}</component>
    <Notifications />

    <div
      :class="isDark ? 'dark' : ''"
      class="border border-solid border-zinc-200/50 dark:border-zinc-700/30 rounded-l-3xl max-h-[var(--fd-body-height)] overflow-auto bg-zinc-50 dark:bg-[#1a222c]"
    >
      <div
        class="@container flexify-dashboard-normalize font-sans p-8 flex flex-col gap-6 text-zinc-500 dark:text-zinc-400"
        style="min-height: calc(100dvh - var(--wp-admin--admin-bar--height))"
      >
        <div class="flex flex-row justify-between items-center mb-3">
          <div>
            <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Dashboard', 'flexify-dashboard') }}
            </h1>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {{ __('Overview of your site activity', 'flexify-dashboard') }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <AppButton
              buttontype="button"
              icon="tune"
              @click="openVisibilityModal"
            >
              {{ __('Manage Cards', 'flexify-dashboard') }}
            </AppButton>

            <DateRangePicker
              :value="dateRange"
              @updated="handleDateRangeChange"
            />
          </div>
        </div>

        <div
          v-if="registeredCategories.length > 0"
          class="flex items-center mb-3"
        >
          <AppToggle
            :options="formattedCategories"
            v-model="activeCategory"
            class="w-auto mr-auto"
            style="width: auto"
          />
        </div>

        <div
          v-if="hasRegisteredCards && hasVisibleCards"
          ref="dashboardGrid"
          class="grid grid-cols-12 gap-3 md:gap-4 xl:gap-6"
        >
          <VueDraggableNext
            class="contents"
            :list="visibleCards"
            :sort="!isMobileViewport"
            :disabled="isMobileViewport || resizingCardId !== null"
            handle=".fd-card-drag-handle"
            animation="250"
            ghost-class="fd-dashboard-card-ghost"
            chosen-class="fd-dashboard-card-chosen"
            drag-class="fd-dashboard-card-dragging"
            @end="handleCardOrderChange"
          >
            <template
              v-for="card in visibleCards"
              :key="card.metadata.id"
            >
              <CardRender
                :card="card"
                :date-range="dateRange"
                :is-mobile="isMobileViewport"
                :is-resizing="resizingCardId === card.metadata.id"
                @resize-start="handleResizeStart"
              />
            </template>
          </VueDraggableNext>
        </div>

        <div
          v-else-if="hasRegisteredCards"
          class="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-8 text-center flex flex-col items-center"
        >
          <AppIcon
            icon="visibility_off"
            class="text-4xl text-zinc-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {{ __('No visible cards in this category', 'flexify-dashboard') }}
          </h3>
          <p class="text-zinc-500 dark:text-zinc-400 mb-4">
            {{
              __(
                'Use Manage Cards to show the cards you want for this category.',
                'flexify-dashboard'
              )
            }}
          </p>
          <AppButton buttontype="button" @click="openVisibilityModal">
            {{ __('Open Manage Cards', 'flexify-dashboard') }}
          </AppButton>
        </div>

        <div
          v-else
          class="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-8 text-center"
        >
          <AppIcon
            icon="dashboard"
            class="text-4xl text-zinc-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {{ __('No Dashboard Cards', 'flexify-dashboard') }}
          </h3>
          <p class="text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'Install plugins or extensions to add dashboard cards here.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>

        <Confirm ref="confirm" />
      </div>
    </div>

    <Modal ref="visibilityModal" position="top">
      <div
        class="w-[720px] max-w-[calc(100vw-2rem)] p-6 md:p-8 flex flex-col gap-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Manage Dashboard Cards', 'flexify-dashboard') }}
            </h2>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {{
                __(
                  'Card visibility is stored independently for each category.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>

          <AppButton type="transparent" buttontype="button" @click="closeVisibilityModal">
            <AppIcon icon="close" class="text-base" />
          </AppButton>
        </div>

        <div v-if="registeredCategories.length > 0">
          <AppToggle
            :options="formattedCategories"
            v-model="activeCategory"
            class="w-auto"
            style="width: auto"
          />
        </div>

        <div
          v-if="modalItemsForActiveCategory.length > 0"
          class="max-h-[60vh] overflow-auto pr-1 flex flex-col gap-3"
        >
          <button
            v-for="item in modalItemsForActiveCategory"
            :key="item.metadata.id"
            type="button"
            class="w-full text-left rounded-2xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 px-4 py-4 flex items-start justify-between gap-4 transition hover:border-zinc-300 dark:hover:border-zinc-600"
            @click="toggleItemVisibility(item.metadata.id)"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {{ __(item.metadata.title, 'flexify-dashboard') }}
                </span>
                <span
                  v-if="item.type === 'container' || item.isGroup"
                  class="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-300"
                >
                  {{ __('Container', 'flexify-dashboard') }}
                </span>
              </div>
              <p
                v-if="item.metadata.description"
                class="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
              >
                {{ __(item.metadata.description, 'flexify-dashboard') }}
              </p>
            </div>

            <div
              class="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              :class="
                isItemVisible(item.metadata.id)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              "
            >
              <AppIcon
                :icon="isItemVisible(item.metadata.id) ? 'visibility' : 'visibility_off'"
                class="text-sm"
              />
              <span>
                {{
                  isItemVisible(item.metadata.id)
                    ? __('Visible', 'flexify-dashboard')
                    : __('Hidden', 'flexify-dashboard')
                }}
              </span>
            </div>
          </button>
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
        >
          {{ __('No cards registered for this category yet.', 'flexify-dashboard') }}
        </div>
      </div>
    </Modal>
  </div>
</template>

<style>
.fd-dashboard-card-shell > *:last-child {
  border-radius: 0.725rem !important;
}
</style>
