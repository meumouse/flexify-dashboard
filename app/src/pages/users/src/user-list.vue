<script setup>
import { ref } from 'vue';
import md5 from 'md5';
import AppIcon from '@/components/utility/icons/index.vue';
import AppCheckbox from '@/components/utility/media-library/src/checkbox.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Props
const props = defineProps({
  users: {
    type: Array,
    default: () => [],
  },
  selectedUsers: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['selectUser', 'delete', 'toggleSelection']);

// Local refs
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextUserItem = ref(null);

/**
 * Handle user item click (for details view)
 */
const handleUserClick = (item, event) => {
  // Don't navigate if clicking on checkbox
  if (event.target.closest('.user-checkbox')) {
    return;
  }
  emit('selectUser', item);
};

/**
 * Handle checkbox toggle
 */
const handleCheckboxToggle = (item, event) => {
  event.stopPropagation();
  emit('toggleSelection', item, event);
};

/**
 * Check if user item is selected
 */
const isSelected = (item) => {
  return props.selectedUsers.includes(item.id);
};

/**
 * Handle context menu
 */
const showItemContextMenu = (event, item) => {
  event.preventDefault();
  contextUserItem.value = item;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

/**
 * Hide context menu
 */
const hideContextMenu = () => {
  showContextMenu.value = false;
  contextUserItem.value = null;
};

/**
 * Handle delete item
 */
const handleDeleteItem = (item) => {
  emit('delete', [item.id]);
  hideContextMenu();
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

/**
 * Get role display name
 */
const getRoleDisplayName = (roles) => {
  if (!roles || roles.length === 0) return __('No role', 'flexify-dashboard');
  // Capitalize first letter of role
  return roles[0].charAt(0).toUpperCase() + roles[0].slice(1);
};

/**
 * Get Gravatar URL for a user's email
 * @param {string} email - User's email address
 * @param {number} size - Avatar size in pixels (default: 40)
 * @returns {string} Gravatar URL with transparent blank fallback
 */
const getGravatarUrl = (email, size = 40) => {
  if (!email) return null;
  const emailHash = md5(email.toLowerCase().trim());
  // Use d=blank to return transparent image if no Gravatar exists
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=blank`;
};

/**
 * Get user initials from name or username
 * @param {Object} item - User item object
 * @returns {string} User initials (1-2 characters)
 */
const getUserInitials = (item) => {
  const name = item.name || item.username || '';
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Use first letter of first and last name
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  // Use first two letters of single name
  return name.substring(0, 2).toUpperCase();
};

// Close context menu when clicking outside
document.addEventListener('click', hideContextMenu);
</script>

<template>
  <div class="relative">
    <!-- User List -->
    <div class="py-2 flex flex-col gap-1">
      <div
        v-for="item in users"
        :key="item.id"
        @click="handleUserClick(item, $event)"
        @contextmenu="showItemContextMenu($event, item)"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3 relative"
        :class="
          route.params.userId == item.id
            ? 'bg-zinc-100 dark:bg-zinc-800/60'
            : ''
        "
      >
        <!-- User Avatar -->
        <div class="flex-shrink-0 relative">
          <!-- Checkbox - shows on hover, positioned centered over avatar -->
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 user-checkbox cursor-pointer"
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
            class="w-10 h-10 bg-zinc-300 dark:bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center relative"
          >
            <!-- User initials on muted circle (background) -->
            <div
              class="absolute inset-0 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-sm font-medium"
            >
              {{ getUserInitials(item) }}
            </div>
            <!-- Gravatar image (transparent if no Gravatar exists) -->
            <img
              v-if="item.email && getGravatarUrl(item.email)"
              :src="getGravatarUrl(item.email, 40)"
              :alt="item.name || item.username"
              class="w-full h-full object-cover relative z-10"
            />
          </div>
        </div>

        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
              :title="item.name || item.username"
              :class="
                route.params.userId == item.id
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              "
            >
              {{ item.name || item.username }}
            </span>
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {{ item.email }} • {{ getRoleDisplayName(item.roles) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showContextMenu && contextUserItem"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
      class="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-32"
      @click.stop
    >
      <button
        @click="handleDeleteItem(contextUserItem)"
        class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
      >
        <AppIcon icon="delete" class="text-sm" />
        {{ __('Delete', 'flexify-dashboard') }}
      </button>
    </div>
  </div>
</template>
