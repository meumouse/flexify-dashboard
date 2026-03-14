<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

const router = useRouter();

// Refs
const query = ref('SELECT * FROM wp_posts LIMIT 100;');
const loading = ref(false);
const results = ref([]);
const queryHistory = ref([]);
const showHistory = ref(false);

/**
 * Executes the SQL query
 */
const executeQuery = async () => {
  if (!query.value.trim()) {
    notify({
      title: __('Please enter a SQL query', 'flexify-dashboard'),
      type: 'warning',
    });
    return;
  }

  loading.value = true;
  results.value = [];

  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/database/query',
      type: 'POST',
      data: {
        query: query.value.trim(),
        limit: 1000,
      },
    };
    const data = await lmnFetch(args);
    if (data && data.data) {
      results.value = data.data.data || [];
      
      // Add to history
      queryHistory.value.unshift({
        query: query.value.trim(),
        timestamp: new Date().toISOString(),
        rows: data.data.rows_affected || 0,
      });
      
      // Keep only last 20 queries
      if (queryHistory.value.length > 20) {
        queryHistory.value = queryHistory.value.slice(0, 20);
      }
      
      notify({
        title: sprintf(__('Query executed successfully. %d rows returned.', 'flexify-dashboard'), results.value.length),
        type: 'success',
      });
    }
  } catch (error) {
    notify({
      title: error.message || __('Error executing query', 'flexify-dashboard'),
      type: 'error',
    });
    console.error('Error executing query:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * Loads a query from history
 * @param {Object} historyItem - The history item to load
 */
const loadFromHistory = (historyItem) => {
  query.value = historyItem.query;
  showHistory.value = false;
};

/**
 * Clears the query editor
 */
const clearQuery = () => {
  query.value = '';
  results.value = [];
};

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} Escaped HTML string
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Gets column display value (escaped for safety)
 * @param {*} value - The value to display
 * @returns {string} Formatted and escaped value
 */
const getDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return '<span class="text-zinc-400 italic">NULL</span>';
  }
  if (typeof value === 'object') {
    return escapeHtml(JSON.stringify(value));
  }
  return escapeHtml(String(value));
};

/**
 * Handles keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
const handleKeyDown = (event) => {
  // Ctrl/Cmd + Enter to execute
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    executeQuery();
  }
};

onMounted(() => {
  // Load sample query
  query.value = 'SELECT * FROM wp_posts LIMIT 100;';
});
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-zinc-900">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800"
    >
      <div class="flex items-center gap-4">
        <AppButton
          @click="router.push('/')"
          type="transparent"
          class="p-2"
        >
          <AppIcon icon="arrow_back" class="text-base" />
        </AppButton>
        <div>
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {{ __('SQL Query Editor', 'flexify-dashboard') }}
          </h2>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Execute SELECT queries only (read-only for safety)', 'flexify-dashboard') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <AppButton
          @click="showHistory = !showHistory"
          type="transparent"
          class="text-sm"
        >
          <AppIcon icon="history" class="text-base mr-2" />
          {{ __('History', 'flexify-dashboard') }}
        </AppButton>
        <AppButton @click="clearQuery" type="transparent" class="text-sm">
          {{ __('Clear', 'flexify-dashboard') }}
        </AppButton>
        <AppButton
          @click="executeQuery"
          :disabled="loading || !query.trim()"
          type="primary"
          class="text-sm"
        >
          <AppIcon icon="play_arrow" class="text-base mr-2" />
          {{ __('Execute', 'flexify-dashboard') }}
          <span class="ml-2 text-xs opacity-70">(Ctrl+Enter)</span>
        </AppButton>
      </div>
    </div>

    <!-- Query History Sidebar -->
    <Transition>
      <div
        v-if="showHistory"
        class="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-10 overflow-y-auto"
      >
        <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Query History', 'flexify-dashboard') }}
            </h3>
            <AppButton
              @click="showHistory = false"
              type="transparent"
              class="p-1"
            >
              <AppIcon icon="close" class="text-base" />
            </AppButton>
          </div>
        </div>
        <div class="p-2">
          <div
            v-if="queryHistory.length === 0"
            class="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
          >
            {{ __('No query history', 'flexify-dashboard') }}
          </div>
          <div
            v-for="(item, index) in queryHistory"
            :key="index"
            @click="loadFromHistory(item)"
            class="p-3 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-2 transition-colors"
          >
            <div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {{ new Date(item.timestamp).toLocaleString() }}
            </div>
            <div class="text-sm text-zinc-900 dark:text-zinc-100 font-mono truncate">
              {{ item.query }}
            </div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {{ item.rows }} {{ __('rows', 'flexify-dashboard') }}
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Query Editor -->
      <div class="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
          <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {{ __('SQL Query', 'flexify-dashboard') }}
          </span>
        </div>
        <textarea
          v-model="query"
          @keydown="handleKeyDown"
          class="flex-1 p-4 font-mono text-sm bg-transparent text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none"
          :placeholder="__('Enter your SELECT query here...', 'flexify-dashboard')"
        ></textarea>
      </div>

      <!-- Results -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
          <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {{ __('Results', 'flexify-dashboard') }}
            <span v-if="results.length > 0" class="ml-2">
              ({{ results.length }} {{ __('rows', 'flexify-dashboard') }})
            </span>
          </span>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div v-if="loading" class="space-y-4">
            <div
              v-for="i in 5"
              :key="i"
              class="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
            ></div>
          </div>

          <div v-else-if="results.length === 0" class="text-center py-12">
            <AppIcon
              icon="database"
              class="text-4xl text-zinc-300 dark:text-zinc-700 mx-auto mb-4"
            />
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __('No results yet. Execute a query to see results.', 'flexify-dashboard') }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                <tr>
                  <th
                    v-for="column in Object.keys(results[0] || {})"
                    :key="column"
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr
                  v-for="(row, index) in results"
                  :key="index"
                  class="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <td
                    v-for="(value, column) in row"
                    :key="column"
                    class="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate"
                    :title="getDisplayValue(value)"
                  >
                    <span v-html="getDisplayValue(value)"></span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@/assets/css/tailwind.css";

/* Custom scrollbar */
.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  @apply bg-transparent;
}

.overflow-auto::-webkit-scrollbar-thumb {
  @apply bg-zinc-300 dark:bg-zinc-700 rounded-full;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-zinc-400 dark:bg-zinc-600;
}

/* Transition for history sidebar */
.v-enter-active,
.v-leave-active {
  transition: transform 0.2s ease-in-out;
}

.v-enter-from {
  transform: translateX(100%);
}

.v-leave-to {
  transform: translateX(100%);
}
</style>

