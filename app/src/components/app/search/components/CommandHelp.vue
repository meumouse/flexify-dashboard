<script setup>
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="mb-2 capitalize text-zinc-400 dark:text-zinc-200">
      {{ __('Command Syntax', 'flexify-dashboard') }}
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
          >>post</code
        >
        <span class="text-zinc-600 dark:text-zinc-400">{{
          __('Search only posts', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
          >>page</code
        >
        <span class="text-zinc-600 dark:text-zinc-400">{{
          __('Search only pages', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
          >@user</code
        >
        <span class="text-zinc-600 dark:text-zinc-400">{{
          __('Search only users', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
          >#category</code
        >
        <span class="text-zinc-600 dark:text-zinc-400">{{
          __('Search only categories', 'flexify-dashboard')
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
          >!action</code
        >
        <span class="text-zinc-600 dark:text-zinc-400">{{
          __('Show only quick actions', 'flexify-dashboard')
        }}</span>
      </div>
    </div>
  </div>
</template>
