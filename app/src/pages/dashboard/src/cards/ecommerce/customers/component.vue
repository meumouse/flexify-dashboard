<script setup>
import { computed, ref, watch } from 'vue';
import { getWooDashboardData } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });
const translate = window.wp?.i18n?.__ ?? ((value) => value);

const customers = ref({
    total: 0,
    previous_total: 0,
    change_percentage: 0,
    trend: 'neutral',
});
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        customers.value = {
            total: data?.customers?.total || 0,
            previous_total: data?.customers?.previous_total || 0,
            change_percentage: Number(data?.customers?.change_percentage || 0),
            trend: data?.customers?.trend || 'neutral',
        };
    } finally {
        loading.value = false;
    }
};

const trendIsPositive = computed(() => customers.value.trend === 'up');
const trendIsNegative = computed(() => customers.value.trend === 'down');

const formattedTotal = computed(() =>
    new Intl.NumberFormat('en-US').format(Number(customers.value.total || 0))
);

const formattedChange = computed(() => {
    const value = Math.abs(Number(customers.value.change_percentage || 0));
    return `${value.toFixed(2)}%`;
});

const trendClasses = computed(() => {
    if (trendIsPositive.value) {
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400';
    }

    if (trendIsNegative.value) {
        return 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400';
    }

    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
});

const trendLabel = computed(() => {
    if (trendIsPositive.value) {
        return translate('Growth compared to the previous period', 'flexify-dashboard');
    }

    if (trendIsNegative.value) {
        return translate('Decline compared to the previous period', 'flexify-dashboard');
    }

    return translate('No change compared to the previous period', 'flexify-dashboard');
});

watch(() => props.dateRange, loadData, { deep: true, immediate: true });
</script>

<template>
    <div class="bg-white dark:bg-[#24303f] border border-zinc-200/40 dark:border-[#2e3a47] rounded-3xl py-6 px-8 h-full flex flex-col">
        <div class="mb-5 flex items-center gap-4">
            <div>
                <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {{ __('Customers', 'flexify-dashboard') }}
                </h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    {{ __('Number of customers in the selected period', 'flexify-dashboard') }}
                </p>
            </div>
        </div>

        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <div
                    v-if="loading"
                    class="h-10 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
                ></div>
                <h4
                    v-else
                    class="text-3xl font-bold text-zinc-900 dark:text-zinc-100"
                >
                    {{ formattedTotal }}
                </h4>
            </div>

            <span
                v-if="!loading"
                :class="trendClasses"
                class="inline-flex items-center gap-1 rounded-full py-1 pl-2 pr-2.5 text-sm font-medium self-start"
                :title="trendLabel"
            >
                <svg
                    v-if="trendIsPositive"
                    class="h-3 w-3 fill-current"
                    viewBox="0 0 12 12"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M5.56462 1.62393C5.70193 1.47072 5.90135 1.37432 6.12329 1.37432C6.31631 1.37415 6.50845 1.44731 6.65505 1.59381L9.65514 4.5918C9.94814 4.88459 9.94831 5.35947 9.65552 5.65246C9.36273 5.94546 8.88785 5.94562 8.59486 5.65283L6.87329 3.93247L6.87329 10.125C6.87329 10.5392 6.53751 10.875 6.12329 10.875C5.70908 10.875 5.37329 10.5392 5.37329 10.125L5.37329 3.93578L3.65516 5.65282C3.36218 5.94562 2.8873 5.94547 2.5945 5.65248C2.3017 5.35949 2.30185 4.88462 2.59484 4.59182L5.56462 1.62393Z"
                    />
                </svg>

                <svg
                    v-else-if="trendIsNegative"
                    class="h-3 w-3 fill-current"
                    viewBox="0 0 12 12"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M6.43538 10.3761C6.29807 10.5293 6.09865 10.6257 5.87671 10.6257C5.68369 10.6258 5.49155 10.5527 5.34495 10.4062L2.34486 7.4082C2.05186 7.11541 2.05169 6.64053 2.34448 6.34754C2.63727 6.05454 3.11215 6.05438 3.40514 6.34717L5.12671 8.06753L5.12671 1.875C5.12671 1.46079 5.46249 1.125 5.87671 1.125C6.29092 1.125 6.62671 1.46079 6.62671 1.875L6.62671 8.06422L8.34484 6.34718C8.63782 6.05438 9.1127 6.05453 9.4055 6.34752C9.6983 6.64051 9.69815 7.11538 9.40516 7.40818L6.43538 10.3761Z"
                    />
                </svg>

                {{ formattedChange }}
            </span>
        </div>
    </div>
</template>
