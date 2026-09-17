<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { FdButton, FdCheckbox, FdEmptyState, FdInput, FdSelect } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

/**
 * Attributes in the wc/v3 format: { id, name, position, visible, variation, options: string[] }.
 */
const attributes = defineModel({ type: Array, default: () => [] });

const props = defineProps({
  isVariable: { type: Boolean, default: false },
});

const { wc } = useWooCommerce();

const globalAttributes = ref([]);
const terms = reactive({});
const newTerm = reactive({});
const customValues = reactive({});
const selectedToAdd = ref('');

const availableOptions = computed(() => [
  ...globalAttributes.value
    .filter((attribute) => !attributes.value.some((item) => item.id === attribute.id))
    .map((attribute) => ({ value: String(attribute.id), label: attribute.name })),
  { value: 'custom', label: __('Custom attribute', 'flexify-dashboard') },
]);

const loadGlobalAttributes = async () => {
  const response = await wc('products/attributes', { params: { _fields: 'id,name,slug' } });
  globalAttributes.value = Array.isArray(response?.data) ? response.data : [];
};

const loadTerms = async (attributeId) => {
  if (!attributeId || terms[attributeId]) return;

  terms[attributeId] = [];
  const all = [];

  for (let page = 1; page <= 10; page++) {
    const response = await wc(`products/attributes/${attributeId}/terms`, { params: { per_page: 100, page, _fields: 'id,name,slug' } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);
    if (items.length < 100) break;
  }

  terms[attributeId] = all;
};

const splitValues = (value) =>
  String(value || '')
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const addAttribute = () => {
  if (!selectedToAdd.value) return;

  const position = attributes.value.length;

  if (selectedToAdd.value === 'custom') {
    attributes.value = [...attributes.value, { id: 0, name: '', position, visible: true, variation: props.isVariable, options: [] }];
  } else {
    const global = globalAttributes.value.find((attribute) => String(attribute.id) === selectedToAdd.value);
    attributes.value = [...attributes.value, { id: global.id, name: global.name, position, visible: true, variation: props.isVariable, options: [] }];
    loadTerms(global.id);
  }

  selectedToAdd.value = '';
};

const removeAttribute = (index) => {
  attributes.value = attributes.value.filter((_, itemIndex) => itemIndex !== index).map((attribute, position) => ({ ...attribute, position }));
};

const update = (index, patch) => {
  attributes.value = attributes.value.map((attribute, itemIndex) => (itemIndex === index ? { ...attribute, ...patch } : attribute));
};

const toggleTerm = (index, name) => {
  const options = attributes.value[index].options || [];
  update(index, { options: options.includes(name) ? options.filter((option) => option !== name) : [...options, name] });
};

const selectAllTerms = (index, attributeId) => update(index, { options: (terms[attributeId] || []).map((term) => term.name) });

const createTerm = async (index, attributeId) => {
  const name = String(newTerm[attributeId] || '').trim();
  if (!name) return;

  const response = await wc(`products/attributes/${attributeId}/terms`, { type: 'POST', data: { name } });

  if (!response?.data) return;

  terms[attributeId] = [...(terms[attributeId] || []), response.data];
  newTerm[attributeId] = '';
  toggleTerm(index, response.data.name);
};

const commitCustomValues = (index) => {
  const values = splitValues(customValues[index]);
  if (!values.length) return;

  const options = attributes.value[index].options || [];
  update(index, { options: [...new Set([...options, ...values])] });
  customValues[index] = '';
};

const removeOption = (index, option) => update(index, { options: attributes.value[index].options.filter((item) => item !== option) });

onMounted(() => {
  loadGlobalAttributes();
  attributes.value.filter((attribute) => attribute.id).forEach((attribute) => loadTerms(attribute.id));
});
</script>

<template>
  <div class="space-y-4">
    <FdEmptyState
      v-if="!attributes.length"
      compact
      icon="layers"
      :title="__('No attributes yet', 'flexify-dashboard')"
      :description="isVariable ? __('Add attributes such as size or color to create variations.', 'flexify-dashboard') : __('Attributes show extra information such as material or size.', 'flexify-dashboard')"
    />

    <div v-for="(attribute, index) in attributes" :key="`${attribute.id}-${index}`" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <p v-if="attribute.id" class="flex items-center gap-2 font-medium text-gray-800 dark:text-white/90">
            {{ attribute.name }}
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ __('Global', 'flexify-dashboard') }}</span>
          </p>
          <FdInput
            v-else
            :model-value="attribute.name"
            size="sm"
            :placeholder="__('Attribute name, e.g. Material', 'flexify-dashboard')"
            :aria-label="__('Attribute name', 'flexify-dashboard')"
            @update:model-value="(value) => update(index, { name: value })"
          />
        </div>
        <FdButton variant="ghost" size="xs" icon="delete" icon-only :aria-label="__('Remove attribute', 'flexify-dashboard')" @click="removeAttribute(index)" />
      </div>

      <!-- Global attribute terms -->
      <div v-if="attribute.id" class="mt-3">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="term in terms[attribute.id] || []"
            :key="term.id"
            type="button"
            class="rounded-full border px-3 py-1 text-theme-sm transition-colors"
            :class="
              attribute.options.includes(term.name)
                ? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-400'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
            "
            :aria-pressed="attribute.options.includes(term.name)"
            @click="toggleTerm(index, term.name)"
          >
            {{ term.name }}
          </button>
          <span v-if="!(terms[attribute.id] || []).length" class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('This attribute has no values yet.', 'flexify-dashboard') }}</span>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <FdInput v-model="newTerm[attribute.id]" size="sm" class="w-48" :placeholder="__('New value', 'flexify-dashboard')" :aria-label="__('New value', 'flexify-dashboard')" @keydown.enter.prevent="createTerm(index, attribute.id)" />
          <FdButton size="xs" variant="outline" icon="add" @click="createTerm(index, attribute.id)">{{ __('Add value', 'flexify-dashboard') }}</FdButton>
          <FdButton v-if="(terms[attribute.id] || []).length" size="xs" variant="link" @click="selectAllTerms(index, attribute.id)">{{ __('Select all', 'flexify-dashboard') }}</FdButton>
        </div>
      </div>

      <!-- Custom attribute values -->
      <div v-else class="mt-3">
        <div v-if="attribute.options.length" class="mb-3 flex flex-wrap gap-2">
          <span v-for="option in attribute.options" :key="option" class="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 text-theme-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {{ option }}
            <button type="button" class="rounded-full p-0.5 text-gray-400 hover:text-error-500" :aria-label="__('Remove value', 'flexify-dashboard')" @click="removeOption(index, option)">
              <AppIcon icon="close" class="text-sm" />
            </button>
          </span>
        </div>
        <FdInput
          v-model="customValues[index]"
          size="sm"
          :placeholder="__('Type values separated by commas and press Enter', 'flexify-dashboard')"
          :aria-label="__('Attribute values', 'flexify-dashboard')"
          @keydown.enter.prevent="commitCustomValues(index)"
          @blur="commitCustomValues(index)"
        />
      </div>

      <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <FdCheckbox :model-value="attribute.visible" size="sm" :label="__('Visible on the product page', 'flexify-dashboard')" @update:model-value="(value) => update(index, { visible: value })" />
        <FdCheckbox v-if="isVariable" :model-value="attribute.variation" size="sm" :label="__('Used for variations', 'flexify-dashboard')" @update:model-value="(value) => update(index, { variation: value })" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <FdSelect v-model="selectedToAdd" :options="availableOptions" :placeholder="__('Add attribute…', 'flexify-dashboard')" size="sm" class="w-60" />
      <FdButton size="sm" variant="outline" icon="add" :disabled="!selectedToAdd" @click="addAttribute">{{ __('Add', 'flexify-dashboard') }}</FdButton>
    </div>
  </div>
</template>
