<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import Modal from '@/components/utility/modal/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const loading = ref(false);
const tableName = ref('');
const tableStructure = ref(null);
const tableData = ref([]);
const pagination = ref({
  page: 1,
  per_page: 50,
  total: 0,
  total_pages: 0,
});
const sortBy = ref(null);
const sortOrder = ref('ASC');
const searchQuery = ref('');
const viewMode = ref('data'); // 'data' or 'structure'
const isWpTable = ref(true); // Track if this is a WordPress table
const passwordModal = ref(null);
const password = ref('');
const verifyingPassword = ref(false);
const confirmDelete = ref(null);

/**
 * Fetches table structure
 */
const fetchTableStructure = async () => {
  if (!tableName.value) return;

  loading.value = true;
  try {
    const args = {
      endpoint: `flexify-dashboard/v1/database/tables/${tableName.value}/structure`,
    };
    const data = await lmnFetch(args);
    if (data && data.data) {
      tableStructure.value = data.data;
    }
  } catch (error) {
    notify({
      title: __('Error loading table structure', 'flexify-dashboard'),
      type: 'error',
    });
    console.error('Error fetching table structure:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * Fetches table data
 */
const fetchTableData = async () => {
  if (!tableName.value) return;

  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      per_page: pagination.value.per_page,
      order: sortOrder.value,
    };

    if (sortBy.value) {
      params.orderby = sortBy.value;
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const args = {
      endpoint: `flexify-dashboard/v1/database/tables/${tableName.value}/data`,
      params,
    };
    const data = await lmnFetch(args);
    if (data && data.data) {
      tableData.value = data.data.data || [];
      pagination.value = {
        ...pagination.value,
        ...data.data.pagination,
      };
    }
  } catch (error) {
    notify({
      title: __('Error loading table data', 'flexify-dashboard'),
      type: 'error',
    });
    console.error('Error fetching table data:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * Handles column header click for sorting
 * @param {string} column - Column name to sort by
 */
const handleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC';
  } else {
    sortBy.value = column;
    sortOrder.value = 'ASC';
  }
  pagination.value.page = 1;
  fetchTableData();
};

/**
 * Handles pagination
 */
const goToPage = (page) => {
  pagination.value.page = page;
  fetchTableData();
};

/**
 * Handles search with debounce
 */
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    fetchTableData();
  }, 500);
});

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
 * Formats column type
 * @param {string} type - Column type string
 * @returns {string} Formatted type
 */
const formatColumnType = (type) => {
  return type.split('(')[0].toUpperCase();
};

/**
 * Checks if table is a WordPress table by fetching tables list
 */
const checkIfWpTable = async () => {
  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/database/tables',
    };
    const data = await lmnFetch(args);
    if (data && data.data) {
      const table = data.data.find((t) => t.name === tableName.value);
      if (table) {
        isWpTable.value = table.is_wp_table;
      }
    }
  } catch (error) {
    console.error('Error checking table type:', error);
  }
};

/**
 * Handles password field focus to prevent autofill
 */
const handlePasswordFocus = (event) => {
  // Clear any autofilled value
  if (event.target.value && !password.value) {
    event.target.value = '';
    password.value = '';
  }
};

/**
 * Opens password verification modal
 */
