import '@/apps/css/menu-creator.css';

import { mountApp } from '@/react/app/mount';
import { MenusApp } from '@/react/features/menus/MenusApp';

mountApp('fd-menu-creator-app', <MenusApp />, '#fd-menu-creator-script');
