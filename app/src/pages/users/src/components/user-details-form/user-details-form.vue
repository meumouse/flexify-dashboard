<script setup>
import { ref, computed, watch } from 'vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppTextArea from '@/components/utility/text-area/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import TagInput from '@/components/utility/tag-input/index.vue';

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  userData: {
    type: Object,
    default: null,
  },
  updateUser: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['user-updated']);

// Refs
const isSaving = ref(false);
const allRoles = ref([]);

// Form fields
const name = ref('');
const email = ref('');
const username = ref('');
const website = ref('');
const description = ref('');
const password = ref('');
const selectedRoles = ref([]);
const sendUserNotification = ref(false);

/**
 * Computed property to transform allRoles to TagInput format
 */
const availableRolesForTagInput = computed(() => {
  return allRoles.value.map((role) => ({
    id: role.slug,
    name: role.name,
    slug: role.slug,
  }));
});

/**
 * Computed property to get role slugs array for API
 */
const rolesForAPI = computed(() => {
  return selectedRoles.value.map((role) => role.slug);
});

/**
 * Fetch all available roles
 */
const fetchAllRoles = async () => {
  try {
    const data = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/user-roles',
    });

    if (data?.data) {
      allRoles.value = data.data.map((role) => ({
        slug: role.value,
        name: role.label,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error);
  }
};

/**
 * Populate form fields from user data
 */
const populateForm = () => {
  if (!props.userData) return;

  name.value = props.userData.name || '';
  email.value = props.userData.email || '';
  username.value = props.userData.slug || '';
  website.value = props.userData.url || '';
  description.value = props.userData.description || '';

  // Transform roles from slugs array to TagInput format
  const userRoleSlugs = props.userData.roles || [];
  selectedRoles.value = allRoles.value
    .filter((role) => userRoleSlugs.includes(role.slug))
    .map((role) => ({
      id: role.slug,
      name: role.name,
      slug: role.slug,
    }));
};

/**
 * Handle form save
 */
const handleSave = async () => {
  if (!props.userData) return;

  isSaving.value = true;
  appStore.updateState('loading', true);

  const updateData = {
    name: name.value,
    email: email.value,
    url: website.value,
    description: description.value,
    roles: rolesForAPI.value,
  };

  // Only include password if it's been set
  if (password.value) {
    updateData.password = password.value;
  }

  try {
    const args = {
      endpoint: `wp/v2/users/${props.userId}`,
      type: 'POST',
      params: { context: 'edit' },
      data: updateData,
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('User updated successfully', 'flexify-dashboard'),
        type: 'success',
      });

      // Call updateUser function to refresh user data
      props.updateUser();
      password.value = ''; // Clear password field after save
    }
  } catch (error) {
    notify({
      title: __('Failed to update user', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
    appStore.updateState('loading', false);
  }
};

// Watch for userData changes
watch(
  () => props.userData,
  () => {
    populateForm();
  },
  { immediate: true, deep: true }
);

// Watch for roles to be loaded before populating form
watch(
  () => allRoles.value.length,
  () => {
    if (allRoles.value.length > 0 && props.userData) {
      populateForm();
    }
  }
);

// Lifecycle
import { onMounted } from 'vue';
onMounted(async () => {
  await fetchAllRoles();
  if (props.userData) {
    populateForm();
  }
});
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Editable Fields -->
    <div>
      <!-- Save Button -->
      <div class="pt-4 dark:border-zinc-800 mb-6">
        <AppButton type="primary" @click="handleSave" :loading="isSaving">
          {{ __('Update User', 'flexify-dashboard') }}
        </AppButton>
      </div>

      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Name', 'flexify-dashboard') }}
      </label>

      <AppInput
        v-model="name"
        :placeholder="__('User name', 'flexify-dashboard')"
        autocomplete="off"
      />
    </div>

    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Email', 'flexify-dashboard') }}
      </label>
      <AppInput
        v-model="email"
        type="email"
        :placeholder="__('user@example.com', 'flexify-dashboard')"
        autocomplete="off"
      />
    </div>

    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Username', 'flexify-dashboard') }}
      </label>
      <AppInput
        v-model="username"
        :disabled="true"
        :placeholder="__('Username', 'flexify-dashboard')"
        autocomplete="off"
      />
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        {{ __('Username cannot be changed', 'flexify-dashboard') }}
      </p>
    </div>

    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Website', 'flexify-dashboard') }}
      </label>
      <AppInput
        v-model="website"
        type="url"
        :placeholder="__('https://example.com', 'flexify-dashboard')"
        autocomplete="off"
      />
    </div>

    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Biographical Info', 'flexify-dashboard') }}
      </label>
      <AppTextArea
        v-model="description"
        :placeholder="__('About the user', 'flexify-dashboard')"
        :rows="4"
        autocomplete="off"
      />
    </div>

    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('New Password', 'flexify-dashboard') }}
      </label>
      <AppInput
        v-model="password"
        type="password"
        :placeholder="__('Leave blank to keep current password', 'flexify-dashboard')"
        autocomplete="new-password"
      />
    </div>

    <!-- Roles Section -->
    <div>
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
      >
        {{ __('Roles', 'flexify-dashboard') }}
      </label>
      <TagInput
        v-model="selectedRoles"
        :available-tags="availableRolesForTagInput"
        :disabled="isSaving"
        :placeholder="__('Add roles...', 'flexify-dashboard')"
        :allow-create="false"
      />
    </div>

    <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <div class="flex flex-col gap-3">
        <div class="flex-1">
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            for="send-notification"
          >
            {{ __('Send user notification', 'flexify-dashboard') }}
          </label>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'Send an email notification to the user about the changes.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>
        <AppToggle
          v-model="sendUserNotification"
          id="send-notification"
          class="w-auto"
        />
      </div>
    </div>
  </div>
</template>
