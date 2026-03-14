/**
 * Formats a date string
 */
export const formatDateString = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const dateOptions = {
    month: "short",
    day: "numeric",
  };

  const timeOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  // Automatically uses the user's locale preferences
  const formattedDate = new Intl.DateTimeFormat(undefined, dateOptions).format(date);
  const formattedTime = new Intl.DateTimeFormat(undefined, timeOptions).format(date);

  return `${formattedDate}, ${formattedTime}`;
};
