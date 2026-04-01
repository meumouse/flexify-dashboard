<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });
const items = ref([]);
const currency = ref('USD');
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        items.value = data?.top_products || [];
        currency.value = data?.currency || 'USD';
    } finally {
        loading.value = false;
    }
};

watch(() => props.dateRange, loadData, { deep: true });
onMounted(loadData);
</script>

<template>
  <div class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full flex flex-col">
    <div class="mb-5 flex items-center gap-4">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-[1.4rem] text-sky-600 dark:bg-zinc-800 dark:text-sky-300">
        <i class="bx bx-crown"></i>
      </div>
      <div>
        <h3 class="text-[1.85rem] leading-none font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Produtos mais vendidos', 'flexify-dashboard') }}</h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{{ __('Os 5 produtos mais vendidos em sua loja', 'flexify-dashboard') }}</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div
        v-for="index in 5"
        :key="`placeholder-${index}`"
        class="grid grid-cols-[3rem_1.8fr_0.7fr_1fr] items-center gap-4"
      >
        <div class="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse justify-self-end"></div>
      </div>
    </div>

    <div v-else-if="items.length" class="overflow-x-auto">
      <table class="w-full min-w-[700px] border-collapse">
        <thead>
          <tr class="border-b border-zinc-200/80 dark:border-zinc-700/70">
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">#</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Produto', 'flexify-dashboard') }}</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Pedidos', 'flexify-dashboard') }}</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Faturamento', 'flexify-dashboard') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="item.product_id"
            class="border-b border-zinc-200/80 last:border-b-0 dark:border-zinc-700/60"
          >
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">{{ index + 1 }}</td>
            <td class="px-3 py-4 text-sm">
              <a
                :href="item.edit_url"
                class="text-blue-700 underline decoration-blue-700/30 underline-offset-2 transition hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200"
              >
                {{ item.name }}
              </a>
            </td>
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">{{ item.quantity }}</td>
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">{{ formatCurrency(item.revenue, currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">{{ __('Sem dados no período selecionado.', 'flexify-dashboard') }}</p>
  </div>
</template>
