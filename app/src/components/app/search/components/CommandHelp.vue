<script setup>
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="mb-2 capitalize text-gray-400 dark:text-gray-200">
      {{ __('Command Syntax', 'flexify-dashboard') }}
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
          >>post</code
        >
        <span class="text-gray-600 dark:text-gray-400">{{
          __('Search only posts', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
          >>page</code
        >
        <span class="text-gray-600 dark:text-gray-400">{{
          __('Search only pages', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
          >@user</code
        >
        <span class="text-gray-600 dark:text-gray-400">{{
          __('Search only users', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
          >#category</code
        >
        <span class="text-gray-600 dark:text-gray-400">{{
          __('Search only categories', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
          >!action</code
        >
        <span class="text-gray-600 dark:text-gray-400">{{
          __('Show only quick actions', 'flexify-dashboard')
        }}</span>
      </div>
    </div>
  </div>
</template>
