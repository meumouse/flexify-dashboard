import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Icon } from '@/react/ui';
import { CardEmpty, CardError, CardLoading, StatRow, compactNumber, shortDate, useCardList, useRange, type CardProps } from '@/react/features/dashboard/cards/shared';

/**
 * Cards about what the site publishes: posts, what is queued to go out, and comments.
 */

type Post = {
	id: number;
	title: { rendered: string };
	status: string;
	date: string;
	link: string;
	comment_count?: number;
	_embedded?: { author?: { name: string }[] };
};

const STATUS_COLORS: Record<string, string> = {
	publish: 'text-success-600 dark:text-success-500/80',
	draft: 'text-warning-600 dark:text-warning-400',
	future: 'text-brand-600 dark:text-brand-400',
};

const STATUS_LABELS = (): Record<string, string> => ({
	publish: __('Published'),
	draft: __('Draft'),
	future: __('Scheduled'),
});

const authorOf = (post: Post) => post._embedded?.author?.[0]?.name || __('Unknown author');

export const RecentPostsCard = ({ dateRange }: CardProps) => {
	const { from, to } = useRange(dateRange);

	const { data: posts = [], isLoading, isError } = useCardList<Post>(
		['posts', from.toISOString(), to.toISOString()],
		'wp/v2/posts',
		{ per_page: 10, orderby: 'date', order: 'desc', after: from.toISOString(), before: to.toISOString(), status: 'publish,draft,future', _embed: true }
	);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	const labels = STATUS_LABELS();
	const published = posts.filter((post) => post.status === 'publish').length;
	const drafts = posts.filter((post) => post.status === 'draft').length;

	return (
		<div>
			<StatRow
				stats={[
					{ label: labels.publish, value: String(published), icon: 'check_circle' },
					{ label: labels.draft, value: String(drafts), icon: 'edit' },
					{ label: labels.future, value: String(posts.length - published - drafts), icon: 'calendar_today' },
				]}
			/>

			{!posts.length ? (
				<CardEmpty icon="description" message={__('No posts in this period.')} />
			) : (
				<ul className="space-y-1">
					{posts.map((post) => (
						<li key={post.id} className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
							<div className="min-w-0 flex-1">
								<a href={post.link} target="_blank" rel="noopener noreferrer" className="block">
									<p className="truncate text-theme-sm font-medium text-gray-900 transition-colors group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400">
										{decodeHtml(post.title.rendered)}
									</p>
								</a>
								<p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
									{authorOf(post)} · {shortDate(post.date)}
								</p>
							</div>
							{post.comment_count ? (
								<span className="flex shrink-0 items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
									<Icon name="comment" className="text-theme-xs" />
									{compactNumber(post.comment_count)}
								</span>
							) : null}
							<span className={cn('shrink-0 text-theme-xs font-medium', STATUS_COLORS[post.status] ?? STATUS_COLORS.draft)}>{labels[post.status] ?? post.status}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export const ScheduledPostsCard = ({ dateRange }: CardProps) => {
	const { adminUrl } = useWpData();
	const { fromIso, toIso } = useRange(dateRange);

	const { data: posts = [], isLoading, isError } = useCardList<Post>(
		['scheduled', fromIso, toIso],
		'wp/v2/posts',
		{ status: 'future', after: `${fromIso}T00:00:00`, before: `${toIso}T23:59:59`, per_page: 100, _embed: true }
	);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if (!posts.length) {
		return <CardEmpty icon="calendar_today" message={__('Nothing scheduled for this period.')} />;
	}

	const now = Date.now();

	return (
		<ul className="space-y-1">
			{posts.map((post) => {
				const goesOut = new Date(post.date).getTime();
				const days = Math.ceil((goesOut - now) / 86_400_000);

				return (
					<li key={post.id} className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
							<Icon name="calendar_today" className="text-theme-md" />
						</span>
						<div className="min-w-0 flex-1">
							<a href={`${adminUrl}post.php?post=${post.id}&action=edit`} className="truncate text-theme-sm font-medium text-gray-900 hover:text-brand-600 dark:text-gray-100 dark:hover:text-brand-400">
								{decodeHtml(post.title.rendered)}
							</a>
							<p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
								{shortDate(post.date)}
								{days >= 0 ? ` · ${days === 0 ? __('today') : sprintf(__('in %d day(s)'), days)}` : null}
							</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
};

type Comment = {
	id: number;
	author_name: string;
	content: { rendered: string };
	date: string;
	link: string;
	post?: number;
	status?: string;
};

export const RecentCommentsCard = ({ dateRange }: CardProps) => {
	const { from, to } = useRange(dateRange);

	const { data: comments = [], isLoading, isError } = useCardList<Comment>(
		['comments', from.toISOString(), to.toISOString()],
		'wp/v2/comments',
		{ context: 'edit', per_page: 10, orderby: 'date', order: 'desc', after: from.toISOString(), before: to.toISOString(), status: 'approve', _embed: true }
	);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if (!comments.length) {
		return <CardEmpty icon="forum" message={__('No comments in this period.')} />;
	}

	return (
		<ul className="space-y-1">
			{comments.map((comment) => (
				<li key={comment.id} className="rounded-2xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
					<div className="flex items-center justify-between gap-3">
						<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{comment.author_name}</p>
						<span className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">{shortDate(comment.date)}</span>
					</div>
					{/* The body is what the commenter wrote, as WordPress rendered it. */}
					<p className="mt-1 line-clamp-2 text-theme-xs text-gray-600 dark:text-gray-400">{decodeHtml(comment.content.rendered.replace(/<[^>]*>/g, ''))}</p>
					<a href={comment.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-theme-xs font-medium text-brand-500 hover:text-brand-600">
						{__('View comment')}
					</a>
				</li>
			))}
		</ul>
	);
};
