const dashboard = window.flexifyDashboard?.dashboard;

if (!dashboard) {
  console.warn('[Flexify Dashboard Cards Example] Dashboard API is unavailable.');
} else {
  dashboard.registerCard({
    id: 'example-overview-card',
    type: 'card',
    category: 'overview',
    title: 'Example Overview Card',
    description: 'A simple overview card registered from an external plugin.',
    framework: 'html',
    width: 4,
    mobileWidth: 12,
    component: `
      <div class="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
        <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Overview</div>
        <div class="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">128</div>
        <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Registered via the public dashboard API.</p>
      </div>
    `,
  });

  dashboard.registerCard({
    id: 'example-analytics-card',
    type: 'card',
    category: 'analytics',
    title: 'Example Analytics Card',
    description: 'Analytics card registered from an external plugin.',
    framework: 'html',
    width: 4,
    mobileWidth: 12,
    component: `
      <div class="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
        <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Analytics</div>
        <div class="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">87%</div>
        <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">This card appeared without touching the Flexify core.</p>
      </div>
    `,
  });

  dashboard.registerContainer({
    id: 'example-ecommerce-container',
    type: 'container',
    category: 'ecommerce',
    title: 'Example Commerce Container',
    width: 12,
    mobileWidth: 12,
    columns: 2,
    children: [
      {
        id: 'example-ecommerce-child-sales',
        title: 'Net Sales',
        framework: 'html',
        width: 6,
        mobileWidth: 12,
        component: `
          <div class="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
            <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Net Sales</div>
            <div class="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">$12,480</div>
            <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Container child rendered through the public API.</p>
          </div>
        `,
      },
      {
        id: 'example-ecommerce-child-orders',
        title: 'Orders',
        framework: 'html',
        width: 6,
        mobileWidth: 12,
        component: `
          <div class="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
            <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Orders</div>
            <div class="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">312</div>
            <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Top-level reorder and resize stay outside the container.</p>
          </div>
        `,
      },
    ],
  });
}
