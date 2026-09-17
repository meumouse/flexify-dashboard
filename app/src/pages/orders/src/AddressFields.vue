<script setup>
import { computed, onMounted } from 'vue';
import { FdInput, FdSelect } from '@/components/kit';
import { useCountries } from './useOrderHelpers.js';

/**
 * Address object in the wc/v3 format (billing or shipping).
 */
const address = defineModel({ type: Object, required: true });

const props = defineProps({
  /** billing | shipping */
  type: { type: String, default: 'billing' },
});

const { countries, loadCountries } = useCountries();

const countryOptions = computed(() => countries.value.map((country) => ({ value: country.code, label: country.name })));

const stateOptions = computed(() => {
  const country = countries.value.find((item) => item.code === address.value.country);
  return (country?.states || []).map((state) => ({ value: state.code, label: state.name }));
});

const set = (field, value) => {
  address.value = { ...address.value, [field]: value };
};

const setCountry = (value) => {
  address.value = { ...address.value, country: value, state: '' };
};

onMounted(loadCountries);
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <FdInput :model-value="address.first_name" :label="__('First name', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('first_name', value)" />
    <FdInput :model-value="address.last_name" :label="__('Last name', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('last_name', value)" />
    <FdInput :model-value="address.company" class="sm:col-span-2" :label="__('Company', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('company', value)" />
    <FdInput :model-value="address.address_1" class="sm:col-span-2" :label="__('Address line 1', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('address_1', value)" />
    <FdInput :model-value="address.address_2" class="sm:col-span-2" :label="__('Address line 2', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('address_2', value)" />
    <FdSelect
      :model-value="address.country"
      :options="countryOptions"
      :label="__('Country / Region', 'flexify-dashboard')"
      :placeholder="__('Select a country', 'flexify-dashboard')"
      @update:model-value="setCountry"
    />
    <FdSelect
      v-if="stateOptions.length"
      :model-value="address.state"
      :options="stateOptions"
      :label="__('State / County', 'flexify-dashboard')"
      :placeholder="__('Select a state', 'flexify-dashboard')"
      @update:model-value="(value) => set('state', value)"
    />
    <FdInput v-else :model-value="address.state" :label="__('State / County', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('state', value)" />
    <FdInput :model-value="address.city" :label="__('City', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('city', value)" />
    <FdInput :model-value="address.postcode" :label="__('Postcode / ZIP', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('postcode', value)" />
    <FdInput v-if="props.type === 'billing'" :model-value="address.email" type="email" :label="__('Email address', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('email', value)" />
    <FdInput :model-value="address.phone" type="tel" :label="__('Phone', 'flexify-dashboard')" autocomplete="off" @update:model-value="(value) => set('phone', value)" />
  </div>
</template>
