import { ref } from "vue";

export const selected = ref([]);
export const posts = ref([]);
export const loading = ref(false);
export const activeFilter = ref("all");
export const columns = ref([]);
export const column_classes = ref({});
export const custom_styles = ref([]);
export const currentPostType = ref({});
export const confirm = ref(null);
export const suppresedLoading = ref(null);
export const pagination = ref({ search: "", per_page: 10, page: 1, pages: 0, total: 0, orderby: "date", order: "DESC", post_type: "post", dateRange: null, categories: [] });
export const rowActions = ref({});
export const openPostParents = ref([]);
export const expandAllChildren = ref(false);
export const filterOptions = ref({
  all: { value: "all", count: 0, current: true, label: __("All", "flexify-dashboard"), query_params: [] },
  draft: { value: "draft", count: 0, current: true, label: __("Drafts", "flexify-dashboard"), query_params: [] },
});
