import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Checkbox, Icon, SearchInput, Skeleton, type RowKey } from '@/react/ui';
import { PostPreview } from '@/react/features/posts/PostPreview';
import type { PostRow, PostView } from '@/react/features/posts/types';

/**
 * The reading layout: the list on one side, one post open on the other. It is the same data
 * as the table, shown the way someone working through a queue of posts wants it.
 */

type Props = {
	posts: PostRow[];
	views: PostView[];
	view: string;
	onView: (view: string) => void;
	search: string;
	onSearch: (search: string) => void;
	selected: RowKey[];
	onSelected: (selected: RowKey[]) => void;
	current: PostRow | null;
	onCurrent: (post: PostRow) => void;
	onUpdate: (post: PostRow, data: Record<string, unknown>, message: string) => void;
	loading: boolean;
	total: number;
	page: number;
	pages: number;
	onPage: (page: number) => void;
	title: string;
	newUrl: string;
	searchPlaceholder: string;
	onTableView: () => void;
	/** Shown over the list while rows are selected */
	bulkBar?: React.ReactNode;
};

const STATUS_DOTS: Record<string, string> = {
	publish: 'bg-success-500',
	future: 'bg-brand-500',
	pending: 'bg-warning-500',
	trash: 'bg-error-500',
};

export const PostsSidebar = ({
	posts,
	views,
	view,
	onView,
	search,
	onSearch,
	selected,
	onSelected,
	current,
	onCurrent,
	onUpdate,
	loading,
	total,
	page,
	pages,
	onPage,
	title,
	newUrl,
	searchPlaceholder,
	onTableView,
	bulkBar,
}: Props) => (
	// The page container already takes the body height and pads it; what is left is what the
	// two panes may fill, so they scroll on their own instead of pushing the page.
	<div className="flex h-[calc(var(--fd-body-height)-2rem)] gap-6 max-md:gap-0 md:h-[calc(var(--fd-body-height)-3rem)]">
		<div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white md:w-96 dark:border-gray-800 dark:bg-white/[0.03]">
			<div className="px-6 pb-4 pt-6">
				<div className="mb-4 flex items-center justify-between gap-2">
					<h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">{title}</h1>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" iconOnly icon="table_chart" onClick={onTableView} aria-label={__('Table view')} />
						<Button href={newUrl} size="sm" iconOnly icon="add" aria-label={__('Add new')} />
					</div>
				</div>

				<SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
			</div>

			<div className="flex items-center gap-1.5 overflow-x-auto px-6 pb-3 hide-scrollbar">
				{views.map((item) => (
					<button
						key={item.value}
						type="button"
						onClick={() => onView(item.value)}
						className={cn(
							'whitespace-nowrap rounded-md px-3 py-1.5 text-theme-xs font-medium transition-colors',
							view === item.value
								? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
						)}
					>
						{decodeHtml(stripTags(item.label))}
					</button>
				))}
			</div>

			<div className="flex items-center justify-between px-6 pb-3 pe-4">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{sprintf(__('%s item(s)'), String(total))}</span>

				<div className="flex items-center gap-1">
					<span className="me-2 text-theme-xs text-gray-500">{sprintf(__('Page %1$s of %2$s'), String(page), String(Math.max(1, pages)))}</span>
					<Button variant="ghost" size="xs" iconOnly icon="chevron_left" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={__('Previous')} />
					<Button variant="ghost" size="xs" iconOnly icon="chevron_right" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={__('Next')} />
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
				{loading && !posts.length ? (
					<div className="space-y-2">
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton key={index} className="h-16 w-full" />
						))}
					</div>
				) : !posts.length ? (
					<div className="p-8 text-center">
						<Icon name="article" className="mx-auto mb-3 text-3xl text-gray-300 dark:text-gray-600" />
						<p className="mb-4 text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing found')}</p>
						<Button href={newUrl} size="sm">
							{__('Add new')}
						</Button>
					</div>
				) : (
					<ul className="space-y-1">
						{posts.map((post) => (
							<li key={post.id}>
								<div
									role="button"
									tabIndex={0}
									onClick={() => onCurrent(post)}
									onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ' ? onCurrent(post) : undefined)}
									className={cn(
										'flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-start transition-colors',
										current?.id === post.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
									)}
								>
									<span className="pt-0.5" onClick={(event) => event.stopPropagation()}>
										<Checkbox
											size="sm"
											checked={selected.includes(post.id)}
											onCheckedChange={(checked) => onSelected(checked ? [...selected, post.id] : selected.filter((id) => id !== post.id))}
											aria-label={sprintf(__('Select %s'), stripTags(post.title?.value ?? ''))}
										/>
									</span>

									<span className="min-w-0 flex-1">
										<span className="block truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">
											{decodeHtml(stripTags(post.title?.value ?? '')) || __('(No title)')}
										</span>
										<span className="mt-1 flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
											<span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOTS[post.status?.value ?? ''] ?? 'bg-gray-400')} />
											<span className="truncate">{stripTags(String(post.date ?? ''))}</span>
										</span>
									</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>

		<div className="flex h-full flex-1 flex-col overflow-hidden rounded-s-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			<PostPreview post={current} onUpdate={onUpdate} />
		</div>

		{bulkBar}
	</div>
);
