<script setup>
import { defineProps, ref } from "vue";

import AppButton from "@/components/utility/app-button/index.vue";
import Modal from "@/components/utility/modal/index.vue";
import AppSelect from "@/components/utility/select/index.vue";
import Confirm from "@/components/utility/confirm/index.vue";
import CategorySelect from "./category-select.vue";
import TagSelect from "./tag-select.vue";
import InlineUserSelect from "./inline-user-select.vue";

// Funcs
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

const props = defineProps(["selected", "posts", "fetchPostsData", "postType"]);
const batchmodal = ref(null);
const updating = ref(false);
const confirm = ref(false);

const batchData = ref({
  categories: [],
  tags: [],
  author: {},
  status: "",
});

const batchUpdatePosts = async () => {
  if (!props.selected.length) return;

  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Publish changes?", "flexify-dashboard"),
    message: __("Are you sure you want to batch update these items?", "flexify-dashboard"),
    okButton: __("Yes update them", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  updating.value = true;

  const data = { ...batchData.value };

  if (data.author.id) {
    data.author = data.author.id;
  } else {
    delete data.author;
  }

  if (!data.status) delete data.status;
  if (!data.categories.length) delete data.categories;
  if (!data.tags.length) delete data.tags;

  for (let itemID of props.selected) {
    const args = { endpoint: `wp/v2/${props.postType.rest_base}/${itemID}`, params: {}, data, type: "POST" };
    const response = await lmnFetch(args);

    // Something went wrong
    if (!response) continue;
  }

  updating.value = false;

  notify({ type: "success", title: __("Items updated", "flexify-dashboard") });
  props.fetchPostsData(true);
  batchmodal.value.close();
};

const openBatchEdit = (evt) => {
  batchData.value = {
    categories: [],
    tags: [],
    author: {},
    status: "",
  };

  batchmodal.value.show(evt);
};

const closeModal = () => {
  batchmodal.value.close();
};
</script>

<template>
  <AppButton type="default" class="text-sm" @click="openBatchEdit" :disabled="!selected.length">{{ __("Batch edit", "flexify-dashboard") }}</AppButton>

  <Modal ref="batchmodal" position="top">
    <div class="p-6 flex flex-col gap-6 w-[500px] max-w-full">
      <div class="font-semibold text-zinc-900 dark:text-zinc-100">{{ __("Batch edit", "flexify-dashboard") }}</div>

      <div class="grid grid-cols-3 gap-4 pl-3">
        <!-- Categories -->
        <template v-if="appStore.state.supports_categories">
          <div class="flex flex-col justify-center">
            <span>{{ __("Categories", "flexify-dashboard") }}</span>
          </div>
          <div class="col-span-2"><CategorySelect v-model="batchData.categories" /></div>
        </template>

        <!-- Tags -->
        <template v-if="appStore.state.supports_tags">
          <div class="flex flex-col justify-center">
            <span>{{ __("Tags", "flexify-dashboard") }}</span>
          </div>
          <div class="col-span-2"><TagSelect v-model="batchData.tags" /></div>
        </template>

        <!-- Status -->
        <div class="flex flex-col justify-center">
          <span>{{ __("Status", "flexify-dashboard") }}</span>
        </div>
        <div class="col-span-2">
          <AppSelect v-model="batchData.status" :options="appStore.state.postStatuses" />
        </div>

        <!-- Author -->
        <div class="flex flex-col justify-center">
          <span>{{ __("Author", "flexify-dashboard") }}</span>
        </div>
        <div class="col-span-2"><InlineUserSelect v-model="batchData.author" :post="{ is_editable: true }" /></div>
      </div>

      <div class="flex flex-row gap-3 place-content-end">
        <AppButton type="default" class="text-sm" @click.stop="closeModal">{{ __("Cancel", "flexify-dashboard") }}</AppButton>
        <AppButton type="primary" class="text-sm" @click="batchUpdatePosts" :loading="updating">{{ __("Update", "flexify-dashboard") }}</AppButton>
      </div>

      <Confirm ref="confirm" />
    </div>
  </Modal>
</template>
