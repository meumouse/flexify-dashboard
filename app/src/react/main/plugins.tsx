import '@/apps/css/plugins.css';

import { mountApp } from '@/react/app/mount';
import { PluginsApp } from '@/react/features/plugins/PluginsApp';

mountApp('fd-plugins-page', <PluginsApp />, '#fd-plugins-script');
