<template>
  <tr v-for="index in rows" class="animate-pulse" :key="`loader-${index}`">
    <td v-for="colindex in columns" class="px-3 py-3" :class="colindex === 2 ? 'w-1/2' : ''"><div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div></td>
  </tr>
</template>

<script setup>
// Define props and data
const props = defineProps({
  rows: { type: [Number] },
  columns: { type: [Number] },
});
</script>
