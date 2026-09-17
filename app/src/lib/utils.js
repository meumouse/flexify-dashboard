import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge aware of the design system tokens, so custom font sizes
 * (text-theme-sm) are not mistaken for text colors.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title-2xl", "title-xl", "title-lg", "title-md", "title-sm", "title-xs", "theme-xl", "theme-sm", "theme-xs"],
      shadow: ["theme-xs", "theme-sm", "theme-md", "theme-lg", "theme-xl", "focus-ring", "slider-navigation", "tooltip", "datepicker"],
      breakpoint: ["2xsm", "xsm", "3xl"],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
