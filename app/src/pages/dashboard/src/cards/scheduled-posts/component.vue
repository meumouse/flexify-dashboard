<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const props = defineProps({
  dateRange: {
    type: Object,
    required: true,
  },
  appData: {
    type: Object,
    required: true,
  },
});

// Refs
const scheduledPosts = ref([]);
const loading = ref(false);
const error = ref(null);
const currentMonth = ref(new Date());

/**
 * Load scheduled posts for current month
 */
const loadScheduledPosts = async () => {
  loading.value = true;
  error.value = null;

  try {
    const year = currentMonth.value.getFullYear();
    const month = String(currentMonth.value.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, currentMonth.value.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const response = await lmnFetch({
      endpoint: 'wp/v2/posts',
      type: 'GET',
      params: {
        status: 'future',
        after: startDate + 'T00:00:00',
        before: endDate + 'T23:59:59',
        per_page: 100,
        _embed: true,
      },
    });

    scheduledPosts.value = response.data || [];
  } catch (err) {
    error.value = err.message || 'Failed to load scheduled posts';
    console.error('Scheduled posts error:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Get posts for a specific date
 */
const getPostsForDate = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  return scheduledPosts.value.filter((post) => {
    const postDate = new Date(post.date).toISOString().split('T')[0];
    return postDate === dateStr;
  });
};

/**
 * Navigate to previous month
 */
const previousMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1
  );
  loadScheduledPosts();
};

/**
 * Navigate to next month
 */
const nextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1
  );
  loadScheduledPosts();
};

// Computed properties
const monthYear = computed(() => {
  return currentMonth.value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
});

const totalScheduled = computed(() => scheduledPosts.value.length);

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  // Get first day of month and last day
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get first Monday of the week containing the first day
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() - firstDay.getDay() + 1);

  // Get last Sunday of the week containing the last day
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days = [];
  const current = new Date(firstMonday);

  while (current <= lastSunday) {
    const isCurrentMonth = current.getMonth() === month;
    const isToday = current.toDateString() === new Date().toDateString();
    const posts = getPostsForDate(current);

    days.push({
      date: new Date(current),
      day: current.getDate(),
      isCurrentMonth,
      isToday,
      postsCount: posts.length,
      posts,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
});

const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Watch for app data changes (but not date range since this doesn't depend on it)
watch(
  () => props.appData,
  () => {
    // Could reload posts based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadScheduledPosts();
});
</script>

<template>
  <div
    class="bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl p-6 pb-3 h-full flex flex-col border border-zinc-200/40 dark:border-zinc-800/60"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading scheduled posts...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-2">
          {{ __('Failed to load scheduled posts', 'flexify-dashboard') }}
        </p>
        <button
          @click="loadScheduledPosts"
          class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          {{ __('Try again', 'flexify-dashboard') }}
        </button>
      </div>
    </div>

    <!-- Calendar Data -->
    <div v-else class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Scheduled Posts', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ monthYear }}
            </p>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="previousMonth"
            class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <AppIcon
              icon="chevron_left"
              class="text-xl text-zinc-500 dark:text-zinc-400"
            />
          </button>
          <button
            @click="nextMonth"
            class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <AppIcon
              icon="chevron_right"
              class="text-xl text-zinc-500 dark:text-zinc-400"
            />
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="text-center py-2 flex flex-row items-end gap-2">
        <div class="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {{ totalScheduled }}
        </div>
        <div class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Scheduled Posts', 'flexify-dashboard') }}
        </div>
      </div>

      <!-- Calendar Grid -->
      <div
        class="bg-white dark:bg-zinc-950/40 rounded-2xl p-8 -mx-3 -mb-3 border border-zinc-200/40 dark:border-zinc-700/20"
      >
        <!-- Day Headers -->
        <div class="grid grid-cols-7 gap-6 mb-6">
          <div
            v-for="day in dayNames"
            :key="day"
            class="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 py-2"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar Days -->
        <div class="grid grid-cols-7 gap-6">
          <div
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            class="group relative aspect-square flex items-center justify-center rounded-full transition-colors cursor-pointer"
            :class="{
              'text-zinc-400 dark:text-zinc-500 opacity-0 pointer-events-none':
                !day.isCurrentMonth,
              'text-zinc-900 dark:text-zinc-100':
                day.isCurrentMonth && !day.isToday,
              'bg-brand-300 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 border-0 group-hover:bg-brand-400 group-hover:dark:bg-brand-900/40':
                day.isToday,
              'hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/40':
                day.isCurrentMonth && day.postsCount === 0 && !day.isToday,
              'hover:bg-brand-50 dark:hover:bg-brand-900/20 bg-zinc-100 dark:bg-zinc-700/40':
                day.isCurrentMonth && day.postsCount > 0,
            }"
          >
            <!-- Day Number -->
            <span
              class="text-sm font-medium flex flex-col items-center justify-center leading-none"
              :class="[
                day.postsCount === 0 && !day.isToday
                  ? 'text-zinc-500 dark:text-zinc-400'
                  : '',
                day.isToday ? 'text-white' : '',
              ]"
            >
              <span v-if="day.postsCount > 0 || day.isToday">
                {{ day.postsCount }}
              </span>
              <span v-else class="opacity-60"> • </span>
            </span>

            <!-- Hover Popover (using Tailwind group) -->
            <div
              class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-2 opacity-0 group-hover:opacity-100 transition-all z-50 durartion-300 scale-0 group-hover:scale-100"
            >
              <div
                class="bg-white dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-700/30 rounded-2xl p-4 shadow-sm whitespace-nowrap min-w-[200px]"
                :class="day.posts.length > 0 ? 'pb-2' : ''"
              >
                <div
                  class="text-sm font-medium text-zinc-400 dark:text-zinc-500 mb-2"
                >
                  {{
                    day.date.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }}
                </div>
                <div class="space-y-2">
                  <div
                    class="text-zinc-800 dark:text-zinc-300"
                    :class="day.posts.length > 0 ? 'mb-3' : ''"
                  >
                    {{ day.posts.length }}
                    {{ __('Scheduled Posts', 'flexify-dashboard') }}
                  </div>
                  <a
                    v-for="post in day.posts"
                    :key="post.id"
                    :href="
                      appData.state.adminUrl +
                      'post.php?post=' +
                      post.id +
                      '&action=edit'
                    "
                    class="p-2 px-3 bg-zinc-50 dark:bg-zinc-700/30 rounded-xl -mx-2 block hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                  >
                    <div
                      class="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2"
                    >
                      {{ post.title.rendered }}
                    </div>
                    <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {{
                        new Date(post.date).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      }}
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <!-- End of Hover Popover -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
