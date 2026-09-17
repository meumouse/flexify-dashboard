<script setup>
import { computed, ref, watch } from 'vue';
import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { FdButton, FdModal } from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import { ADDRESS_FIELDS, emptyAddress } from './useOrderHelpers.js';
import AddressFields from './AddressFields.vue';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  order: { type: Object, required: true },
  /** billing | shipping */
  type: { type: String, default: 'billing' },
});

const emit = defineEmits(['saved']);

const { wc } = useWooCommerce();
const saving = ref(false);
const address = ref(emptyAddress());

const isBilling = computed(() => props.type === 'billing');

watch(open, (value) => {
  if (value) address.value = { ...emptyAddress(), ...(props.order?.[props.type] || {}) };
});

const copyFromBilling = () => {
  const { email, ...billing } = props.order?.billing || {};
  address.value = { ...address.value, ...billing };
};

const submit = async () => {
  const data = Object.fromEntries(ADDRESS_FIELDS.filter((field) => isBilling.value || field !== 'email').map((field) => [field, address.value[field] ?? '']));

  saving.value = true;
  const response = await wc(`orders/${props.order.id}`, { type: 'PUT', data: { [props.type]: data } });
  saving.value = false;

  if (!response?.data) return;

  notify({ title: isBilling.value ? __('Billing address updated', 'flexify-dashboard') : __('Shipping address updated', 'flexify-dashboard'), type: 'success' });
  open.value = false;
  emit('saved', response.data);
};
</script>

<template>
  <FdModal v-model:open="open" size="lg" :title="isBilling ? __('Edit billing address', 'flexify-dashboard') : __('Edit shipping address', 'flexify-dashboard')">
    <form @submit.prevent="submit">
      <FdButton v-if="!isBilling" class="mb-4" variant="link" size="sm" icon="content_copy" type="button" @click="copyFromBilling">{{ __('Copy billing address', 'flexify-dashboard') }}</FdButton>
      <AddressFields v-model="address" :type="type" />
    </form>

    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton :loading="saving" @click="submit">{{ __('Save address', 'flexify-dashboard') }}</FdButton>
    </template>
  </FdModal>
</template>
