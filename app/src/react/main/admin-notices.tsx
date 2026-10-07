import '@/apps/css/admin-notices.css';

import { mountApp } from '@/react/app/mount';
import { NoticesApp } from '@/react/features/notices/NoticesApp';

mountApp('flexify-dashboard-admin-notices-app', <NoticesApp />, '#fd-admin-notices-script');
