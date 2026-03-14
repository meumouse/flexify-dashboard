<script setup>
import { computed, defineProps, defineOptions } from 'vue';

// Import the global component renderer
import ComponentRender from '@/components/app/component-render/index.vue';

const props = defineProps({
	card: {
		type: Object,
		required: true,
	},
	dateRange: {
		type: Array,
		required: true,
	},
});

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

/**
 * Gets the className for the card wrapper based on metadata (grid layout classes)
 * @returns {string} The className string for grid positioning
 */
const cardClassName = computed(() => {
	return `${getColSpanClass(props.card.metadata.width)} ${getMobileColSpanClass(
		props.card.metadata.mobileWidth
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
		<ComponentRender :item="card" :date-range="dateRange" class="h-full flex-1" />
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