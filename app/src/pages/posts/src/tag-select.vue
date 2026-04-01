<script setup>
import { ref, onMounted, computed, watch, defineProps } from "vue";

// Import functions

import { inSearch } from "@/assets/js/functions/inSearch.js";
import { getLastPathSegment } from "@/assets/js/functions/getLastPathSegment.js";
import { slugify } from "@/assets/js/functions/slugify.js";
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

// Import comps
import AppIcon from "@/components/utility/icons/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import ContextMenu from "@/components/utility/context-menu/index.vue";
import uiCheckbox from "@/components/utility/checkbox/index.vue";

const emit = defineEmits(["updated"]);
const props = defineProps(["single", "restrict", "placeholder"]);
const selected = defineModel();

const contextmenu = ref(null);
const trigger = ref(null);
const remoteTags = ref([]);
const selectedTags = ref([]);
const loading = ref(false);
const searchbox = ref(null);
const searchTerm = ref("");
const creatingTerm = ref(false);
const currentIndex = ref(0);

/**
 * Returns searched remote terms
 *
 */
const returnRemoteTags = computed(() => {
  return remoteTags.value.filter((term) => inSearch(searchTerm.value, term.name, term.slug, term.description));
});

/**
 * Returns selected terms
 *
 */
const returnCurrentTags = computed(() => {
  return selectedTags.value || [];
});

/**
 * Resets index when query changes
 *
 */
const maybeResetIndex = () => {
  const length = returnRemoteTags.value.length - 1;
  if (currentIndex.value > length) {
    currentIndex.value = length;
  }
};

/**
 * Get's post terms
 *
 * Get's post ID from url slug and sends to server
 * @since 0.0.1
 */
const getRemoteTags = async () => {
  // Start loader
  loading.value = true;

  // Build payload

  const args = { endpoint: `wp/v2/tags`, params: { per_page: "100", search: searchTerm.value } };
  const response = await lmnFetch(args);

  // End loader
  loading.value = false;

  if (!response) return;

  remoteTags.value = response.data;
};

/**
 * Get's post terms on load to fetch details
 *
 * Get's post ID from url slug and sends to server
 * @since 0.0.1
 */
const getSelectedTags = async () => {
  // No products selected so bail
  if (!selected.value.length) return;

  // Start loader
  loading.value = true;

  // Build payload

  const args = { endpoint: `wp/v2/tags`, params: { per_page: "100", search: "", include: selected.value } };
  const response = await lmnFetch(args);

  // End loader
  loading.value = false;

  if (!response) return;

  selectedTags.value = response.data;
};

/**
 * Handles arrow up keys
 *
 */
const handleupArrow = () => {
  if (currentIndex.value === 0) {
    currentIndex.value = returnRemoteTags.value.length - 1;
  } else {
    currentIndex.value--;
  }
};

/**
 * Handles arrow down keys
 *
 */
const handledownArrow = () => {
  if (currentIndex.value >= returnRemoteTags.value.length - 1) {
    currentIndex.value = 0;
  } else {
    currentIndex.value++;
  }
};

/**
 * Returns classes for terms in selection box
 *
 */
const returnTermClasses = (term, index) => {
  let classes = term.id === term.slug ? "bg-zinc-100" : "";

  if (index === currentIndex.value) {
    classes += " bg-zinc-100 text-zinc-900  dark:bg-zinc-800 dark:text-zinc-100";
  }

  return classes;
};

/**
 * Removes last selected term
 *
 */
const removeLastTerm = (event) => {
  if (searchTerm.value.length === 0) {
    selectedTags.value.pop();
  }
};

/**
 * Creates a new term from selection or typed value
 *
 */
const addNewProduct = () => {
  // Attempt to push term from list first
  let products = returnRemoteTags.value;
  if (products[currentIndex.value]) {
    toggleTerm(products[currentIndex.value]);
  }
};

/**
 * Removes a tag
 *
 */
const removeTag = (productid) => {
  const foundIndex = selectedTags.value.findIndex((item) => item.id === productid);
  if (foundIndex >= 0) selectedTags.value.splice(foundIndex, 1);
};

/**
 * Toggles a terms selection
 *
 */
const toggleTerm = (product, newValue, index) => {
  const exists = productIsSelected(product.id);

  if (exists) {
    removeTag(product.id);
  } else {
    if (props.single) {
      selectedTags.value = [product];
    } else {
      selectedTags.value.push(product);
    }
  }
};

