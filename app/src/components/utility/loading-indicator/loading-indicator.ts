import { computed, getCurrentScope, onScopeDispose, ref } from "vue";
import type { Ref } from "vue";

export type LoadingIndicatorOpts = {
  /** @default 2000 */
  duration: number;
  /** @default 200 */
  throttle: number;
  /** @default 500 */
  hideDelay: number;
  /** @default 400 */
  resetDelay: number;
  /**
   * You can provide a custom function to customize the progress estimation,
   * which is a function that receives the duration of the loading bar (above)
   * and the elapsed time. It should return a value between 0 and 100.
   */
  estimatedProgress?: (duration: number, elapsed: number) => number;
};

export type LoadingIndicator = {
  _cleanup: () => void;
  progress: Ref<number>;
  isLoading: Ref<boolean>;
  start: () => void;
  set: (value: number) => void;
  finish: (opts?: { force?: boolean }) => void;
  clear: () => void;
};

function defaultEstimatedProgress(duration: number, elapsed: number): number {
  const completionPercentage = (elapsed / duration) * 100;
  return (2 / Math.PI) * 100 * Math.atan(completionPercentage / 50);
}

function createLoadingIndicator(opts: Partial<LoadingIndicatorOpts> = {}) {
  const { duration = 2000, throttle = 200, hideDelay = 500, resetDelay = 400 } = opts;
  const getProgress = opts.estimatedProgress || defaultEstimatedProgress;
  const progress = ref(0);
  const isLoading = ref(false);
  let done = false;
  let rafId: number;

  let throttleTimeout: number | NodeJS.Timeout;
  let hideTimeout: number | NodeJS.Timeout;
  let resetTimeout: number | NodeJS.Timeout;

  const start = () => set(0);

  function set(at = 0) {
    if (at >= 100) {
      return finish();
    }
    clear();
    progress.value = at < 0 ? 0 : at;
    if (throttle) {
      throttleTimeout = setTimeout(() => {
        isLoading.value = true;
        _startProgress();
      }, throttle);
    } else {
      isLoading.value = true;
      _startProgress();
    }
  }

  function _hide() {
    hideTimeout = setTimeout(() => {
      isLoading.value = false;
      resetTimeout = setTimeout(() => {
        progress.value = 0;
      }, resetDelay);
    }, hideDelay);
  }

  function finish(opts: { force?: boolean } = {}) {
    progress.value = 100;
    done = true;
    clear();
    _clearTimeouts();
    if (opts.force) {
      progress.value = 0;
      isLoading.value = false;
    } else {
      _hide();
    }
  }

  function _clearTimeouts() {
    clearTimeout(hideTimeout);
    clearTimeout(resetTimeout);
  }

  function clear() {
    clearTimeout(throttleTimeout);
    cancelAnimationFrame(rafId);
  }

  function _startProgress() {
    done = false;
    let startTimeStamp: number;

    function step(timeStamp: number): void {
      if (done) {
        return;
      }

      startTimeStamp ??= timeStamp;
      const elapsed = timeStamp - startTimeStamp;
      progress.value = Math.max(0, Math.min(100, getProgress(duration, elapsed)));

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
  }

  let _cleanup = () => {};
  _cleanup = () => {
    unsubError();
    unsubLoadingStartHook();
    unsubLoadingFinishHook();
    clear();
  };

  return {
    _cleanup,
    progress: computed(() => progress.value),
    isLoading: computed(() => isLoading.value),
    start,
    set,
    finish,
    clear,
  };
}

/**
 * composable to handle the loading state of the page
 * @since 3.9.0
 */
export function useLoadingIndicator(opts: Partial<LoadingIndicatorOpts> = {}): Omit<LoadingIndicator, "_cleanup"> {
  // Initialise global loading indicator if it doesn't exist already
  const indicator = createLoadingIndicator(opts);

  return indicator;
}
