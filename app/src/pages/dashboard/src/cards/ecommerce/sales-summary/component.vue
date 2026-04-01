<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });
const orders = ref([]);
const currency = ref('USD');
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        orders.value = data?.recent_orders || [];
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
    <div class="mb-5">
      <h3 class="text-[1.85rem] leading-none font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Resumo de vendas', 'flexify-dashboard') }}</h3>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{{ __('Últimos 5 pedidos', 'flexify-dashboard') }}</p>
    </div>

    <div v-if="loading" class="space-y-4">
      <div
        v-for="index in 5"
        :key="`sales-summary-placeholder-${index}`"
        class="grid grid-cols-[5rem_1.3fr_1.8fr_1.3fr] items-center gap-4"
      >
        <div class="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse justify-self-end"></div>
      </div>
    </div>

    <div v-else-if="orders.length" class="overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse">
        <thead>
          <tr class="border-b border-zinc-200/80 dark:border-zinc-700/70">
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Origem', 'flexify-dashboard') }}</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('ID do pedido', 'flexify-dashboard') }}</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Cliente', 'flexify-dashboard') }}</th>
            <th class="pb-4 px-3 text-left text-sm font-semibold text-zinc-950 dark:text-zinc-100">{{ __('Valor do pedido', 'flexify-dashboard') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in orders"
            :key="order.id"
            class="border-b border-zinc-200/80 last:border-b-0 dark:border-zinc-700/60"
          >
            <td class="px-3 py-4">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-xl text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
                :title="order.source?.label"
              >
                <i :class="order.source?.icon || 'bx bx-shopping-bag'"></i>
              </div>
            </td>
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">
              <a
                :href="order.edit_url"
                class="text-blue-700 underline decoration-blue-700/30 underline-offset-2 transition hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200"
              >
                {{ order.id }}
              </a>
            </td>
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">{{ order.customer_name }}</td>
            <td class="px-3 py-4 text-sm text-zinc-900 dark:text-zinc-100">{{ formatCurrency(order.total, currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">{{ __('Sem pedidos no período selecionado.', 'flexify-dashboard') }}</p>
  </div>
</template>
