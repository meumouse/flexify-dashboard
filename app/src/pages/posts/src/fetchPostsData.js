// Store
import { useAppStore } from "@/store/app/app.js";
let appStore;

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

// Refs
import { loading, posts, pagination, filterOptions, columns, column_classes, custom_styles, activeFilter, rowActions, suppresedLoading } from "./constants.js";

export const fetchPostsData = async (suppressLoading) => {
  // Setup app store if needed
  if (!appStore) {
    appStore = useAppStore();
  }

  rowActions.value = [];

  appStore.updateState("loading", true);
  suppresedLoading.value = true;
  if (!suppressLoading) loading.value = true;

  // Construct URL for the hidden admin page
  const url = new URL(`${appStore.state.adminUrl}admin.php`);
  url.searchParams.append("page", "flexify-dashboard-posts-data");
  url.searchParams.append("_wpnonce", appStore.state.restNonce);
  url.searchParams.append("post_type", pagination.value.post_type);
  url.searchParams.append("per_page", pagination.value.per_page);
  url.searchParams.append("paged", pagination.value.page);
  url.searchParams.append("orderby", pagination.value.orderby);
  url.searchParams.append("order", pagination.value.order);
  url.searchParams.append("s", pagination.value.search);
  url.searchParams.append("categories", pagination.value.categories.join(","));

  if (Array.isArray(pagination.value.dateRange)) {
    url.searchParams.append("start_date", formatDate(pagination.value.dateRange[0]));
    url.searchParams.append("end_date", formatDate(pagination.value.dateRange[1]));
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("post_status")) {
    url.searchParams.append("post_status", params.get("post_status"));
  }

  if (params.get("author")) {
    url.searchParams.append("author", params.get("author"));
  }

  // Then loop through and add any query params from the selected view
  const active_view = filterOptions.value[activeFilter.value];
  if (active_view) {
    Object.entries(active_view.query_params).forEach(([key, value]) => {
      // Handle arrays (like multiple post statuses)
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(","));
      } else {
        url.searchParams.append(key, value);
      }
    });
  }

  // Fetch the page
  const response = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "same-origin",
  });

  appStore.updateState("loading", false);

  const html = await response.text();

  // Create a temporary element to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Get the JSON data from the script tag
  const scriptElement = doc.getElementById("flexify-dashboard-posts-data");
  if (!scriptElement) {
    loading.value = false;
    suppresedLoading.value = false;
    throw new Error("Posts data not found");
  }

  // Parse and return the JSON data
  const parsedData = JSON.parse(scriptElement.textContent);

  // We only need to update columns once
  if (!columns.value.length) columns.value = Object.values(parsedData.columns);
  column_classes.value = parsedData.column_classes;
  posts.value = parsedData.items;
  custom_styles.value = parsedData.custom_styles;
  filterOptions.value = parsedData.views;

  // Update pagination values
  pagination.value.pages = parsedData.pages;
  pagination.value.total = parsedData.total;

  updateViews();

  loading.value = false;
  suppresedLoading.value = false;
};

const updateViews = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("post_status")) {
    const currentView = filterOptions.value[params.get("post_status")];
    if (currentView) {
      activeFilter.value = params.get("post_status");
    }
  }

  if (params.get("author")) {
    if (appStore.state.userID == params.get("author")) {
      activeFilter.value = "mine";
    }
  }
};
