<script setup>
import { computed, useAttrs, useSlots } from 'vue';
import { SelectRoot } from 'reka-ui';
import { provideSelectContext } from './context.js';
import SelectContent from './SelectContent.vue';
import SelectHeader from './SelectHeader.vue';
import SelectIndicator from './SelectIndicator.vue';
import SelectItem from './SelectItem.vue';
import SelectSection from './SelectSection.vue';
import SelectTrigger from './SelectTrigger.vue';
import SelectValue from './SelectValue.vue';
import {
  decodeSelectValue,
  encodeSelectValue,
  normalizeCategories,
  normalizeOptions,
  stripHtml,
} from './utils.js';

defineOptions({
  inheritAttrs: false,
});

const attrs = useAttrs();
const slots = useSlots();
const model = defineModel();

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  contentClass: {
    type: String,
    default: '',
  },
  indicatorClass: {
    type: String,
    default: '',
  },
  options: {
    type: [Array, Object],
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '',
  },
  triggerClass: {
    type: String,
    default: '',
  },
  valueClass: {
    type: String,
    default: '',
  },
});

const normalizedOptions = computed(() => normalizeOptions(props.options));
const normalizedCategories = computed(() => normalizeCategories(props.categories));
const hasCustomMarkup = computed(() => Boolean(slots.default));

const containerClass = computed(() => attrs.class);
const containerStyle = computed(() => attrs.style);

const rootAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const modelProxy = computed({
  get() {
    return encodeSelectValue(model.value);
  },
  set(value) {
    model.value = decodeSelectValue(value);
  },
});

provideSelectContext({
  placeholder: computed(() => props.placeholder),
});
</script>

<template>
  <div :class="containerClass" :style="containerStyle">
    <SelectRoot v-model="modelProxy" v-bind="rootAttrs">
      <slot v-if="hasCustomMarkup" />

      <template v-else>
        <SelectTrigger :class="triggerClass">
          <SelectValue :class="valueClass" />
          <SelectIndicator :class="indicatorClass" />
        </SelectTrigger>

        <SelectContent :class="contentClass">
          <SelectItem
            v-for="item in normalizedOptions"
            :key="`${item.value}`"
            :id="item.value"
            :disabled="item.disabled"
            :html="item.html"
            :text-value="stripHtml(item.label)"
          />

          <SelectSection
            v-for="category in normalizedCategories"
            :key="category.label"
          >
            <SelectHeader>{{ category.label }}</SelectHeader>

            <SelectItem
              v-for="item in category.items"
              :key="`${category.label}-${item.value}`"
              :id="item.value"
              :disabled="item.disabled"
              :html="item.html"
              :text-value="stripHtml(item.label)"
            />
          </SelectSection>
        </SelectContent>
      </template>
    </SelectRoot>
  </div>
</template>
