/**
 * Class recipes shared by the Flexify Dashboard component kit.
 *
 * Based on the TailAdmin design system (MIT). Keep recipes here so legacy
 * components (components/utility) and the kit render identical styles.
 */

export const buttonBase =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors cursor-pointer select-none focus:outline-hidden focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50';

export const buttonVariants = {
  primary: 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300',
  outline:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]',
  danger: 'bg-error-500 text-white shadow-theme-xs hover:bg-error-600 active:bg-error-700 disabled:bg-error-300',
  'danger-outline':
    'bg-white text-error-600 ring-1 ring-inset ring-error-300 shadow-theme-xs hover:bg-error-50 dark:bg-gray-800 dark:text-error-500 dark:ring-error-500/40 dark:hover:bg-error-500/10',
  warning: 'bg-warning-500 text-white shadow-theme-xs hover:bg-warning-600 active:bg-warning-700 disabled:bg-warning-300',
  success: 'bg-success-500 text-white shadow-theme-xs hover:bg-success-600 active:bg-success-700 disabled:bg-success-300',
  ghost:
    'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300',
  link: 'bg-transparent text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 px-0! py-0! h-auto!',
};

export const buttonSizes = {
  xs: 'h-8 px-3 text-theme-xs',
  sm: 'h-10 px-4 text-theme-sm',
  md: 'h-11 px-5 text-theme-sm',
  lg: 'h-12 px-6 text-theme-md',
};

export const iconButtonSizes = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
};

export const fieldBase =
  'w-full rounded-lg border bg-transparent text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 transition-colors focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:border-gray-800 dark:disabled:bg-white/[0.03]';

export const fieldStates = {
  default: 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800',
  error: 'border-error-300 focus:border-error-300 focus:ring-error-500/10 dark:border-error-700 dark:focus:border-error-800',
  success: 'border-success-300 focus:border-success-300 focus:ring-success-500/10 dark:border-success-700 dark:focus:border-success-800',
};

export const fieldSizes = {
  sm: 'h-9 px-3 py-2',
  md: 'h-11 px-4 py-2.5',
  lg: 'h-12 px-4 py-3',
};

export const labelClass = 'mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400';

export const hintClasses = {
  default: 'mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400',
  error: 'mt-1.5 text-theme-xs text-error-500',
  success: 'mt-1.5 text-theme-xs text-success-500',
};

export const cardClass = 'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]';

export const dropdownPanelClass =
  'z-99999 min-w-40 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark';

export const dropdownItemClass =
  'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-start text-theme-sm font-medium text-gray-500 outline-hidden transition-colors hover:bg-gray-100 hover:text-gray-700 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-gray-300';

export const badgeColors = {
  primary: {
    light: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    solid: 'bg-brand-500 text-white',
    dot: 'bg-brand-500',
  },
  success: {
    light: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    solid: 'bg-success-500 text-white',
    dot: 'bg-success-500',
  },
  error: {
    light: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
    solid: 'bg-error-500 text-white',
    dot: 'bg-error-500',
  },
  warning: {
    light: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    solid: 'bg-warning-500 text-white',
    dot: 'bg-warning-500',
  },
  info: {
    light: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
    solid: 'bg-blue-light-500 text-white',
    dot: 'bg-blue-light-500',
  },
  orange: {
    light: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
    solid: 'bg-orange-500 text-white',
    dot: 'bg-orange-500',
  },
  purple: {
    light: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/15',
    solid: 'bg-theme-purple-500 text-white',
    dot: 'bg-theme-purple-500',
  },
  light: {
    light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
    solid: 'bg-gray-400 text-white dark:bg-white/5 dark:text-white/80',
    dot: 'bg-gray-400',
  },
  dark: {
    light: 'bg-gray-500 text-white dark:bg-white/5 dark:text-white',
    solid: 'bg-gray-700 text-white dark:bg-white/15 dark:text-white',
    dot: 'bg-gray-700 dark:bg-gray-400',
  },
};

export const alertColors = {
  success: { box: 'border-success-500 bg-success-50 dark:border-success-500/30 dark:bg-success-500/15', icon: 'text-success-500', iconName: 'check_circle' },
  error: { box: 'border-error-500 bg-error-50 dark:border-error-500/30 dark:bg-error-500/15', icon: 'text-error-500', iconName: 'error' },
  warning: { box: 'border-warning-500 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/15', icon: 'text-warning-500', iconName: 'warning' },
  info: { box: 'border-blue-light-500 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/15', icon: 'text-blue-light-500', iconName: 'info' },
};
