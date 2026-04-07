<script setup>
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const widget = ref(null);
const loading = ref(true);
const error = ref('');

const loadWidget = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/rank-math/dashboard-widget',
      type: 'GET',
    });

    if (!response?.data) {
      throw new Error('Invalid Rank Math response');
    }

    widget.value = response.data;
  } catch (err) {
    widget.value = null;
    error.value = err?.message || 'Failed to load Rank Math widget.';
  } finally {
    loading.value = false;
  }
};

const plugin = computed(() => widget.value?.plugin || {});
const widgetMeta = computed(() => widget.value?.widget || {});
const sections = computed(() => widget.value?.sections || {});
const analyticsItems = computed(() => sections.value.analytics?.items || []);
const monitorItems = computed(() => sections.value['404-monitor']?.items || []);
const redirectionItems = computed(() => sections.value.redirections?.items || []);
const feedItems = computed(() => sections.value.feed?.items || []);
const footerLinks = computed(() => sections.value.footer?.links || []);

const getMetricData = (metric) => {
  const source = metric?.data;

  if (!source) {
    return {
      total: 'n/a',
      previous: 'n/a',
      difference: 'n/a',
    };
  }

  return {
    total: source.total ?? source?.['total'] ?? 'n/a',
    previous: source.previous ?? source?.['previous'] ?? 'n/a',
    difference: source.difference ?? source?.['difference'] ?? 'n/a',
  };
};

const getTrendClass = (trend) => {
  if (trend === 'up') {
    return 'text-emerald-600 dark:text-emerald-400';
  }

  if (trend === 'down') {
    return 'text-rose-600 dark:text-rose-400';
  }

  return 'text-zinc-400 dark:text-zinc-500';
};

