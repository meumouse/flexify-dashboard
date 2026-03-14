// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";

export const getPost = async (post) => {
  const args = { endpoint: `wp/v2/${post.rest_base}/${post.id}`, params: { context: "edit" } };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  return response.data;
};
