import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppProviders } from '@/react/app/AppProviders';
import { PostsCalendar } from '@/react/features/posts/PostsCalendar';
import { canMoveTo, groupByDay, rescheduledDate, type CalendarPost } from '@/react/features/posts/calendar';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: '',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'n',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 1,
	userName: 'Maria',
	userEmail: '',
	userRoles: ['administrator'],
	canManageOptions: true,
	currentUser: null,
	settings: {},
	page: {},
};

const post = (id: number, status: string, date: string, title = `Post ${id}`): CalendarPost => ({ id, status, date, title: { rendered: title } });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('calendar arithmetic', () => {
	it('groups posts by their day, earliest first', () => {
		const days = groupByDay([post(1, 'future', '2026-10-10T15:00:00'), post(2, 'draft', '2026-10-10T08:00:00'), post(3, 'publish', '2026-10-02T09:00:00')]);

		expect(Object.keys(days).sort()).toEqual(['2026-10-02', '2026-10-10']);
		expect(days['2026-10-10'].map((entry) => entry.id)).toEqual([2, 1]);
	});

	it('keeps the time of day when a post moves to another day', () => {
		expect(rescheduledDate('2026-10-10T15:30:00', new Date(2026, 9, 14))).toBe('2026-10-14T15:30:00');
	});

	it('moves scheduled posts and drafts forward, never published ones or into the past', () => {
		const today = new Date(2026, 9, 8);

		expect(canMoveTo(post(1, 'future', '2026-10-10T09:00:00'), new Date(2026, 9, 12), today)).toBe(true);
		expect(canMoveTo(post(2, 'draft', '2026-10-10T09:00:00'), new Date(2026, 9, 8), today)).toBe(true);
		expect(canMoveTo(post(3, 'future', '2026-10-10T09:00:00'), new Date(2026, 9, 7), today)).toBe(false);
		expect(canMoveTo(post(4, 'publish', '2026-10-01T09:00:00'), new Date(2026, 9, 20), today)).toBe(false);
		expect(canMoveTo(post(5, 'future', '2026-10-10T09:00:00'), new Date(2026, 9, 10), today)).toBe(false);
	});
});

describe('editorial calendar', () => {
	it('puts each post on its day and reschedules one dropped on another', async () => {
		// Only Date is faked: the queries still need real timers to settle.
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 9, 8, 12));
		const writes: { url: string; body: unknown }[] = [];

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				if (init?.method === 'POST') {
					writes.push({ url: String(input), body: JSON.parse(String(init.body)) });

					return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
				}

				const posts = [post(7, 'future', '2026-10-10T10:00:00', 'Lançamento da coleção')];

				return new Response(JSON.stringify(posts), { status: 200, headers: { 'Content-Type': 'application/json', 'X-WP-Total': '1' } });
			})
		);

		const { container } = render(
			<AppProviders wpData={wpData}>
				<PostsCalendar restBase="posts" />
			</AppProviders>
		);

		const chip = await screen.findByText('Lançamento da coleção');
		fireEvent.dragStart(chip, { dataTransfer: { setData: () => {}, effectAllowed: '' } });

		const cell = [...container.querySelectorAll<HTMLElement>('[role="gridcell"]')].find((element) => element.textContent?.startsWith('14')) as HTMLElement;

		fireEvent.dragOver(cell, { dataTransfer: { dropEffect: '' } });
		fireEvent.drop(cell, { dataTransfer: {} });

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0].url).toContain('wp/v2/posts/7');
		expect(writes[0].body).toEqual({ date: '2026-10-14T10:00:00' });
	});
});
