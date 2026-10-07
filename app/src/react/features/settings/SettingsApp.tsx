import { HashRouter } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { SettingsScreen } from '@/react/features/settings/SettingsScreen';

/** The settings screen. The chosen section and the search live in the address bar. */
export const SettingsApp = () => (
	<HashRouter>
		<PageShell width="full">
			<SettingsScreen />
		</PageShell>
	</HashRouter>
);
