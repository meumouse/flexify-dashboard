<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import { useAppStore } from '@/store/app/app.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'local',
  },
});

const emit = defineEmits(['update:modelValue']);

const appStore = useAppStore();
const isOpen = ref(false);
const searchQuery = ref('');
const dropdownRef = ref(null);
const confirm = ref(null);

// Load selected site from localStorage on mount and sync with parent
const loadSelectedSite = () => {
  const saved = localStorage.getItem('flexify_dashboard_selected_site');
  if (saved && saved !== props.modelValue) {
    emit('update:modelValue', saved);
  } else if (!saved && props.modelValue !== 'local') {
    // If no saved value but prop is not local, sync localStorage
    localStorage.setItem('flexify_dashboard_selected_site', props.modelValue);
  }
};

// Save selected site to localStorage
const saveSelectedSite = (siteId) => {
  localStorage.setItem('flexify_dashboard_selected_site', siteId);
};

onMounted(() => {
  loadSelectedSite();
});

/**
 * Gets favicon URL using Google's favicon service
 *
 * @param {string} url - The site URL
 * @returns {string} Favicon URL
 */
const getFaviconUrl = (url) => {
  if (!url || url === 'local') return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
};

/**
 * Gets the display name for a site
 *
 * @param {Object|string} site - The site object or "local"
 * @returns {string} Display name
 */
const getSiteName = (site) => {
  if (site === 'local') {
    return __('Local', 'flexify-dashboard');
  }
  try {
    const urlObj = new URL(
      site.url.startsWith('http') ? site.url : `https://${site.url}`
    );
    return urlObj.hostname.replace('www.', '');
  } catch {
    return site.url;
  }
};

/**
 * Gets the current site object
 *
 * @computed
 * @returns {Object|null} Current site object or null for local
 */
const currentSite = computed(() => {
  if (props.modelValue === 'local') {
    return { id: 'local', url: 'local', name: __('Local', 'flexify-dashboard') };
  }
  const settings = appStore.state?.flexify_dashboard_settings;
  const sites =
    settings && Array.isArray(settings.remote_sites)
      ? settings.remote_sites
      : [];
  const foundSite = sites.find(
    (site) => site && site.url === props.modelValue
  );
  if (foundSite) {
    return {
      id: foundSite.url,
      url: foundSite.url,
      name: getSiteName(foundSite),
    };
  }
  return null;
});

/**
 * Gets all available sites (local + remote)
 *
 * @computed
 * @returns {Array<Object>} Array of site objects
 */
const availableSites = computed(() => {
  const sites = [
    {
      id: 'local',
      url: 'local',
      name: __('Local', 'flexify-dashboard'),
      username: null,
      app_password: null,
    },
  ];

  // Safely access remote sites from settings
  const settings = appStore.state?.flexify_dashboard_settings;
  if (settings && Array.isArray(settings.remote_sites)) {
    settings.remote_sites.forEach((site) => {
      if (site && site.url) {
        sites.push({
          id: site.url,
          url: site.url,
          name: getSiteName(site),
          username: site.username || null,
          app_password: site.app_password || null,
        });
      }
    });
  }

  return sites;
});

/**
 * Filters sites based on search query
 *
 * @computed
 * @returns {Array<Object>} Filtered sites
 */
const filteredSites = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableSites.value;
  }

  const query = searchQuery.value.toLowerCase();
  return availableSites.value.filter((site) => {
    return (
      site.name.toLowerCase().includes(query) ||
      site.url.toLowerCase().includes(query)
    );
  });
});

/**
 * Checks if user has seen the remote site switcher explanation
 *
 * @returns {boolean} Whether user has seen the explanation
 */
const hasSeenExplanation = () => {
  return localStorage.getItem('flexify_dashboard_remote_site_explanation_seen') === 'true';
};

/**
 * Marks the explanation as seen
 */
const markExplanationAsSeen = () => {
  localStorage.setItem('flexify_dashboard_remote_site_explanation_seen', 'true');
};

/**
 * Shows the first-time explanation dialog
 *
 * @returns {Promise<boolean>} Whether user confirmed
 */
const showExplanationDialog = async () => {
  if (hasSeenExplanation()) {
    return true;
  }

  const message = `
    <div class="flex flex-col gap-4">
      <p class="text-zinc-700 dark:text-zinc-300">
        ${__('When you switch to a remote site, all API requests will be sent to that site instead of the local site.', 'flexify-dashboard')}
      </p>
      <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
        <p class="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-2">
          ${__('Remote site switching works on:', 'flexify-dashboard')}
        </p>
        <ul class="text-sm text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
          <li>${__('Modern Media Page', 'flexify-dashboard')}</li>
          <li>${__('Modern Plugins Page', 'flexify-dashboard')}</li>
          <li>${__('Menu Creator', 'flexify-dashboard')}</li>
          <li>${__('Modern Dashboard', 'flexify-dashboard')}</li>
          <li>${__('Activity Log', 'flexify-dashboard')}</li>
          <li>${__('Database Explorer', 'flexify-dashboard')}</li>
          <li>${__('Admin Notices', 'flexify-dashboard')}</li>
          <li>${__('Role Editor', 'flexify-dashboard')}</li>
          <li>${__('Modern Users Page', 'flexify-dashboard')}</li>
        </ul>
      </div>
      <p class="text-zinc-700 dark:text-zinc-300">
        ${__('All default WordPress pages (Posts, Pages, Comments, etc.) will continue to show local content.', 'flexify-dashboard')}
      </p>
    </div>
  `;

  const userResponse = await confirm.value.show({
    title: __('Remote Site Switching', 'flexify-dashboard'),
    message: message,
    okButton: __('I Understand', 'flexify-dashboard'),
    cancelButton: __('Cancel', 'flexify-dashboard'),
  });

  if (userResponse) {
    markExplanationAsSeen();
  }

  return userResponse;
};

