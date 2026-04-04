<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppCheckbox from '@/components/utility/media-library/src/checkbox.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Props
const props = defineProps({
  activities: {
    type: Array,
    default: () => [],
  },
  selectedActivities: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['selectActivity', 'toggleSelection']);

// Local refs
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextActivityItem = ref(null);

/**
 * Handle activity item click (for details view)
 */
const handleActivityClick = (item, event) => {
  // Don't navigate if clicking on checkbox
  if (event.target.closest('.activity-checkbox')) {
    return;
  }
  emit('selectActivity', item);
};

/**
 * Handle checkbox toggle
 */
const handleCheckboxToggle = (item, event) => {
  event.stopPropagation();
  emit('toggleSelection', item, event);
};

/**
 * Check if activity item is selected
 */
const isSelected = (item) => {
  return props.selectedActivities.includes(item.id);
};

/**
 * Parse date string, handling UTC dates without timezone info
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If date string doesn't have timezone info and looks like MySQL datetime, treat as UTC
  if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    // MySQL datetime format without timezone - treat as UTC
    return new Date(dateString + 'Z');
  }
  
  // If it's already ISO 8601 with timezone indicator (Z or offset like +00:00, -05:00), use as-is
  if (dateString.includes('T') && (dateString.endsWith('Z') || dateString.match(/[+-]\d{2}:\d{2}$/))) {
    return new Date(dateString);
  }
  
  // If it's ISO 8601 format without timezone (e.g., "2024-01-01T12:00:00"), treat as UTC
  if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateString + 'Z');
  }
  
  // Try parsing as-is
  const parsed = new Date(dateString);
  
  // If invalid, try adding UTC indicator
  if (isNaN(parsed.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateString + 'Z');
  }
  
  return parsed;
};

/**
 * Format date to relative time
 */
const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '—';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return __('Just now', 'flexify-dashboard');
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? __('1 minute ago', 'flexify-dashboard')
      : __('%d minutes ago', 'flexify-dashboard').replace('%d', diffInMinutes);
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1
      ? __('1 hour ago', 'flexify-dashboard')
      : __('%d hours ago', 'flexify-dashboard').replace('%d', diffInHours);
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1
      ? __('1 day ago', 'flexify-dashboard')
      : __('%d days ago', 'flexify-dashboard').replace('%d', diffInDays);
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Get action icon
 */
const getActionIcon = (action) => {
  const icons = {
    created: 'add',
    updated: 'edit',
    deleted: 'delete',
    trashed: 'delete',
    restored: 'restore',
    activated: 'check_circle',
    deactivated: 'cancel',
    installed: 'download',
    login: 'login',
    logout: 'logout',
    role_changed: 'admin_users',
    status_changed: 'flag',
    uploaded: 'upload',
  };
  return icons[action] || 'info';
};

/**
 * Get action color
 */
const getActionColor = (action) => {
  const colors = {
    created: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    updated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    trashed: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    restored: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    activated: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    deactivated: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    installed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    login: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    logout: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
    role_changed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    status_changed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    uploaded: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };
  return colors[action] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';
};

/**
 * Get object title
 */
const getObjectTitle = (activity) => {
  if (activity.metadata?.title) {
    return activity.metadata.title;
  }
  if (activity.new_value?.title) {
    return activity.new_value.title;
  }
  if (activity.old_value?.title) {
    return activity.old_value.title;
  }
  if (activity.object_id) {
    return `${activity.object_type} #${activity.object_id}`;
  }
  return activity.object_type;
};

// Close context menu when clicking outside
document.addEventListener('click', () => {
  showContextMenu.value = false;
  contextActivityItem.value = null;
});
</script>

<template>
  <div class="relative">
    <!-- Activity List -->
    <div class="py-2 flex flex-col gap-1">
      <div
        v-for="item in activities"
        :key="item.id"
        @click="handleActivityClick(item, $event)"
        class="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3 relative"
        :class="
          route.params.logId == item.id
            ? 'bg-zinc-100 dark:bg-zinc-800/60'
            : ''
        "
      >
        <!-- Activity Avatar -->
        <div class="flex-shrink-0 relative">
          <!-- Checkbox - shows on hover, positioned centered over avatar -->
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 activity-checkbox cursor-pointer"
            :class="
              isSelected(item)
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            "
            @click.stop="handleCheckboxToggle(item, $event)"
          >
            <AppCheckbox :isactive="isSelected(item)" />
          </div>

          <div
            class="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"
          >
            <img
              v-if="item.user?.avatar"
              :src="item.user.avatar"
              :alt="item.user.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <AppIcon icon="person" class="text-zinc-500 dark:text-zinc-400 text-sm" />
            </div>
          </div>
        </div>

        <!-- Activity Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
              :title="item.user?.name"
              :class="
                route.params.logId == item.id
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              "
            >
              {{ item.user?.name || __('Unknown', 'flexify-dashboard') }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 text-[10px] font-medium rounded uppercase flex items-center gap-1',
                getActionColor(item.action),
              ]"
            >
              <AppIcon :icon="getActionIcon(item.action)" class="text-[10px]" />
              {{ item.action }}
            </span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ item.object_type }}
              <span v-if="item.object_id"> #{{ item.object_id }}</span>
              <span v-if="getObjectTitle(item) && getObjectTitle(item) !== item.object_type">
                : {{ getObjectTitle(item) }}
              </span>
            </span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ formatRelativeTime(item.created_at) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="activities.length === 0"
        class="flex flex-col items-center justify-center py-12 px-4 text-center"
      >
        <AppIcon
          icon="history"
          class="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4"
        />
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          {{ __('No activities found', 'flexify-dashboard') }}
        </p>
      </div>
    </div>
  </div>
</template>