/**
 * Returns whether a term is selected
 *
 */
const productIsSelected = (termid) => {
  const exists = selectedTags.value.find((item) => item.id == termid);
  return exists ? true : false;
};

/**
 * Opens terms box
 *
 */
const openTags = (evt) => {
  searchbox.value.focus();
  if (contextmenu.value.isOpen()) return contextmenu.value.close();
  const pos = returnThisPos();
  contextmenu.value.show(evt, pos);
  getRemoteTags();
};

/**
 * Returns postition of current target
 *
 * @since 0.0.1
 */
const returnThisPos = (evt) => {
  const target = trigger.value;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left - 303 };
};

/**
 * Watch term value
 *
 */
watch(
  () => searchTerm.value,
  () => {
    maybeResetIndex();
    getRemoteTags();
  }
);

/**
 * Watch term value
 *
 */
watch(
  () => selectedTags.value,
  () => {
    selected.value = selectedTags.value.map((item) => item.id);
  },
  { deep: true }
);

getSelectedTags();
</script>

<template>
  <div
    ref="trigger"
    @click.prevent.stop="openTags($event)"
    class="flex flex-row gap-2 w-full cursor-pointer p-1 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 focus:shadow-xs"
  >
    <div class="flex flex-row flex-wrap gap-1 flex-grow">
      <div v-for="(term, index) in returnCurrentTags" class="text-sm rounded-lg pl-2 pr-1 border border-zinc-200 dark:border-zinc-700 flex gap-1 items-center bg-zinc-50 dark:bg-zinc-800">
        <span>{{ term.name }}</span>
        <AppButton @click.prevent.stop="removeTag(term.id)" type="transparent" class="text-xs"><AppIcon icon="close" /></AppButton>
      </div>
      <input
        v-if="!creatingTerm"
        ref="searchbox"
        v-model="searchTerm"
        type="text"
        class="flex-grow min-w-6 w-6 outline-0 bg-transparent"
        :placeholder="placeholder"
        @keydown.delete="removeLastTerm"
        @keyup.down="handledownArrow"
        @keyup.up="handleupArrow"
      />
      <svg v-else class="animate-spin text-brand-500 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <AppButton type="transparent"><AppIcon icon="unfold" /></AppButton>

    <ContextMenu ref="contextmenu">
      <div class="flex flex-col w-80 min-h-[100px] max-h-[400px] overflow-auto">
        <div class="flex flex-row place-content-between mb-3">
          <div class="font-semibold text-zinc-900 dark:text-zinc-100">{{ __("Tags", "flexify-dashboard") }}</div>
          <AppButton type="transparent" @click.stop="contextmenu.close"><AppIcon icon="close" /></AppButton>
        </div>

        <div v-if="loading" class="w-full flex flex-col gap-2">
          <div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 h-4 w-2/3"></div>
          <div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 h-4 w-3/4"></div>
          <div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 h-4 w-1/2"></div>
        </div>
        <!--Status list-->
        <template v-else v-for="(term, index) in returnRemoteTags">
          <AppButton class="w-full text-left" :class="returnTermClasses(term, index)" type="transparent">
            <div class="flex flex-row items-center place-content-between w-full gap-3 relative" @click="(d) => toggleTerm(term, d, index)">
              <uiCheckbox :value="productIsSelected(term.id)" />
              <span class="flex-grow overflow-hidden text-ellipsis whitespace-nowrap">{{ term.name }}</span>

              <template v-if="index == currentIndex">
                <AppIcon icon="arrow_upward" class="text-zinc-400" />
                <AppIcon icon="arrow_downward" class="text-zinc-400" />
              </template>
            </div>
          </AppButton>
        </template>
        <div class="px-3 py-2 bg-zinc-100 text-sm rounded-lg w-full text-zinc-500" v-if="!returnRemoteTags.length && !loading && searchTerm.length">
          {{ __("No products found", "flexify-dashboard") }}
        </div>
        <div class="px-3 py-2 bg-zinc-100 text-sm rounded-lg w-full text-zinc-500" v-if="!returnRemoteTags.length && !loading && !searchTerm.length">
          {{ __("No products found", "flexify-dashboard") }}
        </div>
      </div>
    </ContextMenu>
  </div>
</template>
