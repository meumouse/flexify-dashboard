<script setup>
import {
  ref,
  watch,
  computed,
  defineEmits,
  defineModel,
  defineExpose,
} from 'vue';

import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import ContextMenu from '@/components/utility/context-menu/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import { fetchPostsData } from './fetchPostsData.js';

const contextmenu = ref(null);
const props = defineProps(['post']);
const emit = defineEmits(['refresh']);
const confirm = ref(null);

const menuItems = [
  {
    title: __('Edit', 'flexify-dashboard'),
    icon: 'edit',
    type: 'link',
    url: decodeURIComponent(props.post.edit_url),
    condition: () => {
      // Only allow editing if user has access
      return props.post.is_editable;
    },
  },
  {
    title: __('View', 'flexify-dashboard'),
    icon: 'visibility',
    type: 'link',
    url: decodeURIComponent(props.post.view_url),
    condition: () => true,
  },
  {
    title: __('Duplicate', 'flexify-dashboard'),
    icon: 'copy',
    action: () => duplicatePost(),
    condition: () => {
      // Only allow editing if user has access
      return props.post.is_editable;
    },
  },
  {
    title: __('Restore', 'flexify-dashboard'),
    icon: 'update',
    id: 'restore',
    action: () => restorePost(),
    condition: () => {
      return props.post.single_status == 'trash' && props.post.is_editable;
    },
  },
  {
    type: 'divider',
    condition: () => {
      // Only allow editing if user has access
      return props.post.is_editable;
    },
  },
  {
    title: __('Delete', 'flexify-dashboard'),
    icon: 'delete',
    danger: true,
    action: () => deletePost(),
    condition: () => {
      // Only allow editing if user has access
      return props.post.is_editable;
    },
  },
];

const returnMenuItems = computed(() => {
  if (!props.post.row_actions.length) return menuItems;

  let tempItems = menuItems;
  let restoreIndex = tempItems.findIndex((item) => item.id == 'restore');

  tempItems.splice(restoreIndex, 0, { type: 'divider', condition: () => true });
  restoreIndex++;

  for (let rowAction of props.post.row_actions) {
    tempItems.splice(restoreIndex, 0, {
      title: rowAction.text,
      icon: 'link',
      type: 'link',
      url: rowAction.url,
      condition: () => true,
    });
    restoreIndex++;
  }
  return tempItems;
});

const getPost = async () => {
  const args = {
    endpoint: `wp/v2/${props.post.rest_base}/${props.post.id}`,
    params: { context: 'edit' },
  };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  return response.data;
};

const duplicatePost = async () => {
  const postData = await getPost();

  if (!postData) return;

  const title = `${postData.title.raw} (copy)`;

  const data = { ...postData };
  delete data.id;
  delete data.date;
  delete data.date_gmt;
  delete data.title;

  data.title = title;
  data.status = 'draft';

  const args = {
    endpoint: `wp/v2/${props.post.rest_base}`,
    params: {},
    type: 'POST',
    data,
  };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: 'success', title: __('Item duplicated', 'flexify-dashboard') });
  fetchPostsData(true);
};

const deletePost = async () => {
  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __('Are you sure?', 'flexify-dashboard'),
    message: __(
      'Are you sure you want to delete this item? This action cannot be undone.',
      'flexify-dashboard'
    ),
    okButton: __('Yes delete it', 'flexify-dashboard'),
  });

  // Bailed by user
  if (!userResponse) return;

  contextmenu.value.close();

  const args = {
    endpoint: `wp/v2/${props.post.rest_base}/${props.post.id}`,
    params: { force: props.post.single_status == 'trash' ? true : false },
    type: 'DELETE',
  };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: 'success', title: __('Item deleted', 'flexify-dashboard') });
  fetchPostsData(true);
};

const restorePost = async () => {
  const args = {
    endpoint: `wp/v2/${props.post.rest_base}/${props.post.id}`,
    params: {},
    data: { status: 'draft' },
    type: 'POST',
  };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: 'success', title: __('Item restored', 'flexify-dashboard') });
  fetchPostsData(true);
};

const show = (evt) => {
  contextmenu.value.show(evt);
};

defineExpose({ show });
</script>

<template>
  <div>
    <AppButton type="transparent"
      ><AppIcon
        icon="more_vert"
        class="text-lg"
        @click.stop.prevent="($event) => contextmenu.show($event)"
    /></AppButton>
    <ContextMenu ref="contextmenu">
      <div class="flex flex-col gap-1">
        <template v-for="item in returnMenuItems">
          <a
            v-if="item.type == 'link' && item.condition()"
            :href="item.url"
            @click.stop
            class="px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 flex flex-row place-content-between gap-6 items-center cursor-pointer whitespace-nowrap"
            :class="
              item.danger
                ? 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-300'
                : ''
            "
          >
            <span>{{ item.title }}</span>
            <AppIcon :icon="item.icon" class="text-lg" />
          </a>

          <div
            v-else-if="item.type != 'divider' && item.condition()"
            class="px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 flex flex-row place-content-between gap-6 items-center cursor-pointer whitespace-nowrap"
            :class="
              item.danger
                ? 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-300'
                : ''
            "
            @click.stop="item.action"
          >
            <span>{{ item.title }}</span>
            <AppIcon :icon="item.icon" class="text-lg" />
          </div>

          <div
            v-else-if="item.type == 'divider' && item.condition()"
            class="border-t border-zinc-200 dark:border-zinc-700 w-full my-1"
          ></div>
        </template>
      </div>
    </ContextMenu>

    <Confirm ref="confirm" />
  </div>
</template>
