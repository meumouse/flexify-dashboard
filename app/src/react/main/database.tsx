import '@/apps/css/database.css';

import { mountApp } from '@/react/app/mount';
import { DatabaseApp } from '@/react/features/database/DatabaseApp';

mountApp('fd-database-page', <DatabaseApp />, '#fd-database-script');
