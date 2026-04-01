<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppInput from '@/components/utility/text-input/index.vue';
import AppSelect from '@/components/utility/select/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import RichTextEditor from '@/components/utility/rich-text/index.vue';
import Multiselect from '@/components/utility/multiselect-roles-and-users/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useAppStore } from '@/store/app/app.js';
import { notify } from '@/assets/js/functions/notify.js';
import { formatDateString } from '@/assets/js/functions/formatDateString.js';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const isEdit = computed(() => !!route.params.noticeid);
const loading = ref(false);
const saving = ref(false);
const notice = ref({
  id: null,
  title: '',
  content: '',
  status: 'draft',
  created: null,
  modified: null,
  meta: {
    notice_type: 'info',
    roles: [],
    dismissible: true,
    active: true,
    seen_by: [],
  },
});

const noticeTypes = [
  { value: 'info', label: __('Info', 'flexify-dashboard'), icon: 'info', color: 'blue' },
  {
    value: 'success',
    label: __('Success', 'flexify-dashboard'),
    icon: 'check_circle',
    color: 'green',
  },
  {
    value: 'warning',
    label: __('Warning', 'flexify-dashboard'),
    icon: 'warning',
    color: 'orange',
  },
  {
    value: 'error',
    label: __('Error', 'flexify-dashboard'),
    icon: 'error',
    color: 'red',
  },
];

const seenUsers = ref([]);

/**
 * Get notice type configuration
 */
const getNoticeTypeConfig = computed(() => {
  return (
    noticeTypes.find((type) => type.value === notice.value.meta.notice_type) ||
    noticeTypes[0]
  );
});

/**
 * Get notice icon based on type
 */
const getNoticeIcon = computed(() => {
  return getNoticeTypeConfig.value.icon;
});

/**
 * Fetch user info for all users in seen_by
 */
const fetchSeenUsers = async (userIds) => {
  if (!userIds || !userIds.length) {
    seenUsers.value = [];
    return;
  }

  const args = {
    endpoint: `wp/v2/users`,
    params: { include: userIds.join(',') },
  };

  const res = await lmnFetch(args);
  if (res && Array.isArray(res.data)) {
    seenUsers.value = res.data.map((user) => ({
      id: user.id,
      name: user.name || user.username || user.slug,
      email: user.email,
      avatar:
        user.avatar_urls?.['24'] ||
        user.avatar_urls?.['48'] ||
        user.avatar_urls?.['96'] ||
        '',
    }));
  } else {
    seenUsers.value = [];
  }
};

const fetchNotice = async () => {
  if (!isEdit.value) return;

  loading.value = true;
  appStore.updateState('loading', true);

  const args = { endpoint: `wp/v2/flexify-dashboard-notices/${route.params.noticeid}` };
  const data = await lmnFetch(args);

  if (data?.data) {
    notice.value = {
      id: data.data.id,
      title: data.data.title?.rendered || '',
      content: data.data.content?.rendered || '',
      status: data.data.status,
      created: data.data.date,
      modified: data.data.modified,
      meta: {
        notice_type: data.data.meta?.notice_type || 'info',
        roles: data.data.meta?.roles || [],
        dismissible: data.data.meta?.dismissible !== false,
        active: data.data.status === 'publish',
        seen_by: data.data.meta?.seen_by || [],
      },
    };

    fetchSeenUsers(data.data.meta?.seen_by || []);
  }

  loading.value = false;
  appStore.updateState('loading', false);
};

const saveNotice = async () => {
  saving.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: isEdit.value
      ? `wp/v2/flexify-dashboard-notices/${route.params.noticeid}`
      : 'wp/v2/flexify-dashboard-notices',
    type: 'POST',
    data: {
      title: notice.value.title,
      content: notice.value.content,
      status: notice.value.meta.active ? 'publish' : 'draft',
      meta: {
        notice_type: notice.value.meta.notice_type,
        roles: notice.value.meta.roles,
        dismissible: notice.value.meta.dismissible,
      },
    },
  };

  const data = await lmnFetch(args);

  saving.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  // Update local notice data
  if (data.data) {
    notice.value.id = data.data.id;
    notice.value.status = data.data.status;
    notice.value.modified = data.data.modified;
  }

  notify({
    type: 'success',
    title: isEdit.value
      ? __('Notice updated', 'flexify-dashboard')
      : __('Notice created', 'flexify-dashboard'),
  });

  // If creating new notice, redirect to edit mode
  if (!isEdit.value && data.data?.id) {
    router.push({ name: 'notice-editor', params: { noticeid: data.data.id } });
  }
};

