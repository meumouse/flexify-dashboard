import '@/apps/css/users.css';

import { mountApp } from '@/react/app/mount';
import { UsersApp } from '@/react/features/users/UsersApp';

mountApp('fd-users-page', <UsersApp />, '#fd-users-script');
