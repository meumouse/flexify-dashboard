/**
 * Returns the appropriate admin link for a search result item
 * @param {string} category - The category of the item (menu, post, page, user, etc.)
 * @param {Object} item - The item object
 * @param {string} adminUrl - The WordPress admin URL
 * @returns {string} The admin URL to edit/view the item
 */
export const returnItemLink = (category, item, adminUrl) => {
  if (category === 'menu') return item.url;
  if (category === 'post' || category === 'page')
    return `${adminUrl}post.php?post=${item.id}&action=edit`;
  if (category === 'user') return `${adminUrl}user-edit.php?user_id=${item.id}`;
  return `${adminUrl}post.php?post=${item.id}&action=edit`;
};
