import { useMemo, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotify } from '@/react/app/ToastProvider';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { addMonths, firstDayOfWeek, isoDate, monthGrid, sameDay, sameMonth, startOfDay, weekdayNames } from '@/react/form/dates';
import { useMediaQuery } from '@/react/hooks/useMediaQuery';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, Skeleton } from '@/react/ui';
import { canMoveTo, groupByDay, rescheduledDate, type CalendarPost } from '@/react/features/posts/calendar';

/**
 * The editorial calendar: what is published, scheduled and drafted, on the day it is dated.
 *
 * Dragging a scheduled post or a draft to another day reschedules it at the same time of day.
 * On a phone a month grid is seven columns of nothing, so the same month is a list of days.
 */

const STATUS_STYLES: Record<string, { label: () => string; chip: string }> = {
	publish: { label: () => __('Published'), chip: 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500' },
	future: { label: () => __('Scheduled'), chip: 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' },
	draft: { label: () => __('Draft'), chip: 'border-gray-400 bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300' },
	pending: { label: () => __('Pending'), chip: 'border-warning-500 bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400' },
};

const MAX_IN_CELL = 3;
const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const timeLabel = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const titleOf = (post: CalendarPost) => decodeHtml(stripTags(post.title.raw ?? post.title.rendered)) || __('(No title)');

type Props = {
	restBase: string;
};

export const PostsCalendar = ({ restBase }: Props) => {
	const rest = useRest();
	const { adminUrl } = useWpData();
	const { notify } = useNotify();
	const queryClient = useQueryClient();
	const narrow = useMediaQuery('(max-width: 767px)');
	const weekStartsOn = useMemo(() => firstDayOfWeek(), []);
	const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
	const [dragging, setDragging] = useState<CalendarPost | null>(null);
	const [overDay, setOverDay] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<string | null>(null);

	const days = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
	const weekdays = useMemo(() => weekdayNames(weekStartsOn), [weekStartsOn]);
	const today = startOfDay(new Date());
	const range = { after: `${isoDate(days[0])}T00:00:00`, before: `${isoDate(days[days.length - 1])}T23:59:59` };
	const key = ['posts-calendar', restBase, range.after];

	const posts = useQuery({
		queryKey: key,
		queryFn: async ({ signal }) =>
			(
				await rest.list<CalendarPost>(
					`wp/v2/${restBase}`,
					{ ...range, status: 'publish,future,draft,pending', per_page: 100, context: 'edit', _fields: 'id,title,status,date,link' },
					signal
				)
			).data ?? [],
		placeholderData: (previous) => previous,
	});

	const move = useMutation({
		mutationFn: ({ post, day }: { post: CalendarPost; day: Date }) => rest.post<CalendarPost>(`wp/v2/${restBase}/${post.id}`, { date: rescheduledDate(post.date, day) }),
		onSuccess: (_result, { post, day }) => {
			notify({ tone: 'success', title: sprintf(__('“%1$s” moved to %2$s'), titleOf(post), dayLabel.format(day)) });
			queryClient.invalidateQueries({ queryKey: ['posts-calendar'] });
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (error: Error) => notify({ tone: 'error', title: error.message }),
	});

	const byDay = useMemo(() => groupByDay(posts.data ?? []), [posts.data]);

	const drop = (event: DragEvent<HTMLElement>, day: Date) => {
		event.preventDefault();
		setOverDay(null);

		if (dragging && canMoveTo(dragging, day, today)) {
			move.mutate({ post: dragging, day });
		}

		setDragging(null);
	};

	const chip = (post: CalendarPost) => {
		const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

		return (
			<a
				key={post.id}
				href={`${adminUrl}post.php?post=${post.id}&action=edit`}
				draggable={post.status !== 'publish' && post.status !== 'private'}
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = 'move';
					event.dataTransfer.setData('text/plain', String(post.id));
					setDragging(post);
				}}
				onDragEnd={() => {
					setDragging(null);
					setOverDay(null);
				}}
				title={`${style.label()} · ${timeLabel.format(new Date(post.date))}`}
				className={cn('block truncate rounded-sm border-s-2 px-1.5 py-0.5 text-theme-xs font-medium', style.chip, dragging?.id === post.id && 'opacity-40')}
			>
				{titleOf(post)}
			</a>
		);
	};

	const header = (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" icon="chevron_left" iconOnly aria-label={__('Previous month')} onClick={() => setMonth(addMonths(month, -1))} />
				<Button variant="outline" size="sm" icon="chevron_right" iconOnly aria-label={__('Next month')} onClick={() => setMonth(addMonths(month, 1))} />
				<h3 className="ms-2 text-theme-md font-semibold text-gray-800 first-letter:uppercase dark:text-white/90" aria-live="polite">
					{monthLabel.format(month)}
				</h3>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<ul className="hidden flex-wrap items-center gap-3 sm:flex">
					{Object.entries(STATUS_STYLES).map(([status, style]) => (
						<li key={status} className={cn('rounded-sm border-s-2 px-1.5 text-theme-xs', style.chip)}>
							{style.label()}
						</li>
					))}
				</ul>
				<Button variant="outline" size="sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
					{__('Today')}
				</Button>
			</div>
		</div>
	);

	if (narrow) {
		const listed = days.filter((day) => sameMonth(day, month) && byDay[isoDate(day)]?.length);

		return (
			<Card padding="none">
				{header}
				{posts.isLoading ? (
					<div className="space-y-3 p-5">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : !listed.length ? (
					<p className="px-5 py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing dated in this month.')}</p>
				) : (
					<ul className="divide-y divide-gray-100 dark:divide-gray-800">
						{listed.map((day) => (
							<li key={isoDate(day)} className="px-5 py-3">
								<p className={cn('mb-2 text-theme-xs font-medium first-letter:uppercase', sameDay(day, today) ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400')}>{dayLabel.format(day)}</p>
								<div className="flex flex-col gap-1.5">{byDay[isoDate(day)].map(chip)}</div>
							</li>
						))}
					</ul>
				)}
			</Card>
		);
	}

	return (
		<Card padding="none">
			{header}
			<div role="grid" aria-label={monthLabel.format(month)} aria-busy={posts.isFetching}>
				<div role="row" className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
					{weekdays.map((weekday) => (
						<span key={weekday.long} role="columnheader" aria-label={weekday.long} className="py-2 text-center text-theme-xs font-medium uppercase text-gray-400">
							{weekday.short}
						</span>
					))}
				</div>
				{Array.from({ length: 6 }, (_, week) => (
					<div key={week} role="row" className="grid grid-cols-7">
						{days.slice(week * 7, week * 7 + 7).map((day) => {
							const iso = isoDate(day);
							const items = byDay[iso] ?? [];
							const open = expanded === iso;
							const shown = open ? items : items.slice(0, MAX_IN_CELL);
							const accepts = Boolean(dragging && canMoveTo(dragging, day, today));

							return (
								<div
									key={iso}
									role="gridcell"
									onDragOver={(event) => {
										if (accepts) {
											event.preventDefault();
											setOverDay(iso);
										}
									}}
									onDragLeave={(event) => (!event.currentTarget.contains(event.relatedTarget as Node | null) ? setOverDay(null) : undefined)}
									onDrop={(event) => drop(event, day)}
									className={cn(
										'min-h-28 border-e border-b border-gray-100 p-1.5 transition-colors last:border-e-0 dark:border-gray-800',
										!sameMonth(day, month) && 'bg-gray-50/60 dark:bg-white/[0.01]',
										overDay === iso && 'bg-brand-50 dark:bg-brand-500/10',
										dragging && !accepts && 'opacity-60'
									)}
								>
									<span
										className={cn(
											'mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-theme-xs',
											sameDay(day, today) ? 'bg-brand-500 font-semibold text-white' : sameMonth(day, month) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
										)}
									>
										{day.getDate()}
									</span>
									<div className="flex flex-col gap-1">{shown.map(chip)}</div>
									{items.length > MAX_IN_CELL ? (
										<button
											type="button"
											onClick={() => setExpanded(open ? null : iso)}
											className="mt-1 px-1.5 text-theme-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
										>
											{open ? __('Show less') : sprintf(__('+%d more'), items.length - MAX_IN_CELL)}
										</button>
									) : null}
								</div>
							);
						})}
					</div>
				))}
			</div>
		</Card>
	);
};
