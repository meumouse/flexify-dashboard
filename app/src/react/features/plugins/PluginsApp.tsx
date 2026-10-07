import { HashRouter } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PluginsList } from '@/react/features/plugins/PluginsList';

/** The plugins screen. One view, with the filters in the address bar. */
export const PluginsApp = () => (
	<HashRouter>
		<PageShell width="full">
			<PluginsList />
		</PageShell>
	</HashRouter>
);
