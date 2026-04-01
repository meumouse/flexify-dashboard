<script setup>
import { computed, defineEmits, defineOptions, defineProps } from 'vue';

// Import the global component renderer
import ComponentRender from '@/components/app/component-render/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
	card: {
		type: Object,
		required: true,
	},
	dateRange: {
		type: Array,
		required: true,
	},
	isMobile: {
		type: Boolean,
		default: false,
	},
	isResizing: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(['resize-start']);

const colSpanClasses = {
	1: 'col-span-1',
	2: 'col-span-2',
	3: 'col-span-3',
	4: 'col-span-4',
	5: 'col-span-5',
	6: 'col-span-6',
	7: 'col-span-7',
	8: 'col-span-8',
	9: 'col-span-9',
	10: 'col-span-10',
	11: 'col-span-11',
	12: 'col-span-12',
};

const mobileColSpanClasses = {
	1: 'max-md:col-span-1',
	2: 'max-md:col-span-2',
	3: 'max-md:col-span-3',
	4: 'max-md:col-span-4',
	5: 'max-md:col-span-5',
	6: 'max-md:col-span-6',
	7: 'max-md:col-span-7',
	8: 'max-md:col-span-8',
	9: 'max-md:col-span-9',
	10: 'max-md:col-span-10',
	11: 'max-md:col-span-11',
	12: 'max-md:col-span-12',
};

const gridColumnClasses = {
	1: 'grid-cols-1',
	2: 'grid-cols-2',
	3: 'grid-cols-3',
	4: 'grid-cols-4',
	5: 'grid-cols-5',
	6: 'grid-cols-6',
};

const getColSpanClass = (span = 4) => colSpanClasses[span] || colSpanClasses[4];
const getMobileColSpanClass = (span = 12) =>
  mobileColSpanClasses[span] || mobileColSpanClasses[12];
const getGridColsClass = (cols = 2) => gridColumnClasses[cols] || gridColumnClasses[2];
const getDesktopSpan = (span = 4) => colSpanClasses[span] || colSpanClasses[4];

/**
 * Gets the className for the card wrapper based on metadata (grid layout classes)
 * @returns {string} The className string for grid positioning
 */
const cardClassName = computed(() => {
	return `${getDesktopSpan(props.card.metadata.width)} ${getMobileColSpanClass(
		props.card.metadata.mobileWidth ?? 12
	)} h-full flex flex-col`;
});

const groupClassName = computed(() => {
	return `${getColSpanClass(props.card.metadata.width || 12)} ${getMobileColSpanClass(
		props.card.metadata.mobileWidth || 12
	)}`;
});

const groupGridClassName = computed(() => {
  	return `grid ${getGridColsClass(props.card.metadata.columns || 2)} gap-6`;
});

defineOptions({
  	name: 'CardRender',
});
</script>

<template>
	<!-- Single Card -->
	<template v-if="!card.isGroup">
		<div :class="cardClassName">
			<div class="relative h-full flex flex-col fd-dashboard-card-shell">
				<button
					v-if="!isMobile"
					type="button"
					class="fd-card-drag-handle absolute right-2 top-2 z-20 inline-flex h-9 w-9 cursor-grab items-center justify-center text-zinc-500 transition hover:text-zinc-900 active:cursor-grabbing dark:text-zinc-300 dark:hover:text-zinc-50"
					:aria-label="__('Reorder card', 'flexify-dashboard')"
					:title="__('Drag to reorder', 'flexify-dashboard')"
				>
					<AppIcon icon="drag_indicator" class="text-base" />
				</button>
				<button
					v-if="!isMobile"
					type="button"
					class="fd-card-resize-handle absolute bottom-2 right-2 z-20 inline-flex h-9 w-9 cursor-col-resize items-center justify-center text-zinc-500 shadow-sm transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
					:class="isResizing ? 'scale-105 text-brand-600 dark:text-brand-400' : ''"
					:aria-label="__('Resize card', 'flexify-dashboard')"
					:title="__('Drag to resize', 'flexify-dashboard')"
					@pointerdown.stop.prevent="emit('resize-start', { event: $event, cardId: card.metadata.id })"
				>
					<AppIcon icon="resize" class="text-base" />
				</button>
				<ComponentRender :item="card" :date-range="dateRange" class="h-full flex-1" />
			</div>
		</div>
	</template>

	<!-- Group Card -->
	<template v-else-if="card.isGroup">
		<div :class="groupClassName">
      		<div :class="groupGridClassName">
				<CardRender v-for="child in card.children" :key="child.metadata.id" :card="child" :date-range="dateRange" />
			</div>
		</div>
	</template>
</template>
