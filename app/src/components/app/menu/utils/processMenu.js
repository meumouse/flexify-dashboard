import { loading, menu, dashIconsList } from '../state/constants.js';
import { processSubmenu } from './processSubmenu.js';
import { extractNumberFromHtml } from './extractNumberFromHtml.js';
import { getBeforeContent } from './getBeforeContent.js';
import { getDashiconClass } from './getDashiconClass.js';
import { isCurrentLocationMatch } from './isCurrentLocationMatch.js';

/**
 * Parses the admin menu from the DOM and sets the menu state.
 * @async
 * @param {HTMLElement} menuNode - The root node of the admin menu.
 */
export const processMenu = async (menuNode) => {
  if (menuNode) menuNode = menuNode.querySelector('#adminmenu');

  // There is no menu node so bail
  if (!menuNode) return (loading.value = false);

  const topLevelItems = menuNode.children;
  const menuHolder = [];
  dashIconsList.value = [];

  // First pass: Process all items and mark them as active based on WordPress detection
  for (let item of topLevelItems) {
    // Separator
    if (item.classList.contains('wp-menu-separator')) {
      const seps = menuHolder.filter((sep) => sep.type == 'separator');
      const id = `separator-${seps.length}`;
      menuHolder.push({ type: 'separator', id });
      continue;
    }

    const linkNode = item.querySelector(':scope > a');
    const nameNode = item.querySelector(':scope .wp-menu-name');
    const image = item.querySelector(':scope .wp-menu-image');
    const image_as_icon = image ? image.querySelector(':scope img') : false;

    // Probably a separator
    if (!linkNode) continue;

    const id = item.getAttribute('id');
    const url = linkNode.getAttribute('href');
    const target = linkNode.getAttribute('target');
    const notifications = extractNumberFromHtml(nameNode);

    // Check for current link - WordPress native detection first
    let active = false;
    if (
      linkNode.classList.contains('current') ||
      linkNode.getAttribute('aria-current') == 'page' ||
      item.classList.contains('wp-menu-open')
    ) {
      active = true;
    }

    // Handle naming
    let name = nameNode.innerHTML;
    const nameParts = name.split('<');
    const strippedName = nameParts[0] !== '' ? nameParts[0] : name;

    // Get icon classes
    let classes = image.classList ? [...image.classList] : [];
    //classes = classes.filter((subclass) => !subclass.includes("wp-menu-image"));
    let iconStyles = classes.includes('svg') ? image.getAttribute('style') : '';

    if (image_as_icon) {
      let href = image_as_icon.getAttribute('src');
      iconStyles = href
        ? `background-image: url("${href}");height:1.2rem;background-size:contain;`
        : '';
    }

    const { content, font, backGroundImage } = getBeforeContent(image);

    const dashClass = getDashiconClass(image);
    if (dashClass)
      dashIconsList.value.push({
        class: `.${dashClass}`,
        before: content,
        font,
        backGroundImage,
      });

    if (!dashClass && (backGroundImage || content))
      dashIconsList.value.push({
        class: `#${id} .wp-menu-image`,
        before: content,
        font,
        backGroundImage,
      });

    const submenu = processSubmenu(item);

    // Push to menu
    menuHolder.push({
      url,
      target,
      name: strippedName,
      notifications,
      imageClasses: classes,
      iconStyles,
      submenu,
      active,
      id,
    });
  }

  // Second pass: Check for direct location matches and apply precedence
  let directMatchFound = false;
  let directMatchParentIndex = -1;

  // First, check all submenu items for direct matches (they take precedence)
  for (let i = 0; i < menuHolder.length; i++) {
    const item = menuHolder[i];
    if (item.type === 'separator' || !Array.isArray(item.submenu)) continue;

    // Check submenu items for direct matches
    for (let j = 0; j < item.submenu.length; j++) {
      const submenuItem = item.submenu[j];
      if (isCurrentLocationMatch(submenuItem.url)) {
        // Found a direct match in submenu
        directMatchFound = true;
        directMatchParentIndex = i;
        submenuItem.active = true;
        submenuItem.directMatch = true;

        // Deactivate other submenu items in this parent
        for (let k = 0; k < item.submenu.length; k++) {
          if (k !== j && !item.submenu[k].directMatch) {
            item.submenu[k].active = false;
          }
        }

        // Activate parent and mark it
        item.active = true;
        item.directMatch = true;
        break; // Only one submenu item should match per parent
      }
    }
  }

  // If no submenu match found, check top-level items for direct matches
  if (!directMatchFound) {
    for (let i = 0; i < menuHolder.length; i++) {
      const item = menuHolder[i];
      if (item.type === 'separator' || !item.url) continue;

      // Check if this top-level item matches directly
      if (isCurrentLocationMatch(item.url)) {
        directMatchFound = true;
        directMatchParentIndex = i;
        item.active = true;
        item.directMatch = true;
        break; // Only one top-level item should match
      }
    }
  }

  // If a direct match was found, deactivate other top-level items
  if (directMatchFound && directMatchParentIndex >= 0) {
    for (let i = 0; i < menuHolder.length; i++) {
      if (i !== directMatchParentIndex && menuHolder[i].type !== 'separator') {
        // Only deactivate if it wasn't a direct match itself
        if (!menuHolder[i].directMatch) {
          menuHolder[i].active = false;
          // Also deactivate all submenu items in non-matching parents
          if (Array.isArray(menuHolder[i].submenu)) {
            menuHolder[i].submenu.forEach((subItem) => {
              if (!subItem.directMatch) {
                subItem.active = false;
              }
            });
          }
        }
      }
    }
  }

  return { processedMenu: [...menuHolder], dashIcons: dashIconsList.value };
};
