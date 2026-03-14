import { useNotificationStore } from "@/store/notifications/notifications.js";

export const notify = ({ type = "default", title = "", message = "" }) => {
  const notificationsStore = useNotificationStore();

  // Success notification
  notificationsStore.add({ type, title, message });
};
