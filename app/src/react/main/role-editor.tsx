import '@/apps/css/role-editor.css';

import { mountApp } from '@/react/app/mount';
import { RolesApp } from '@/react/features/roles/RolesApp';

mountApp('fd-role-editor-page', <RolesApp />, '#fd-role-editor-script');
