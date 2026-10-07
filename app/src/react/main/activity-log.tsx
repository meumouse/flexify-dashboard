import '@/apps/css/activity-log.css';

import { mountApp } from '@/react/app/mount';
import { ActivityApp } from '@/react/features/activity/ActivityApp';

mountApp('fd-activity-log-page', <ActivityApp />, '#fd-activity-log-script');
