import '@/apps/css/dashboard.css';

import { PageShell } from '@/react/app/PageShell';
import { mountApp } from '@/react/app/mount';
import { DashboardPage } from '@/react/features/dashboard/DashboardPage';
import { registerDashboardCards } from '@/react/features/dashboard/cards/register';

registerDashboardCards();

mountApp(
	'fd-dashboard-page',
	<PageShell width="full">
		<DashboardPage />
	</PageShell>,
	'#fd-dashboard-script'
);
