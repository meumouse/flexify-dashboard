import '@/apps/css/dashboard.css';

import { PageShell } from '@/react/app/PageShell';
import { mountApp } from '@/react/app/mount';
import { StoreDashboard } from '@/react/features/dashboard/StoreDashboard';

mountApp(
	'fd-dashboard-page',
	<PageShell>
		<StoreDashboard />
	</PageShell>,
	'#fd-dashboard-script'
);
