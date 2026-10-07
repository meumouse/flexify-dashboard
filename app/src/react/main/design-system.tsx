import '@/apps/css/design-system.css';

import { PageShell } from '@/react/app/PageShell';
import { mountApp } from '@/react/app/mount';
import { Showcase } from '@/react/features/design-system/Showcase';

mountApp(
	'fd-design-system-app',
	<PageShell>
		<Showcase />
	</PageShell>
);
