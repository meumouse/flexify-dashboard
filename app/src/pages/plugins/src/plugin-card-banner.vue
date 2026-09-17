<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
    <!-- Background -->
    <rect width="800" height="400" class="fill-gray-100 dark:fill-gray-800" rx="12" ry="12" />
    <!-- Isometric Grid Pattern (matching cube angles) -->
    <pattern id="grid" x="0" y="0" width="120" height="60" patternUnits="userSpaceOnUse">
      <path d="M 0 60 L 60 30 L 120 60" class="stroke-gray-300 dark:stroke-gray-600" stroke-width="0.75" fill="none" />
      <path d="M 0 0 L 60 30 L 120 0" class="stroke-gray-300 dark:stroke-gray-600" stroke-width="0.75" fill="none" />
    </pattern>
    <rect width="800" height="400" fill="url(#grid)" />
    <!-- Isometric Cube (left) -->
    <g transform="translate(200, 160)">
      <!-- Top face -->
      <path d="M 0 -60 L 120 0 L 0 60 L -120 0 Z" class="fill-white dark:fill-gray-900 stroke-gray-300 dark:stroke-gray-600" />
      <!-- Right face -->
      <path d="M 0 60 L 120 0 L 120 120 L 0 180 Z" class="fill-gray-50 dark:fill-gray-900 stroke-gray-300 dark:stroke-gray-600" />
      <!-- Left face -->
      <path d="M 0 60 L 0 180 L -120 120 L -120 0 Z" class="fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600" />
    </g>
    <!-- Isometric Cube (right) -->
    <g transform="translate(600, 58)">
      <!-- Top face -->
      <path d="M 0 -60 L 120 0 L 0 60 L -120 0 Z" class="fill-white dark:fill-gray-900 stroke-gray-300 dark:stroke-gray-600" />
      <!-- Right face -->
      <path d="M 0 60 L 120 0 L 120 120 L 0 180 Z" class="fill-gray-50 dark:fill-gray-900 stroke-gray-300 dark:stroke-gray-600" />
      <!-- Left face -->
      <path d="M 0 60 L 0 180 L -120 120 L -120 0 Z" class="fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600" />
    </g>
  </svg>
</template>
