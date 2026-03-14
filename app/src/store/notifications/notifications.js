import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";

export const useNotificationStore = defineStore("notifications", () => {
  const all = ref([]);
  const template = { type: "normal", title: "", message: "", dismissable: true, loader: false };

  /**
   * Returns current site
   *
   */
  const getAll = computed(() => {
    return all.value;
  });
  /**
   * Adds new notification
   */
  const add = async (notification) => {
    // Only run once
    notification = { ...template, ...notification };
    notification.id = uuidv4();
    all.value.push(notification);

    // Queue it's removal
    setTimeout(() => {
      removeByUID(notification.id);
    }, 6000);
    return notification.id;
  };

  /**
   * Get's list of sites
   */
  const remove = async (index) => {
    // Only run once
    if (all.value[index]) all.value.splice(index, 1);
  };

  /**
   * Remove by UID
   */
  const removeByUID = async (uid) => {
    // Only run once
    const index = all.value.findIndex((item) => item.id === uid);
    if (index >= 0) {
      all.value.splice(index, 1);
    }
  };

  return { all, add, remove, removeByUID, getAll };
});
