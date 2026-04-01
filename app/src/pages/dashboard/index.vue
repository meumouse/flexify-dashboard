<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { VueDraggableNext } from 'vue-draggable-next';
import { useDarkMode } from './src/useDarkMode.js';
const { isDark } = useDarkMode();

// Configure veaury for React 19 support
import { setVeauryOptions } from 'veaury';
import { createRoot } from 'react-dom/client';
setVeauryOptions({
  react: {
    createRoot,
  },
});

// Import the hooks system
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';

// Cards
import './src/cards/index.js';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import CardRender from './src/card-render.vue';

// Dashboard components
import DateRangePicker from './src/date-range-picker.vue';

// Refs
const confirm = ref(null);

// Helper function to parse date from query param
const parseDateFromQuery = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Helper function to format date for query param (YYYY-MM-DD)
const formatDateForQuery = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initialize date range from query params or use default
const initializeDateRange = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dateFrom = urlParams.get('date_from');
  const dateTo = urlParams.get('date_to');

  if (dateFrom && dateTo) {
    const fromDate = parseDateFromQuery(dateFrom);
    const toDate = parseDateFromQuery(dateTo);
    if (fromDate && toDate) {
      return [fromDate, toDate];
    }
  }

  // Default: last 7 days
  return [new Date(new Date().setDate(new Date().getDate() - 7)), new Date()];
};

// Dashboard state
const dateRange = ref(initializeDateRange());

const cardsByCategory = ref({});
const registeredCategories = ref([]);
const activeCategory = ref(null);
const loading = ref(false);
const dashboardGrid = ref(null);
const isMobileViewport = ref(false);
const resizingCardId = ref(null);

const DASHBOARD_LAYOUT_STORAGE_KEY = 'flexify-dashboard:dashboard-layout:v1';
const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';
const DASHBOARD_GRID_COLUMNS = 12;
const MIN_CARD_WIDTH = 3;
const MAX_CARD_WIDTH = 12;

let mediaQueryList = null;
let resizeSession = null;

const isWooCommerceActive = computed(() => {
    const plugins = appStore.state?.activePlugins || [];

    return plugins.some((plugin) =>
      	plugin?.path === 'woocommerce/woocommerce.php' || plugin?.slug === 'woocommerce'
    );
});

const activeCategoryID = computed(() => {
	const urlParams = new URLSearchParams(window.location.search);
	const dashboardCategory = urlParams.get('dashboard_category');

	if (dashboardCategory) {
		const siteCategory = registeredCategories.value.find(
			(category) => category.value === dashboardCategory
		)?.value;

		if (siteCategory) {
			return siteCategory;
		}
	}

	if (registeredCategories.value[0]) {
		return registeredCategories.value[0].value;
	}

	return null;
});

const formattedCategories = computed(() => {
	const formattedCategories = {};

	registeredCategories.value.forEach((category) => {
		formattedCategories[category.value] = category;
	});

	return formattedCategories;
});

const activeCategoryCards = computed(() => {
	if (!activeCategory.value) {
		return [];
	}

	return cardsByCategory.value[activeCategory.value] || [];
});

const hasRegisteredCards = computed(() =>
	Object.values(cardsByCategory.value).some((cards) => cards.length > 0)
);

const clampGridSpan = (width, fallback = 12, min = 1) => {
	const parsedWidth = Number.parseInt(width, 10);

	if (Number.isNaN(parsedWidth)) {
		return fallback;
	}

	return Math.min(MAX_CARD_WIDTH, Math.max(min, parsedWidth));
};

const clampCardWidth = (width, fallback = 4) =>
	clampGridSpan(width, fallback, MIN_CARD_WIDTH);

const cloneRegisteredCard = (card) => ({
	...card,
	metadata: {
		...card.metadata,
		width: clampCardWidth(card.metadata?.width, 4),
		mobileWidth: clampGridSpan(card.metadata?.mobileWidth ?? 12, 12, 1),
	},
	children: Array.isArray(card.children)
		? card.children.map(cloneRegisteredCard)
		: card.children,
});

const groupCardsByCategory = (cards) =>
	cards.reduce((groups, card) => {
		const category = card.metadata?.category || 'site';

		if (!groups[category]) {
			groups[category] = [];
		}

		groups[category].push(cloneRegisteredCard(card));
		return groups;
	}, {});

const loadStoredLayout = () => {
	try {
		const storedValue = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
		return storedValue ? JSON.parse(storedValue) : {};
	} catch (error) {
		return {};
	}
};