const openDeleteModal = () => {
  password.value = '';
  if (passwordModal.value) {
    passwordModal.value.show();
    // Small delay to ensure field is ready before focusing
    setTimeout(() => {
      const passwordInput = document.querySelector(
        'input[name="verify-password"]'
      );
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }
};

/**
 * Verifies password and proceeds to confirmation
 */
const verifyPassword = async () => {
  if (!password.value.trim()) {
    notify({
      title: __('Please enter your password', 'flexify-dashboard'),
      type: 'warning',
    });
    return;
  }

  verifyingPassword.value = true;

  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/database/verify-password',
      type: 'POST',
      data: {
        password: password.value,
      },
    };
    const response = await lmnFetch(args);

    if (response && response.data && response.data.verified) {
      // Store password temporarily for deletion
      const passwordToUse = password.value;
      if (passwordModal.value) {
        passwordModal.value.close();
      }

      // Show confirmation dialog
      const confirmed = await confirmDelete.value.show({
        title: __('Delete Table?', 'flexify-dashboard'),
        message: sprintf(
          __(
            'Are you sure you want to delete the table "%s"? This action cannot be undone.',
            'flexify-dashboard'
          ),
          tableName.value
        ),
        okButton: __('Yes, delete table', 'flexify-dashboard'),
        icon: 'warning',
      });

      if (confirmed) {
        // Use stored password for deletion
        password.value = passwordToUse;
        await deleteTable();
      } else {
        // Clear password if user cancels
        password.value = '';
      }
    } else {
      notify({
        title: __('Invalid password', 'flexify-dashboard'),
        type: 'error',
      });
    }
  } catch (error) {
    notify({
      title: __('Password verification failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    verifyingPassword.value = false;
  }
};

/**
 * Deletes the table
 */
const deleteTable = async () => {
  loading.value = true;

  try {
    const args = {
      endpoint: `flexify-dashboard/v1/database/tables/${tableName.value}`,
      type: 'DELETE',
      data: {
        password: password.value,
      },
    };
    const response = await lmnFetch(args);

    if (response && response.data && response.data.success) {
      notify({
        title:
          response.data.message || __('Table deleted successfully', 'flexify-dashboard'),
        type: 'success',
      });
      // Navigate back to table list
      router.push('/');
    } else {
      notify({
        title: __('Failed to delete table', 'flexify-dashboard'),
        type: 'error',
      });
    }
  } catch (error) {
    notify({
      title: __('Error deleting table', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
    password.value = '';
  }
};

// Watch route for table name changes
watch(
  () => route.params.tableName,
  (newTableName) => {
    if (newTableName) {
      tableName.value = newTableName;
      viewMode.value = 'data';
      pagination.value.page = 1;
      searchQuery.value = '';
      sortBy.value = null;
      sortOrder.value = 'ASC';
      checkIfWpTable();
      fetchTableStructure();
      fetchTableData();
    }
  },
  { immediate: true }
);

// Watch view mode changes
watch(viewMode, () => {
  if (viewMode.value === 'structure' && !tableStructure.value) {
    fetchTableStructure();
  }
});
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div
      class="px-6 pt-6 pb-4 border-b border-zinc-200/40 dark:border-zinc-700/30"
    >
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            {{ tableName }}
          </h2>
          <p
            v-if="pagination.total > 0"
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            {{ pagination.total.toLocaleString() }}
            {{ __('rows', 'flexify-dashboard') }}
          </p>
        </div>
        <div v-if="!isWpTable">
          <AppButton
            @click="openDeleteModal"
            type="transparent"
            class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <AppIcon icon="delete" class="text-base mr-2" />
            {{ __('Delete Table', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>

      <!-- View Mode Tabs -->
      <div class="flex items-center gap-2">
        <button
          @click="viewMode = 'structure'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            viewMode === 'structure'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
          ]"
        >
          {{ __('Structure', 'flexify-dashboard') }}
        </button>
        <button
          @click="viewMode = 'data'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            viewMode === 'data'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
          ]"
        >
          {{ __('Data', 'flexify-dashboard') }}
        </button>
      </div>
    </div>

    <!-- Structure View -->
    <div v-if="viewMode === 'structure'" class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
        ></div>
      </div>

      <div v-else-if="tableStructure">
        <!-- Columns -->
        <div class="mb-8">
          <h3
            class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400"
          >
            {{ __('Columns', 'flexify-dashboard') }}
          </h3>
          <div
            class="border border-zinc-200/40 dark:border-zinc-700/30 rounded-xl overflow-hidden"
          >
            <table class="w-full">
              <thead class="bg-zinc-50 dark:bg-zinc-900/50">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Name', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Type', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Null', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Key', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Default', 'flexify-dashboard') }}
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-zinc-200/40 dark:divide-zinc-700/30"
              >
                <tr
                  v-for="column in tableStructure.columns"
                  :key="column.Field"
                  class="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <td
                    class="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {{ column.Field }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {{ formatColumnType(column.Type) }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {{
                      column.Null === 'YES'
                        ? __('Yes', 'flexify-dashboard')
                        : __('No', 'flexify-dashboard')
                    }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <span
                      v-if="column.Key"
                      class="px-2 py-1 text-xs rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      {{ column.Key }}
                    </span>
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {{ column.Default || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Indexes -->
        <div v-if="tableStructure.indexes && tableStructure.indexes.length > 0">
          <h3
            class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400"
          >
            {{ __('Indexes', 'flexify-dashboard') }}
          </h3>
          <div
            class="border border-zinc-200/40 dark:border-zinc-700/30 rounded-xl overflow-hidden"
          >
            <table class="w-full">
              <thead class="bg-zinc-50 dark:bg-zinc-900/50">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Name', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Column', 'flexify-dashboard') }}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase"
                  >
                    {{ __('Type', 'flexify-dashboard') }}
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-zinc-200/40 dark:divide-zinc-700/30"
              >
                <tr
                  v-for="index in tableStructure.indexes"
                  :key="`${index.Key_name}-${index.Column_name}`"
                  class="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <td
                    class="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {{ index.Key_name }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {{ index.Column_name }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {{ index.Index_type }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Data View -->
    <div v-else class="flex flex-col flex-1 overflow-hidden">
      <!-- Search Bar -->
      <div
        class="px-6 py-4 border-b border-zinc-200/40 dark:border-zinc-700/30"
      >
        <div class="relative max-w-md">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search table data...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Data Table -->
      <div class="flex-1 overflow-auto">
        <div v-if="loading" class="p-6 space-y-4">
          <div
            v-for="i in 10"
            :key="i"
            class="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          ></div>
        </div>

        <div v-else-if="tableData.length === 0" class="p-6 text-center">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('No data found', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0">
              <tr>
                <th
                  v-for="column in Object.keys(tableData[0] || {})"
                  :key="column"
                  @click="handleSort(column)"
                  class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    {{ column }}
                    <AppIcon
                      v-if="sortBy === column"
                      :icon="
                        sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward'
                      "
                      class="text-xs"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200/40 dark:divide-zinc-700/30">
              <tr
                v-for="(row, index) in tableData"
                :key="index"
                class="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
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

      <!-- Pagination -->
      <div
        v-if="pagination.total_pages > 1"
        class="flex items-center justify-between px-6 py-4 border-t border-zinc-200/40 dark:border-zinc-700/30"
      >
        <div class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Showing', 'flexify-dashboard') }}
          {{ (pagination.page - 1) * pagination.per_page + 1 }} -
          {{
            Math.min(pagination.page * pagination.per_page, pagination.total)
          }}
          {{ __('of', 'flexify-dashboard') }} {{ pagination.total.toLocaleString() }}
        </div>
        <div class="flex items-center gap-2">
          <AppButton
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            type="transparent"
            class="text-sm"
          >
            <AppIcon icon="chevron_left" />
          </AppButton>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">
            {{ __('Page', 'flexify-dashboard') }} {{ pagination.page }} /
            {{ pagination.total_pages }}
          </span>
          <AppButton
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.total_pages"
            type="transparent"
            class="text-sm"
          >
            <AppIcon icon="chevron_right" />
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Password Verification Modal -->
    <Modal ref="passwordModal">
      <div class="flex flex-col w-[400px] p-8 gap-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {{ __('Verify Password', 'flexify-dashboard') }}
          </h2>
          <AppButton type="transparent" @click="passwordModal?.close()">
            <AppIcon icon="close" />
          </AppButton>
        </div>

        <div class="text-zinc-500 dark:text-zinc-400">
          <p class="mb-4">
            {{
              __(
                'To delete this table, please enter your password to confirm.',
                'flexify-dashboard'
              )
            }}
          </p>
          <div class="space-y-2">
            <label
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {{ __('Password', 'flexify-dashboard') }}
            </label>
            <!-- Hidden dummy fields to trick browser autofill -->
            <input
              type="text"
              name="username"
              autocomplete="username"
              style="
                position: absolute;
                opacity: 0;
                pointer-events: none;
                height: 0;
                width: 0;
              "
              tabindex="-1"
            />
            <input
              type="password"
              name="password"
              autocomplete="new-password"
              style="
                position: absolute;
                opacity: 0;
                pointer-events: none;
                height: 0;
                width: 0;
              "
              tabindex="-1"
            />
            <input
              v-model="password"
              type="password"
              name="verify-password"
              :disabled="verifyingPassword"
              @keydown.enter="verifyPassword"
              @focus="handlePasswordFocus"
              autocomplete="new-password"
              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
              :placeholder="__('Enter your password', 'flexify-dashboard')"
              autofocus
            />
          </div>
        </div>

        <div class="flex flex-row gap-3 items-center place-content-end">
          <AppButton
            @click="passwordModal?.close()"
            type="default"
            :disabled="verifyingPassword"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            @click="verifyPassword"
            type="primary"
            :disabled="!password.trim() || verifyingPassword"
          >
            <AppIcon icon="check" class="text-base mr-2" />
            {{
              verifyingPassword
                ? __('Verifying...', 'flexify-dashboard')
                : __('Verify', 'flexify-dashboard')
            }}
          </AppButton>
        </div>
      </div>
    </Modal>

    <!-- Confirm Delete Component -->
    <Confirm ref="confirmDelete" />
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
</style>
