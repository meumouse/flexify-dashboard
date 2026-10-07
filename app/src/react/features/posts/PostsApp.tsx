import { HashRouter } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PostsList } from '@/react/features/posts/PostsList';

/**
 * The posts screen has one view; the router is here so the filters can live in the address
 * bar the same way they do on the other screens.
 */
export const PostsApp = () => (
	<HashRouter>
		<PageShell width="full">
			<PostsList />
		</PageShell>
	</HashRouter>
);
