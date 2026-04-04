<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
});

const iconMap = {
  email: {
    viewBox: '0 0 20 20',
    paths: [
      {
        d: 'M2.5 5.75A1.75 1.75 0 0 1 4.25 4h11.5a1.75 1.75 0 0 1 1.75 1.75v8.5A1.75 1.75 0 0 1 15.75 16H4.25A1.75 1.75 0 0 1 2.5 14.25v-8.5Z',
      },
      {
        d: 'm3.25 5.25 6.138 4.911a1 1 0 0 0 1.224 0L16.75 5.25',
      },
    ],
  },
  lock: {
    viewBox: '0 0 20 20',
    paths: [
      {
        d: 'M6.75 8V6.25a3.25 3.25 0 1 1 6.5 0V8',
      },
      {
        d: 'M5.25 8h9.5A1.75 1.75 0 0 1 16.5 9.75v5A1.75 1.75 0 0 1 14.75 16.5h-9.5A1.75 1.75 0 0 1 3.5 14.75v-5A1.75 1.75 0 0 1 5.25 8Z',
      },
      {
        d: 'M10 11.25v2.25',
      },
    ],
  },
};

const iconDefinition = computed(() => iconMap[props.icon] || iconMap.email);
</script>

<template>
  <svg
    class="fd-login-icon"
    :viewBox="iconDefinition.viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      v-for="path in iconDefinition.paths"
      :key="path.d"
      :d="path.d"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
