/**
 * Returns a shared portal container for floating UI (modals, dropdowns,
 * tooltips). Teleported content lives outside the app root, so the container
 * carries the isolation class that scopes Tailwind utilities.
 */
const PORTAL_ID = 'fd-kit-portal';

export function usePortalTarget() {
  if (typeof document === 'undefined') {
    return 'body';
  }

  let container = document.getElementById(PORTAL_ID);

  if (!container) {
    container = document.createElement('div');
    container.id = PORTAL_ID;
    container.className = 'flexify-dashboard-isolation font-sans';
    container.style.position = 'static';
    document.body.appendChild(container);
  }

  return `#${PORTAL_ID}`;
}
