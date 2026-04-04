<script setup>
import { computed } from 'vue';

const props = defineProps({
  siteName: {
    type: String,
    default: '',
  },
  siteDescription: {
    type: String,
    default: '',
  },
  logoUrl: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  initialLetter: {
    type: String,
    default: 'A',
  },
  href: {
    type: String,
    default: '/',
  },
});

const descriptionLines = computed(() => {
  if (!props.siteDescription) {
    return [];
  }

  const words = props.siteDescription.trim().split(/\s+/);
  const midpoint = Math.ceil(words.length / 2);

  if (words.length <= 4) {
    return [props.siteDescription];
  }

  return [
    words.slice(0, midpoint).join(' '),
    words.slice(midpoint).join(' '),
  ].filter(Boolean);
});
</script>

<template>
  <div class="fd-login-aside-brand-card flex max-w-xs flex-col items-center">
    <a :href="href" class="fd-login-brand-link block">
      <div class="fd-login-brand-row">
        <span class="fd-login-brand-badge">
          <span
            v-if="loading"
            class="fd-login-skeleton fd-login-skeleton--logo"
          ></span>

          <img
            v-else-if="logoUrl"
            :src="logoUrl"
            :alt="siteName || 'Logo'"
            class="fd-login-brand-image"
          />

          <span v-else class="fd-login-brand-fallback">{{ initialLetter }}</span>
        </span>

        <span
          v-if="loading"
          class="fd-login-skeleton fd-login-skeleton--title"
        ></span>

        <span v-else-if="siteName" class="fd-login-brand-text">
          {{ siteName }}
        </span>
      </div>
    </a>

    <div
      v-if="loading"
      class="mt-4 flex w-full flex-col items-center gap-2"
    >
      <span class="fd-login-skeleton fd-login-skeleton--copy"></span>
      <span class="fd-login-skeleton fd-login-skeleton--copy fd-login-skeleton--copy-short"></span>
    </div>

    <p v-else-if="siteDescription" class="fd-login-aside-copy">
      <template v-for="(line, index) in descriptionLines" :key="`${line}-${index}`">
        <span class="block">{{ line }}</span>
      </template>
    </p>
  </div>
</template>
