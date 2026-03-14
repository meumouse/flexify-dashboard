<script setup>
import { ref, computed, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import Select from '@/components/utility/select/index.vue';
import { parseCSV } from '@/assets/js/functions/parseCSV.js';
import { notify } from '@/assets/js/functions/notify.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  availableRoles: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'imported']);

// Refs
const fileInput = ref(null);
const selectedFile = ref(null);
const csvData = ref(null);
const csvHeaders = ref([]);
const csvRows = ref([]);
const fieldMapping = ref({});
const isProcessing = ref(false);
const isImporting = ref(false);
const importProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
});
const importErrors = ref([]);
const importSuccess = ref(0);
const defaultPassword = ref('');
const sendNotification = ref(false);
const skipFirstRow = ref(true);

// Available WordPress user fields
const userFields = [
  { value: 'username', label: __('Username', 'flexify-dashboard'), required: true },
  { value: 'email', label: __('Email', 'flexify-dashboard'), required: true },
  { value: 'password', label: __('Password', 'flexify-dashboard'), required: false },
  { value: 'name', label: __('Display Name', 'flexify-dashboard'), required: false },
  { value: 'first_name', label: __('First Name', 'flexify-dashboard'), required: false },
  { value: 'last_name', label: __('Last Name', 'flexify-dashboard'), required: false },
  { value: 'url', label: __('Website', 'flexify-dashboard'), required: false },
  { value: 'description', label: __('Biographical Info', 'flexify-dashboard'), required: false },
  { value: 'roles', label: __('Roles', 'flexify-dashboard'), required: false },
  { value: 'meta', label: __('Custom Meta Fields', 'flexify-dashboard'), required: false },
];

/**
 * Handle file selection
 */
const handleFileSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Check file type
  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
    notify({
      title: __('Invalid file type', 'flexify-dashboard'),
      message: __('Please select a CSV or Excel file', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  selectedFile.value = file;
  
  try {
    // Read file content
    const content = await file.text();
    
    // Parse CSV
    const parsed = parseCSV(content, {
      delimiter: ',',
      hasHeaders: true,
    });
    
    csvHeaders.value = parsed.headers;
    csvRows.value = parsed.rows;
    
    // Auto-map fields based on header names
    autoMapFields();
    
    notify({
      title: __('File loaded', 'flexify-dashboard'),
      message: __('%d rows found', 'flexify-dashboard').replace('%d', csvRows.value.length),
      type: 'success',
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    notify({
      title: __('Error parsing file', 'flexify-dashboard'),
      message: error.message,
      type: 'error',
    });
  }
};

/**
 * Auto-map CSV headers to user fields
 */
const autoMapFields = () => {
  const mapping = {};
  
  csvHeaders.value.forEach((header) => {
    const headerLower = header.toLowerCase().trim();
    
    // Try to match common variations
    for (const field of userFields) {
      const fieldLabelLower = field.label.toLowerCase();
      const fieldValueLower = field.value.toLowerCase();
      
      if (
        headerLower === fieldValueLower ||
        headerLower === fieldLabelLower ||
        headerLower.includes(fieldValueLower) ||
        headerLower.includes(fieldLabelLower)
      ) {
        mapping[header] = field.value;
        break;
      }
    }
  });
  
  fieldMapping.value = mapping;
};

/**
 * Check if mapping is valid
 */
const isMappingValid = computed(() => {
  // Check required fields are mapped
  const requiredFields = userFields.filter(f => f.required);
  const mappedFields = Object.values(fieldMapping.value);
  
  return requiredFields.every(field => mappedFields.includes(field.value));
});

/**
 * Preview mapped data
 */
const previewData = computed(() => {
  if (!csvRows.value.length) return [];
  
  return csvRows.value.slice(0, 5).map((row, index) => {
    const mapped = {};
    Object.entries(fieldMapping.value).forEach(([csvHeader, userField]) => {
      mapped[userField] = row[csvHeader] || '';
    });
    return { ...mapped, _rowIndex: index + (skipFirstRow.value ? 2 : 1) };
  });
});

/**
 * Start import process
 */
const startImport = async () => {
  if (!isMappingValid.value) {
    notify({
      title: __('Invalid mapping', 'flexify-dashboard'),
      message: __('Please map all required fields', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  if (csvRows.value.length === 0) {
    notify({
      title: __('No data to import', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  isImporting.value = true;
  importProgress.value = {
    current: 0,
    total: csvRows.value.length,
    percentage: 0,
  };
  importErrors.value = [];
  importSuccess.value = 0;

  const startIndex = skipFirstRow.value ? 1 : 0;
  const rowsToImport = csvRows.value.slice(startIndex);

  try {
    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      
      // Map CSV row to user data
      const userData = {};
      Object.entries(fieldMapping.value).forEach(([csvHeader, userField]) => {
        const value = row[csvHeader]?.trim() || '';
        
        if (value) {
          if (userField === 'roles') {
            // Handle roles - split by comma or semicolon
            userData.roles = value.split(/[,;]/).map(r => r.trim()).filter(r => r);
          } else if (userField === 'meta') {
            // Handle custom meta fields (format: meta_key:value or JSON)
            if (!userData.meta) userData.meta = {};
            try {
              const metaObj = JSON.parse(value);
              Object.assign(userData.meta, metaObj);
            } catch {
              // Not JSON, try key:value format
              const parts = value.split(':');
              if (parts.length >= 2) {
                userData.meta[parts[0].trim()] = parts.slice(1).join(':').trim();
              }
            }
          } else {
            userData[userField] = value;
          }
        }
      });

      // Set default password if not provided
      if (!userData.password) {
        if (defaultPassword.value) {
          userData.password = defaultPassword.value;
        } else {
          // Generate random password if none provided
          userData.password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        }
      }

      // Validate required fields
      if (!userData.username || !userData.email) {
        importErrors.value.push({
          row: i + startIndex + 1,
          error: __('Missing required fields (username or email)', 'flexify-dashboard'),
        });
        continue;
      }

      // Extract meta fields and first_name/last_name if present
      const metaFields = userData.meta || {};
      delete userData.meta;

      // Extract first_name and last_name if present
      if (userData.first_name) {
        metaFields.first_name = userData.first_name;
        delete userData.first_name;
      }
      if (userData.last_name) {
        metaFields.last_name = userData.last_name;
        delete userData.last_name;
      }

      try {
        // Create user
        const createData = {
          username: userData.username,
          email: userData.email,
          password: userData.password,
          name: userData.name || userData.username,
          url: userData.url || '',
          description: userData.description || '',
          roles: userData.roles || [],
          send_user_notification: sendNotification.value,
        };

        const response = await lmnFetch({
          endpoint: 'wp/v2/users',
          type: 'POST',
          params: { context: 'edit' },
          data: createData,
        });

        // If user was created and we have meta fields, update them
        if (response?.data?.id && Object.keys(metaFields).length > 0) {
          // Update user meta fields in a single request
          try {
            await lmnFetch({
              endpoint: `wp/v2/users/${response.data.id}`,
              type: 'POST',
              data: {
                meta: metaFields,
              },
            });
          } catch (metaError) {
            console.error('Failed to set meta fields:', metaError);
            // Try setting them individually as fallback
            for (const [metaKey, metaValue] of Object.entries(metaFields)) {
              try {
                await lmnFetch({
                  endpoint: `wp/v2/users/${response.data.id}`,
                  type: 'POST',
                  data: {
                    meta: {
                      [metaKey]: metaValue,
                    },
                  },
                });
              } catch (individualError) {
                console.error(`Failed to set meta field ${metaKey}:`, individualError);
              }
            }
          }
        }

        importSuccess.value++;
      } catch (error) {
        importErrors.value.push({
          row: i + startIndex + 1,
          error: error?.message || __('Failed to create user', 'flexify-dashboard'),
          data: userData,
        });
      }

      // Update progress
      importProgress.value.current = i + 1;
      importProgress.value.percentage = Math.round(
        ((i + 1) / rowsToImport.length) * 100
      );
    }

    // Show results
    const message = __('%d users imported successfully, %d errors', 'flexify-dashboard')
      .replace(/%d/, importSuccess.value)
      .replace(/%d/, importErrors.value.length);
    
    notify({
      title: __('Import completed', 'flexify-dashboard'),
      message: message,
      type: importErrors.value.length === 0 ? 'success' : 'warning',
    });

    // Emit imported event
    emit('imported', {
      success: importSuccess.value,
      errors: importErrors.value.length,
    });

    // Close drawer if successful
    if (importErrors.value.length === 0) {
      closeDrawer();
    }
  } catch (error) {
    notify({
      title: __('Import failed', 'flexify-dashboard'),
      message: error.message,
      type: 'error',
    });
  } finally {
    isImporting.value = false;
  }
};

/**
 * Close drawer and reset
 */
const closeDrawer = () => {
  emit('update:modelValue', false);
  resetForm();
};

/**
 * Reset form
 */
const resetForm = () => {
  selectedFile.value = null;
  csvData.value = null;
  csvHeaders.value = [];
  csvRows.value = [];
  fieldMapping.value = {};
  importErrors.value = [];
  importSuccess.value = 0;
  defaultPassword.value = '';
  sendNotification.value = false;
  skipFirstRow.value = true;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

/**
 * Trigger file input
 */
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// Watch for drawer close
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="closeDrawer"
  >
    <div
      class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AppIcon icon="upload_file" class="text-lg" />
          <h2 class="text-lg font-semibold">
            {{ __('Import Users from CSV', 'flexify-dashboard') }}
          </h2>
        </div>
        <button
          @click="closeDrawer"
          class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <AppIcon icon="close" class="text-lg" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6 space-y-6">
        <!-- File Selection -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Select CSV File', 'flexify-dashboard') }}
          </label>
          <div
            @click="triggerFileInput"
            class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <AppIcon icon="cloud_upload" class="text-4xl text-zinc-400 mb-2 mx-auto" />
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              {{ __('Click to select file or drag and drop', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-500">
              CSV, XLSX ({{ __('max 10MB', 'flexify-dashboard') }})
            </p>
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.xlsx,.xls"
              @change="handleFileSelect"
              class="hidden"
            />
          </div>
          <p v-if="selectedFile" class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {{ __('Selected:', 'flexify-dashboard') }} {{ selectedFile.name }}
            ({{ csvRows.length }} {{ __('rows', 'flexify-dashboard') }})
          </p>
        </div>

        <!-- Field Mapping -->
        <div v-if="csvHeaders.length > 0">
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
          >
            {{ __('Map CSV Columns to User Fields', 'flexify-dashboard') }}
          </label>
          <div class="space-y-3">
            <div
              v-for="header in csvHeaders"
              :key="header"
              class="flex items-center gap-3"
            >
              <div class="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                {{ header }}
              </div>
              <Select
                v-model="fieldMapping[header]"
                :options="[
                  { value: '', label: __('— Skip —', 'flexify-dashboard') },
                  ...userFields.map(f => ({ value: f.value, label: f.label })),
                ]"
                class="w-64"
              />
            </div>
          </div>
        </div>

        <!-- Options -->
        <div v-if="csvHeaders.length > 0" class="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <label
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              {{ __('Default Password', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="defaultPassword"
              type="password"
              :placeholder="__('Leave empty to generate random passwords', 'flexify-dashboard')"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {{ __('Used when password column is not mapped or empty', 'flexify-dashboard') }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="skipFirstRow"
              type="checkbox"
              id="skip-first-row"
              class="rounded"
            />
            <label for="skip-first-row" class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ __('Skip first data row (if it contains headers)', 'flexify-dashboard') }}
            </label>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="sendNotification"
              type="checkbox"
              id="send-notification"
              class="rounded"
            />
            <label for="send-notification" class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ __('Send welcome email to new users', 'flexify-dashboard') }}
            </label>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="previewData.length > 0" class="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
          >
            {{ __('Preview (first 5 rows)', 'flexify-dashboard') }}
          </label>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-200 dark:border-zinc-800">
                  <th
                    v-for="field in Object.keys(previewData[0] || {})"
                    :key="field"
                    class="text-left py-2 px-3 text-zinc-600 dark:text-zinc-400"
                  >
                    {{ field }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in previewData"
                  :key="index"
                  class="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <td
                    v-for="(value, field) in row"
                    :key="field"
                    class="py-2 px-3 text-zinc-700 dark:text-zinc-300"
                  >
                    {{ value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Import Progress -->
        <div v-if="isImporting" class="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Importing...', 'flexify-dashboard') }}
            </span>
            <span class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ importProgress.current }} / {{ importProgress.total }}
            </span>
          </div>
          <div class="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
            <div
              class="bg-zinc-900 dark:bg-zinc-100 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${importProgress.percentage}%` }"
            ></div>
          </div>
        </div>

        <!-- Import Errors -->
        <div v-if="importErrors.length > 0" class="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <label
            class="block text-sm font-medium text-red-600 dark:text-red-400 mb-2"
          >
            {{ __('Import Errors', 'flexify-dashboard') }} ({{ importErrors.length }})
          </label>
          <div class="max-h-48 overflow-auto space-y-1">
            <div
              v-for="(error, index) in importErrors"
              :key="index"
              class="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded"
            >
              {{ __('Row', 'flexify-dashboard') }} {{ error.row }}: {{ error.error }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3"
      >
        <AppButton type="default" @click="closeDrawer" :disabled="isImporting">
          {{ __('Cancel', 'flexify-dashboard') }}
        </AppButton>
        <AppButton
          type="primary"
          @click="startImport"
          :disabled="!isMappingValid || csvRows.length === 0 || isImporting"
          :loading="isImporting"
        >
          {{ __('Start Import', 'flexify-dashboard') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

