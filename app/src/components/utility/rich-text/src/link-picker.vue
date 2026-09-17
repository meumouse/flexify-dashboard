<script setup>
import { defineModel, ref, watch } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import ContextMenu from '@/components/utility/context-menu/index.vue';

const editor = defineModel();
const contextmenu = ref(null);
const search = ref('');
const searchResults = ref([]);
const loading = ref(false);
const manualUrl = ref('');

const searchContent = async () => {
  if (search.value.length < 2) {
    searchResults.value = [];
    return;
  }

  loading.value = true;
  const params = {
    search: search.value,
    per_page: 5,
  };

  try {
    const [postsResponse, pagesResponse] = await Promise.all([
      lmnFetch({ endpoint: 'wp/v2/posts', params }),
      lmnFetch({ endpoint: 'wp/v2/pages', params }),
    ]);

    const posts = postsResponse?.data || [];
    const pages = pagesResponse?.data || [];

    searchResults.value = [...posts, ...pages].map((item) => ({
      id: item.id,
      title: item.title.rendered,
      type: item.type,
      url: item.link,
    }));
  } catch (error) {
    console.error('Search failed:', error);
    searchResults.value = [];
  }

  loading.value = false;
};

const applyLink = (url) => {
  if (!url) return;
  editor.value.chain().focus().setLink({ href: url }).run();
  contextmenu.value.close();
  search.value = '';
  manualUrl.value = '';
  searchResults.value = [];
};

const setLink = (evt) => {
  contextmenu.value.show(evt);
};

const removeLink = () => {
  editor.value.chain().focus().unsetLink().run();
};

watch(search, async (newValue) => {
  if (newValue.startsWith('http://') || newValue.startsWith('https://')) {
    manualUrl.value = newValue;
    searchResults.value = [];
  } else {
    manualUrl.value = '';
    await searchContent();
  }
});
</script>

<template>
  <template v-if="editor">
    <AppButton
      v-if="!editor.isActive('link')"
      type="transparent"
      @click.prevent.stop="setLink"
      :class="
        editor.isActive('link')
          ? 'text-gray-900 dark:text-gray-100'
          : 'text-gray-400 dark:text-gray-500'
      "
    >
      <AppIcon icon="link" class="text-xl" />
    </AppButton>
    <AppButton v-else type="transparent" @click.prevent.stop="removeLink">
      <AppIcon
        icon="link_off"
        class="text-xl text-gray-400 dark:text-gray-500"
      />
    </AppButton>
  </template>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-2 min-w-[300px] max-w-[300px]">
      <AppInput
        v-model="search"
        type="text"
        :placeholder="__('Paste URL or search', 'flexify-dashboard')"
      />

      <template v-if="loading">
        <div
          class="h-4 w-2/3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
        ></div>
        <div
          class="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
        ></div>
        <div
          class="h-4 w-full rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
        ></div>
        <div
          class="h-4 w-2/3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
        ></div>
      </template>

      <div
        v-else-if="searchResults.length > 0"
        class="flex flex-col max-h-[200px] overflow-y-auto"
      >
        <AppButton
          v-for="result in searchResults"
          :key="result.id"
          type="transparent"
          class="text-left py-2 truncate"
          @click.prevent.stop="applyLink(result.url)"
        >
          {{ result.title }}
        </AppButton>
      </div>

      <AppButton
        v-if="manualUrl"
        type="primary"
        class="mt-2"
        @click.prevent.stop="applyLink(manualUrl)"
      >
        {{ __('Add URL', 'flexify-dashboard') }}
      </AppButton>
    </div>
  </ContextMenu>
</template>
