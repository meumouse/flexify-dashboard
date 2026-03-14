import { defineComponent, h, watch, onMounted, nextTick } from "vue";
import { useLoadingIndicator } from "./loading-indicator.ts";
import { useAppStore } from "@/store/app/app.js";

export default defineComponent({
  name: "NuxtLoadingIndicator",
  props: {
    throttle: {
      type: Number,
      default: 200,
    },
    duration: {
      type: Number,
      default: 2000,
    },
    height: {
      type: Number,
      default: 3,
    },
    color: {
      type: [String, Boolean],
      default: "repeating-linear-gradient(to right, rgb(var(--fd-accent-600) / 1) 0%, rgb(var(--fd-accent-400) / 1) 50%, rgb(var(--fd-accent-300) / 1) 100%)",
    },
    estimatedProgress: {
      type: Function as unknown as () => (duration: number, elapsed: number) => number,
      required: false,
    },
  },
  setup(props, { slots, expose }) {
    const { progress, isLoading, start, finish, clear } = useLoadingIndicator({
      duration: props.duration,
      throttle: props.throttle,
      estimatedProgress: props.estimatedProgress,
    });

    const appStore = useAppStore();

    watch(
      () => appStore.state.loading,
      () => {
        if (appStore.state.loading) {
          start();

          // Add a timeout to finish loading
          setTimeout(() => {
            if (isLoading.value) {
              //finish();
            }
          }, 2000);
        } else {
          finish();
        }
      }
    );

    expose({
      progress,
      isLoading,
      start,
      finish,
      clear,
    });

    return () =>
      h(
        "div",
        {
          class: "loading-indicator",
          style: {
            position: "fixed",
            top: 0,
            right: 0,
            left: 0,
            pointerEvents: "none",
            width: "auto",
            height: `${props.height}px`,
            opacity: isLoading.value ? 1 : 0,
            background: props.color || undefined,
            backgroundSize: `${(100 / progress.value) * 100}% auto`,
            transform: `scaleX(${progress.value}%)`,
            transformOrigin: "left",
            transition: "transform 0.1s, height 0.4s, opacity 0.4s",
            zIndex: 9999999,
          },
        },
        slots
      );
  },
});
