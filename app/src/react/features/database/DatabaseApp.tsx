import { HashRouter } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { DatabaseExplorer } from '@/react/features/database/DatabaseExplorer';

/** The database explorer. One view, with the chosen table in the address bar. */
export const DatabaseApp = () => (
	<HashRouter>
		<PageShell width="full">
			<DatabaseExplorer />
		</PageShell>
	</HashRouter>
);