/**
 * Handles site selection
 *
 * @param {Object} site - The selected site
 */
const selectSite = async (site) => {
  // If switching to local, no need for confirmation
  if (site.id === 'local') {
    emit('update:modelValue', site.id);
    saveSelectedSite(site.id);
    isOpen.value = false;
    searchQuery.value = '';
    window.location.reload();
    return;
  }

  // If switching to remote site, show explanation if first time
  const confirmed = await showExplanationDialog();
  
  if (!confirmed) {
    // User cancelled, don't switch
    return;
  }

  emit('update:modelValue', site.id);
  saveSelectedSite(site.id);
  isOpen.value = false;
  searchQuery.value = '';

  // Trigger page reload to refresh the app with new site context
  window.location.reload();
};

/**
 * Closes dropdown when clicking outside
 *
 * @param {Event} event - Click event
 */
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
    searchQuery.value = '';
  }
};

/**
 * Toggles dropdown open/closed state
 *
 * @param {Event} event - Click event
 */
const toggleDropdown = (event) => {
  event.stopPropagation();
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    searchQuery.value = '';
  }
};

watch(isOpen, async (newVal) => {
  if (newVal) {
    // Use nextTick to ensure the click event that opened the dropdown has finished propagating
    await nextTick();
    // Use setTimeout to add a small delay before attaching the listener
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
  } else {
    document.removeEventListener('click', handleClickOutside, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>

<template>
  <div class="relative w-full" ref="dropdownRef">
    <!-- Trigger Button -->
    <button
      @click.stop="toggleDropdown"
      type="button"
      class="w-full flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-900 dark:text-zinc-100">
      <!-- Favicon or Icon -->
      <div class="w-5 h-5 flex items-center justify-center shrink-0">
        <img
          v-if="currentSite && currentSite.url !== 'local' && getFaviconUrl(currentSite.url)"
          :src="getFaviconUrl(currentSite.url)"
          :alt="currentSite.name"
          class="w-5 h-5 rounded"
          @error="$event.target.style.display = 'none'" />
        <AppIcon
          v-else
          icon="computer"
          class="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
      </div>
      <!-- Site Name -->
      <span class="max-w-[120px] truncate">{{ currentSite?.name || __('Local', 'flexify-dashboard') }}</span>
      <!-- Dropdown Arrow -->
      <AppIcon
        icon="unfold"
        class="w-4 h-4 text-zinc-600 dark:text-zinc-300 transition-transform ml-auto"
        :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-[-8px]"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-[-8px]">
      <div
        v-if="isOpen"
        @click.stop
        class="absolute top-full left-0 mt-2 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 overflow-hidden">
        <!-- Search Input -->
        <div class="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <AppInput
            v-model="searchQuery"
            :placeholder="__('Search sites...', 'flexify-dashboard')"
            icon="search"
            class="w-full"
            autocomplete="off"
            data-form-type="other"
            @click.stop />
        </div>

        <!-- Sites List -->
        <div class="max-h-64 overflow-y-auto">
          <button
            v-for="site in filteredSites"
            :key="site.id"
            @click="selectSite(site)"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            :class="{
              'bg-zinc-100 dark:bg-zinc-900': modelValue === site.id,
            }">
            <!-- Favicon or Icon -->
            <div class="w-5 h-5 flex items-center justify-center shrink-0">
              <img
                v-if="site.url !== 'local' && getFaviconUrl(site.url)"
                :src="getFaviconUrl(site.url)"
                :alt="site.name"
                class="w-5 h-5 rounded"
                @error="$event.target.style.display = 'none'" />
              <AppIcon
                v-else
                icon="computer"
                class="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            </div>
            <!-- Site Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {{ site.name }}
              </div>
              <div
                v-if="site.url !== 'local'"
                class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {{ site.url }}
              </div>
            </div>
            <!-- Selected Indicator -->
            <AppIcon
              v-if="modelValue === site.id"
              icon="check"
              class="w-4 h-4 text-brand-500 shrink-0" />
          </button>

          <!-- Empty State -->
          <div
            v-if="filteredSites.length === 0"
            class="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
            {{ __('No sites found', 'flexify-dashboard') }}
          </div>
        </div>
      </div>
    </Transition>

    <Confirm ref="confirm" />
  </div>
</template>

