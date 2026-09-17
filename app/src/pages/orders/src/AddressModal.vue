<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { FdButton, FdInput, FdModal, FdSelect } from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import { useCountries } from './useOrderHelpers.js';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  order: { type: Object, required: true },
  /** billing | shipping */
  type: { type: String, default: 'billing' },
});

const emit = defineEmits(['saved']);

const { countries, loadCountries } = useCountries();
const { wc } = useWooCommerce();
const saving = ref(false);

const FIELDS = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone'];
const form = reactive(Object.fromEntries(FIELDS.map((field) => [field, ''])));

const isBilling = computed(() => props.type === 'billing');

const countryOptions = computed(() => countries.value.map((country) => ({ value: country.code, label: country.name })));

const stateOptions = computed(() => {
  const country = countries.value.find((item) => item.code === form.country);
  return (country?.states || []).map((state) => ({ value: state.code, label: state.name }));
});

watch(open, (value) => {
  if (!value) return;

  const source = props.order?.[props.type] || {};
  FIELDS.forEach((field) => {
    form[field] = source[field] ?? '';
  });

  loadCountries();
});

const copyFromBilling = () => {
  const billing = props.order?.billing || {};
  FIELDS.filter((field) => !['email'].includes(field)).forEach((field) => {
    if (billing[field] !== undefined) form[field] = billing[field];
  });
};

const submit = async () => {
  const data = Object.fromEntries(FIELDS.filter((field) => isBilling.value || field !== 'email').map((field) => [field, form[field] ?? '']));

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
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div v-if="!isBilling" class="sm:col-span-2">
        <FdButton variant="link" size="sm" icon="content_copy" type="button" @click="copyFromBilling">{{ __('Copy billing address', 'flexify-dashboard') }}</FdButton>
      </div>
      <FdInput v-model="form.first_name" :label="__('First name', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.last_name" :label="__('Last name', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.company" class="sm:col-span-2" :label="__('Company', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.address_1" class="sm:col-span-2" :label="__('Address line 1', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.address_2" class="sm:col-span-2" :label="__('Address line 2', 'flexify-dashboard')" autocomplete="off" />
      <FdSelect v-model="form.country" :options="countryOptions" :label="__('Country / Region', 'flexify-dashboard')" :placeholder="__('Select a country', 'flexify-dashboard')" />
      <FdSelect v-if="stateOptions.length" v-model="form.state" :options="stateOptions" :label="__('State / County', 'flexify-dashboard')" :placeholder="__('Select a state', 'flexify-dashboard')" />
      <FdInput v-else v-model="form.state" :label="__('State / County', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.city" :label="__('City', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.postcode" :label="__('Postcode / ZIP', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-if="isBilling" v-model="form.email" type="email" :label="__('Email address', 'flexify-dashboard')" autocomplete="off" />
      <FdInput v-model="form.phone" type="tel" :label="__('Phone', 'flexify-dashboard')" autocomplete="off" />
    </form>

    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton :loading="saving" @click="submit">{{ __('Save address', 'flexify-dashboard') }}</FdButton>
    </template>
  </FdModal>
</template>