const applyStoredLayout = (groupedCards, storedLayout) => {
	const categories = storedLayout?.categories || {};
	const nextGroups = {};

	Object.entries(groupedCards).forEach(([category, cards]) => {
		const categoryLayout = categories[category] || {};
		const cardsById = new Map(cards.map((card) => [card.metadata.id, card]));
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

	return nextGroups;
};

const persistDashboardLayout = () => {
	try {
		const categories = {};

		Object.entries(cardsByCategory.value).forEach(([category, cards]) => {
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

const handleResizeStart = ({ event, cardId }) => {
	if (isMobileViewport.value || !dashboardGrid.value) {
		return;
	}

	const activeCard = activeCategoryCards.value.find((card) => card.metadata.id === cardId);
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

	const categoryCards = cardsByCategory.value[resizeSession.category] || [];
	const resizedCard = categoryCards.find(
		(card) => card.metadata.id === resizeSession.cardId
	);

	if (!resizedCard) {
		return;
	}

	const columnWidth = resizeSession.gridWidth / DASHBOARD_GRID_COLUMNS;
	const deltaColumns = Math.round((event.clientX - resizeSession.startX) / columnWidth);
	const nextWidth = clampCardWidth(resizeSession.startWidth + deltaColumns);

	if (nextWidth !== resizedCard.metadata.width) {
		resizedCard.metadata.width = nextWidth;
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
	persistDashboardLayout();
};

/**
 * Handle date range changes
 */
const handleDateRangeChange = (newDateRange) => {
	dateRange.value = newDateRange;
	updateDateRangeQueryParams(newDateRange);
};

/**
 * Update query parameters with date range
 */
const updateDateRangeQueryParams = (range) => {
	if (!range || !Array.isArray(range) || range.length !== 2) {
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

watch(
	registeredCategories,
	(newVal, oldVal) => {
		activeCategory.value = activeCategoryID.value;
	},
	{ deep: true }
);

onMounted(async () => {
  syncViewportState();

  if (window.matchMedia) {
    mediaQueryList = window.matchMedia(MOBILE_VIEWPORT_QUERY);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', syncViewportState);
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(syncViewportState);
    }
  }

  // Dispatch event for plugins to register cards
  const event = new CustomEvent('flexify-dashboard/dashboard/ready');
  document.dispatchEvent(event);

  await nextTick();

  // Add categories
  registeredCategories.value = await applyFilters(
    'flexify-dashboard/dashboard/categories/register',
    registeredCategories.value
  );

  if (
    isWooCommerceActive.value &&
    !registeredCategories.value.some((category) => category.value === 'e-commerce')
  ) {
    registeredCategories.value.push({
      value: 'e-commerce',
      label: __('e-Commerce', 'flexify-dashboard'),
    });
  }

  // Let other apps modify/add to the widgets array
  const registeredCards = await applyFilters(
    'flexify-dashboard/dashboard/cards/register',
    []
  );

  cardsByCategory.value = applyStoredLayout(
    groupCardsByCategory(registeredCards),
    loadStoredLayout()
  );

  // Initialize date range query params if not present
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('date_from') || !urlParams.has('date_to')) {
    updateDateRangeQueryParams(dateRange.value);
  }
});

watch(activeCategory, (newVal, oldVal) => {
  if (newVal === oldVal) return;

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('dashboard_category', newVal);
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${urlParams.toString()}`
  );
});

onUnmounted(() => {
  handleResizeEnd();

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
        <!-- Dashboard Header -->
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
            <!-- Date Range Picker -->
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

        <!-- Dashboard Cards Grid -->
        <div v-if="hasRegisteredCards" ref="dashboardGrid" class="grid grid-cols-12 gap-6 md:gap-8 xl:gap-10">
          <VueDraggableNext
            class="contents"
            :list="activeCategoryCards"
            :sort="!isMobileViewport"
            :disabled="isMobileViewport || resizingCardId !== null"
            handle=".fd-card-drag-handle"
            animation="250"
            ghost-class="fd-dashboard-card-ghost"
            chosen-class="fd-dashboard-card-chosen"
            drag-class="fd-dashboard-card-dragging"
            @end="handleCardOrderChange"
          >
            <template v-for="card in activeCategoryCards" :key="card.metadata.id">
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

        <!-- Default content if no cards -->
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
  </div>
</template>

<style>
.fd-dashboard-card-shell > *:last-child {
  border-radius: 0.725rem !important;
}

.fd-dashboard-card-shell > *:last-child .rounded-xl,
.fd-dashboard-card-shell > *:last-child .rounded-2xl,
.fd-dashboard-card-shell > *:last-child .rounded-3xl,
.fd-dashboard-card-shell > *:last-child .rounded-lg {
  border-radius: 0.5rem !important;
}

.fd-dashboard-card-ghost {
  opacity: 0.35;
}

.fd-dashboard-card-chosen,
.fd-dashboard-card-dragging {
  z-index: 30;
}
</style>