const deleteNotice = async () => {
  if (!isEdit.value) return;

  const userResponse = await confirm(
    'Are you sure you want to delete this notice? This action cannot be undone.'
  );
  if (!userResponse) return;

  appStore.updateState('loading', true);

  const args = {
    endpoint: `wp/v2/flexify-dashboard-notices/${route.params.noticeid}`,
    type: 'DELETE',
  };

  const data = await lmnFetch(args);
  appStore.updateState('loading', false);

  if (data) {
    notify({ type: 'success', title: __('Notice deleted', 'flexify-dashboard') });
    router.push({ name: 'admin-notices-table' });
  }
};

const goBack = () => {
  router.push({ name: 'admin-notices-table' });
};

watch(
  () => route.params.noticeid,
  () => {
    fetchNotice();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex-1 flex flex-col" v-if="!loading">
    <!-- Notice Header -->
    <div class="p-8 pt-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex flex-row items-center justify-between">
            <div class="flex flex-row items-center gap-2 grow">
              <h2 class="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
                {{ notice.title || __('Untitled Notice', 'flexify-dashboard') }}
              </h2>
              <div class="flex items-center gap-2">
                <div
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="
                    notice.meta.active
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  "
                >
                  {{
                    notice.meta.active
                      ? __('Active', 'flexify-dashboard')
                      : __('Draft', 'flexify-dashboard')
                  }}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-3">
              <AppButton
                type="primary"
                @click="saveNotice"
                :loading="saving"
                class="text-sm"
              >
                <AppIcon icon="save" class="text-lg mr-1" />
                {{
                  isEdit
                    ? __('Update Notice', 'flexify-dashboard')
                    : __('Create Notice', 'flexify-dashboard')
                }}
              </AppButton>

              <AppButton
                v-if="isEdit"
                type="transparent"
                @click="deleteNotice"
                class="text-sm ml-auto"
              >
                <AppIcon
                  icon="delete"
                  class="text-lg mr-1 text-red-600 dark:text-red-400"
                />
              </AppButton>
            </div>
          </div>

          <div
            class="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400 mb-4"
          >
            <span v-if="notice.created"
              >{{ __('Created', 'flexify-dashboard') }}:
              {{ formatDateString(notice.created) }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 p-8 pt-0 overflow-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Basic Information -->
          <div class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6">
            <h3
              class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4"
            >
              {{ __('Basic Information', 'flexify-dashboard') }}
            </h3>

            <div class="space-y-4">
              <div>
                <label
                  class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  {{ __('Title', 'flexify-dashboard') }}
                </label>
                <AppInput
                  v-model="notice.title"
                  type="text"
                  :placeholder="__('Enter notice title', 'flexify-dashboard')"
                  class="w-full"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  {{ __('Content', 'flexify-dashboard') }}
                </label>
                <RichTextEditor
                  v-model="notice.content"
                  :placeholder="__('Enter notice content...', 'flexify-dashboard')"
                  class="min-h-[200px]"
                />
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6">
            <h3
              class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4"
            >
              {{ __('Preview', 'flexify-dashboard') }}
            </h3>

            <div
              class="border rounded-lg p-4 bg-white dark:bg-zinc-900"
              :class="{
                'border-brand-200 bg-brand-50 dark:bg-brand-950/20 dark:border-brand-800':
                  notice.meta.notice_type === 'info',
                'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800':
                  notice.meta.notice_type === 'success',
                'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800':
                  notice.meta.notice_type === 'warning',
                'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800':
                  notice.meta.notice_type === 'error',
              }"
            >
              <div class="flex items-start gap-3">
                <AppIcon
                  :icon="getNoticeIcon"
                  class="text-lg mt-0.5 flex-shrink-0"
                  :class="{
                    'text-brand-600 dark:text-brand-400':
                      notice.meta.notice_type === 'info',
                    'text-green-600 dark:text-green-400':
                      notice.meta.notice_type === 'success',
                    'text-orange-600 dark:text-orange-400':
                      notice.meta.notice_type === 'warning',
                    'text-red-600 dark:text-red-400':
                      notice.meta.notice_type === 'error',
                  }"
                />
                <div class="flex-1">
                  <div
                    class="font-medium text-sm mb-1"
                    :class="{
                      'text-brand-800 dark:text-brand-200':
                        notice.meta.notice_type === 'info',
                      'text-green-800 dark:text-green-200':
                        notice.meta.notice_type === 'success',
                      'text-orange-800 dark:text-orange-200':
                        notice.meta.notice_type === 'warning',
                      'text-red-800 dark:text-red-200':
                        notice.meta.notice_type === 'error',
                    }"
                  >
                    {{ notice.title || __('Notice Title', 'flexify-dashboard') }}
                  </div>
                  <div
                    class="text-sm"
                    :class="{
                      'text-brand-700 dark:text-brand-300':
                        notice.meta.notice_type === 'info',
                      'text-green-700 dark:text-green-300':
                        notice.meta.notice_type === 'success',
                      'text-orange-700 dark:text-orange-300':
                        notice.meta.notice_type === 'warning',
                      'text-red-700 dark:text-red-300':
                        notice.meta.notice_type === 'error',
                    }"
                    v-html="
                      notice.content ||
                      __('Notice content will appear here...', 'flexify-dashboard')
                    "
                  />
                </div>
                <button
                  v-if="notice.meta.dismissible"
                  class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
                >
                  <AppIcon icon="close" class="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Column -->
        <div class="space-y-6">
          <!-- Display Settings -->
          <div class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6">
            <h3
              class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4"
            >
              {{ __('Display Settings', 'flexify-dashboard') }}
            </h3>

            <div class="flex flex-col gap-6">
              <div class="grid grid-cols-3 gap-2">
                <label
                  class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  {{ __('Notice Type', 'flexify-dashboard') }}
                </label>
                <AppSelect
                  v-model="notice.meta.notice_type"
                  :options="noticeTypes"
                  class="col-span-2"
                />
              </div>

              <div class="grid grid-cols-3 gap-2">
                <label
                  class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  {{ __('Target Roles', 'flexify-dashboard') }}
                </label>
                <Multiselect v-model="notice.meta.roles" class="col-span-2" />
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <div
                    class="font-medium text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    {{ __('Dismissible', 'flexify-dashboard') }}
                  </div>
                  <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {{ __('Allow users to dismiss this notice', 'flexify-dashboard') }}
                  </div>
                </div>
                <div class="col-span-2">
                  <AppToggle
                    v-model="notice.meta.dismissible"
                    class="col-span-2"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <div
                    class="font-medium text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    {{ __('Active', 'flexify-dashboard') }}
                  </div>
                  <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {{ __('Display this notice to users', 'flexify-dashboard') }}
                  </div>
                </div>
                <div class="col-span-2">
                  <AppToggle v-model="notice.meta.active" class="col-span-2" />
                </div>
              </div>
            </div>
          </div>

          <!-- Users Who Dismissed -->
          <div
            v-if="isEdit && seenUsers.length > 0"
            class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6"
          >
            <h3
              class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4"
            >
              {{ __('Dismissed By', 'flexify-dashboard') }} ({{ seenUsers.length }})
            </h3>

            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                v-for="user in seenUsers"
                :key="user.id"
                class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <img
                  :src="user.avatar"
                  class="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-600"
                  :alt="user.name"
                />
                <div class="flex-1">
                  <div
                    class="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {{ user.name }}
                  </div>
                  <div
                    v-if="user.email"
                    class="text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    {{ user.email }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Dismissed Users -->
          <div
            v-else-if="isEdit"
            class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6"
          >
            <h3
              class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4"
            >
              {{ __('Dismissed By', 'flexify-dashboard') }}
            </h3>
            <div class="text-center py-8">
              <div
                class="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <AppIcon icon="visibility_off" class="text-zinc-400 text-xl" />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                {{ __('No users have dismissed this notice yet', 'flexify-dashboard') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <div
        class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
      >
        <AppIcon
          icon="notifications"
          class="text-2xl text-zinc-400 animate-pulse"
        />
      </div>
      <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
        {{ __('Loading Notice...', 'flexify-dashboard') }}
      </h3>
    </div>
  </div>
</template>
