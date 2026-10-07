// The settings schema is shared JavaScript that calls a global `__` as it is evaluated, so
// the globals go in before anything that reads it.
import '@/react/lib/wp-globals';

import '@/apps/css/settings.css';

import { mountApp } from '@/react/app/mount';
import { SettingsApp } from '@/react/features/settings/SettingsApp';

mountApp('fd-settings-app', <SettingsApp />, '#fd-settings-script');
