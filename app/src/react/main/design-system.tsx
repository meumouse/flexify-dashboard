import '@/apps/css/design-system.css';

import { PageShell } from '@/react/app/PageShell';
import { mountApp } from '@/react/app/mount';
import { FoundationCheck } from '@/react/features/design-system/FoundationCheck';

mountApp(
	'fd-design-system-app',
	<PageShell>
		<FoundationCheck />
	</PageShell>
);
