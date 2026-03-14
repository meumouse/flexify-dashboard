import { addFilter } from '@/assets/js/functions/HooksSystem.js';

// Default toolbar buttons
import screenOptionsButton from '@/buttons/screen-options/index.js';
import helpButton from '@/buttons/help/index.js';
import viewSiteButton from '@/buttons/view-site/index.js';


// Register right-side toolbar buttons
addFilter('flexify-dashboard/toolbar/render/right', (components) => {
  return [
    ...components,
    screenOptionsButton,
    helpButton,
    viewSiteButton,
  ];
});

