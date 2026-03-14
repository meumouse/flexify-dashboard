import { computed } from "vue";
import { OGmenu } from "../state/constants.js";

export const flattenedSubItems = computed(() => {
  return OGmenu.value.reduce((acc, item) => {
    if (Array.isArray(item.submenu)) {
      acc.push(...item.submenu);
    }
    return acc;
  }, []);
});