const getTrendIcon = (trend) => {
  if (trend === 'up') {
    return 'arrow_upward';
  }

  if (trend === 'down') {
    return 'arrow_downward';
  }

  return 'remove';
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

onMounted(() => {
  loadWidget();
});
</script>

<template>
  <div class="h-full rounded-3xl border border-zinc-200/60 bg-white p-6 dark:border-[#2e3a47] dark:bg-[#24303f]">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            v-html="widgetMeta.icon"
          />
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Rank Math Overview', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __('SEO insights mirrored from the Rank Math dashboard widget.', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="plugin.version"
          class="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          v{{ plugin.version }}
        </span>
        <span
          v-if="plugin.pro_active"
          class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          PRO
        </span>
      </div>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="index in 4"
        :key="index"
        class="animate-pulse rounded-2xl border border-zinc-200/60 bg-zinc-50 p-4 dark:border-zinc-700/40 dark:bg-zinc-800/40"
      >
        <div class="mb-3 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div class="mb-2 h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div class="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>

    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-900/20">
      <div class="flex items-start gap-3">
        <AppIcon icon="error" class="mt-0.5 text-xl text-rose-500" />
        <div>
          <p class="font-medium text-rose-800 dark:text-rose-200">
            {{ __('Unable to load Rank Math data', 'flexify-dashboard') }}
          </p>
          <p class="mt-1 text-sm text-rose-700 dark:text-rose-300">{{ error }}</p>
          <div class="mt-4">
            <AppButton buttontype="button" @click="loadWidget">
              {{ __('Try Again', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="!plugin.active"
      class="rounded-2xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-700"
    >
      <AppIcon icon="extension_off" class="mx-auto mb-3 text-4xl text-zinc-400" />
      <p class="font-medium text-zinc-900 dark:text-zinc-100">
        {{ __('Rank Math SEO is not active on this site.', 'flexify-dashboard') }}
      </p>
      <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('Activate the plugin to display the Rank Math overview widget in Analytics.', 'flexify-dashboard') }}
      </p>
    </div>

    <div
      v-else-if="!widgetMeta.available"
      class="rounded-2xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-700"
    >
      <AppIcon icon="insights" class="mx-auto mb-3 text-4xl text-zinc-400" />
      <p class="font-medium text-zinc-900 dark:text-zinc-100">
        {{ __('The Rank Math widget has no available modules for this user.', 'flexify-dashboard') }}
      </p>
      <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('Enable Analytics, 404 Monitor or Redirections in Rank Math and confirm the current user has access.', 'flexify-dashboard') }}
      </p>
    </div>

    <div v-else class="space-y-6">
      <section
        v-if="sections.analytics?.enabled"
        class="rounded-3xl border border-zinc-200/60 bg-zinc-50/80 p-5 dark:border-zinc-700/40 dark:bg-zinc-900/20"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __(sections.analytics.title, 'flexify-dashboard') }}
            </h4>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __(sections.analytics.subtitle, 'flexify-dashboard') }}
            </p>
          </div>

          <a
            :href="sections.analytics.report_url"
            class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {{ __(sections.analytics.view_report_label, 'flexify-dashboard') }}
            <AppIcon icon="open_in_new" class="text-sm" />
          </a>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in analyticsItems"
            :key="item.key"
            class="rounded-2xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-700/50 dark:bg-[#24303f]"
          >
            <div class="mb-4 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {{ __(item.label, 'flexify-dashboard') }}
                </p>
                <p class="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {{ __(item.description, 'flexify-dashboard') }}
                </p>
              </div>

              <div :class="getTrendClass(item.trend)" class="inline-flex items-center gap-1 rounded-full bg-current/10 px-2 py-1 text-xs font-medium">
                <AppIcon :icon="getTrendIcon(item.trend)" class="text-xs" />
                <span>{{ getMetricData(item).difference }}</span>
              </div>
            </div>

            <div class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {{ getMetricData(item).total }}
            </div>
            <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {{ __('Previous period:', 'flexify-dashboard') }} {{ getMetricData(item).previous }}
            </p>
          </article>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-2">
        <section
          v-if="sections['404-monitor']?.enabled"
          class="rounded-3xl border border-zinc-200/60 bg-zinc-50/80 p-5 dark:border-zinc-700/40 dark:bg-zinc-900/20"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __(sections['404-monitor'].title, 'flexify-dashboard') }}
            </h4>
            <a
              :href="sections['404-monitor'].report_url"
              class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {{ __(sections['404-monitor'].view_report_label, 'flexify-dashboard') }}
              <AppIcon icon="open_in_new" class="text-sm" />
            </a>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <article
              v-for="item in monitorItems"
              :key="item.key"
              class="rounded-2xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-700/50 dark:bg-[#24303f]"
            >
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {{ __(item.label, 'flexify-dashboard') }}
              </p>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ __(item.description, 'flexify-dashboard') }}
              </p>
              <div class="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                {{ item.formatted_total }}
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="sections.redirections?.enabled"
          class="rounded-3xl border border-zinc-200/60 bg-zinc-50/80 p-5 dark:border-zinc-700/40 dark:bg-zinc-900/20"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __(sections.redirections.title, 'flexify-dashboard') }}
            </h4>
            <a
              :href="sections.redirections.report_url"
              class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {{ __(sections.redirections.view_report_label, 'flexify-dashboard') }}
              <AppIcon icon="open_in_new" class="text-sm" />
            </a>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <article
              v-for="item in redirectionItems"
              :key="item.key"
              class="rounded-2xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-700/50 dark:bg-[#24303f]"
            >
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {{ __(item.label, 'flexify-dashboard') }}
              </p>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ __(item.description, 'flexify-dashboard') }}
              </p>
              <div class="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                {{ item.formatted_total }}
              </div>
            </article>
          </div>
        </section>
      </div>

      <section
        v-if="sections.feed?.enabled"
        class="rounded-3xl border border-zinc-200/60 bg-zinc-50/80 p-5 dark:border-zinc-700/40 dark:bg-zinc-900/20"
      >
        <h4 class="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __(sections.feed.title, 'flexify-dashboard') }}
        </h4>

        <div v-if="feedItems.length > 0" class="grid gap-3 lg:grid-cols-3">
          <a
            v-for="post in feedItems"
            :key="`${post.url}-${post.date}`"
            :href="post.url"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-2xl border border-zinc-200/60 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-700/50 dark:bg-[#24303f] dark:hover:border-zinc-600"
          >
            <div class="mb-3 flex items-center gap-2">
              <span
                v-if="post.label"
                class="rounded-full bg-brand-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
              >
                {{ post.label }}
              </span>
              <span class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(post.date) }}</span>
            </div>
            <p class="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
              {{ post.title }}
            </p>
          </a>
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          {{ __('The Rank Math blog feed is temporarily unavailable.', 'flexify-dashboard') }}
        </div>
      </section>

      <footer
        v-if="footerLinks.length > 0"
        class="flex flex-wrap items-center gap-3 border-t border-zinc-200/70 pt-5 text-sm dark:border-zinc-700/50"
      >
        <a
          v-for="link in footerLinks"
          :key="link.key"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {{ __(link.label, 'flexify-dashboard') }}
          <AppIcon icon="open_in_new" class="text-sm" />
        </a>
      </footer>
    </div>
  </div>
</template>
