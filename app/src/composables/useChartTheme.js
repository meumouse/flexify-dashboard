import { computed, onMounted, onUnmounted, ref } from 'vue';
import { mergeWith } from 'lodash-es';

/**
 * Semantic colors that do not depend on user settings (TailAdmin palette).
 */
const STATIC_COLORS = {
  success: '#12b76a',
  warning: '#f79009',
  error: '#f04438',
  info: '#0ba5ec',
  purple: '#7a5af8',
  pink: '#ee46bc',
};

/**
 * Read a runtime RGB channel token (e.g. --fd-accent-500) and return a CSS color.
 *
 * @param {string} name Custom property name.
 * @param {string} fallback Fallback color.
 * @returns {string}
 */
const readRgbToken = (name, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return value ? `rgb(${value.split(/\s+/).join(', ')})` : fallback;
};

/**
 * Shared ApexCharts theme following the design system.
 *
 * Returns reactive base options (fonts, grid, axis, tooltip) that react to
 * dark mode changes, plus the palette derived from the runtime tokens.
 *
 * @example
 * const { chartOptions, palette } = useChartTheme();
 * const options = computed(() => chartOptions({ xaxis: { categories } }));
 *
 * @returns {{ isDark: import('vue').Ref<boolean>, palette: import('vue').ComputedRef<string[]>, colors: import('vue').ComputedRef<Object>, chartOptions: (overrides?: Object) => Object }}
 */
export function useChartTheme() {
  const isDark = ref(document.documentElement.classList.contains('dark'));
  const revision = ref(0);
  let observer = null;

  onMounted(() => {
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark');
      revision.value++;
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  const colors = computed(() => {
    // Recompute when the root element changes (theme or palette update).
    revision.value;

    return {
      primary: readRgbToken('--fd-accent-500', '#008aff'),
      primaryLight: readRgbToken('--fd-accent-300', '#8fd0ff'),
      axis: isDark.value ? readRgbToken('--fd-base-400', '#98a2b3') : readRgbToken('--fd-base-500', '#667085'),
      grid: isDark.value ? readRgbToken('--fd-base-800', '#1d2939') : readRgbToken('--fd-base-100', '#f2f4f7'),
      ...STATIC_COLORS,
    };
  });

  const palette = computed(() => [
    colors.value.primary,
    colors.value.success,
    colors.value.warning,
    colors.value.primaryLight,
    colors.value.purple,
    colors.value.error,
    colors.value.info,
    colors.value.pink,
  ]);

  /**
   * Build chart options merging the theme defaults with overrides.
   *
   * @param {Object} overrides ApexCharts options.
   * @returns {Object}
   */
  const chartOptions = (overrides = {}) => {
    const fontFamily = getComputedStyle(document.body).fontFamily || 'Outfit, sans-serif';

    const base = {
      chart: {
        fontFamily,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { speed: 300 },
        background: 'transparent',
      },
      colors: palette.value,
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 0, strokeColors: '#fff', hover: { size: 5 } },
      legend: {
        show: false,
        fontFamily,
        labels: { colors: colors.value.axis },
      },
      grid: {
        borderColor: colors.value.grid,
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      xaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: colors.value.axis, fontSize: '12px', fontFamily } },
      },
      yaxis: {
        labels: { style: { colors: colors.value.axis, fontSize: '12px', fontFamily } },
      },
      tooltip: {
        theme: isDark.value ? 'dark' : 'light',
        style: { fontFamily },
      },
      theme: { mode: isDark.value ? 'dark' : 'light' },
    };

    return mergeWith({}, base, overrides, (objValue, srcValue) => (Array.isArray(srcValue) ? srcValue : undefined));
  };

  return { isDark, palette, colors, chartOptions };
}
