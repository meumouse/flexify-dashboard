import { isoDate, startOfDay } from '@/react/form/dates';

/**
 * The arithmetic of the editorial calendar.
 *
 * Post dates come from the REST API as the site's local time with no zone
 * (`2026-10-08T09:30:00`), which is also what it takes back. They stay strings: turning them into
 * `Date` would put them in the browser's zone, and a post scheduled for 9:30 in São Paulo would
 * move when the editor opened the calendar from Lisbon.
 */

export type CalendarPost = {
	id: number;
	title: { raw?: string; rendered: string };
	status: string;
	date: string;
	link?: string;
};

/** The posts of each day, keyed `YYYY-MM-DD`, earliest first. */
export const groupByDay = (posts: CalendarPost[]): Record<string, CalendarPost[]> => {
	const days: Record<string, CalendarPost[]> = {};

	[...posts]
		.sort((a, b) => a.date.localeCompare(b.date))
		.forEach((post) => {
			const day = post.date.slice(0, 10);

			(days[day] ??= []).push(post);
		});

	return days;
};

/** The same time of day, on another day: what dragging a post to a cell means. */
export const rescheduledDate = (original: string, day: Date): string => `${isoDate(day)}${original.slice(10) || 'T09:00:00'}`;

/**
 * Whether a post may be dropped on a day.
 *
 * A published post keeps its date: moving it would change what readers already saw, and its
 * address when the permalink has the date in it. Nothing goes into the past, because a scheduled
 * post moved to yesterday is published on the spot.
 */
export const canMoveTo = (post: CalendarPost, day: Date, today = new Date()): boolean => {
	if (post.status === 'publish' || post.status === 'private') {
		return false;
	}

	return startOfDay(day) >= startOfDay(today) && post.date.slice(0, 10) !== isoDate(day);
};
