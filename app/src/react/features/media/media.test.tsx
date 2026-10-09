import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { MediaLibrary } from '@/react/features/media/MediaLibrary';
import { fileNameOf, formatBytes, typeBreakdown, type MediaItem } from '@/react/features/media/queries';
import { NO_EDITS, cropFromCanvas, fitWithin, hasEdits, keepRatio, rectBetween } from '@/react/features/media/imageEdits';
import type { WpData } from '@/react/types/wordpress';
import { openFilters } from '../../../../tests/filters';

const wpData: WpData = {
	pluginBase: '',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'nonce-1',
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

const file = (id: number, name: string, mime: string, size: number): MediaItem => ({
	id,
	slug: name,
	title: { rendered: name, raw: name },
	alt_text: '',
	caption: { rendered: '', raw: '' },
	description: { rendered: '', raw: '' },
	source_url: `https://site.test/uploads/${name}`,
	mime_type: mime,
	date: '2026-09-20T10:00:00',
	modified: '2026-09-20T10:00:00',
	author: 1,
	link: '#',
	media_details: { file: `2026/09/${name}`, filesize: size, width: 1600, height: 1067, sizes: {} },
});

const library = [file(700, 'praia.jpg', 'image/jpeg', 184_320), file(701, 'catalogo.pdf', 'application/pdf', 942_080)];

const stubFetch = (onRequest?: (url: string, init?: RequestInit) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			onRequest?.(url, init);

			const body = url.includes('media/tags') ? [] : library;

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(library.length), 'X-WP-TotalPages': '1' },
			});
		})
	);

const renderLibrary = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<MediaLibrary />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('media helpers', () => {
	it('names a file by what it is called on disk', () => {
		expect(fileNameOf(library[0])).toBe('praia.jpg');
	});

	it('writes a size the way a person reads one', () => {
		expect(formatBytes(0)).toBe('—');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(184_320)).toBe('180.0 KB');
		expect(formatBytes(5_242_880)).toBe('5.0 MB');
	});
});

describe('image edits', () => {
	it('centres an image inside the canvas without stretching it', () => {
		const placed = fitWithin({ width: 1000, height: 500 }, { width: 900, height: 600 });

		expect(placed.width).toBe(900);
		expect(placed.height).toBe(450);
		expect(placed.x).toBe(0);
		expect(placed.y).toBe(75);
	});

	it('turns a rectangle on the canvas into one in the image', () => {
		// The image fills the canvas's width and is centred vertically, so a selection that
		// starts where the image starts is the top-left corner of the image.
		const crop = cropFromCanvas({ x: 0, y: 75, width: 450, height: 225 }, { width: 1000, height: 500 }, { width: 900, height: 600 });

		expect(crop).toEqual({ x: 0, y: 0, width: 500, height: 250 });
	});

	it('refuses a selection that misses the image', () => {
		expect(cropFromCanvas({ x: 0, y: 0, width: 2, height: 2 }, { width: 1000, height: 500 }, { width: 900, height: 600 })).toBeNull();
	});

	it('builds the same rectangle whichever way it was dragged', () => {
		expect(rectBetween({ x: 10, y: 10 }, { x: 40, y: 50 })).toEqual(rectBetween({ x: 40, y: 50 }, { x: 10, y: 10 }));
	});

	it('keeps the shape when one side is resized', () => {
		expect(keepRatio(800, { width: 1600, height: 1067 }, 'width')).toBe(534);
		expect(keepRatio(534, { width: 1600, height: 1067 }, 'height')).toBe(801);
	});

	it('knows when nothing has been changed', () => {
		expect(hasEdits(NO_EDITS)).toBe(false);
		expect(hasEdits({ ...NO_EDITS, brightness: 10 })).toBe(true);
		expect(hasEdits({ ...NO_EDITS, rotation: 90 })).toBe(true);
	});
});

describe('media library', () => {
	it('shows what is in the library', async () => {
		stubFetch();
		renderLibrary();

		expect(await screen.findByText('praia.jpg')).toBeInTheDocument();
		expect(screen.getByText('catalogo.pdf')).toBeInTheDocument();
	});

	it('asks only for the chosen type', async () => {
		const user = userEvent.setup();
		const urls: string[] = [];

		stubFetch((url) => urls.push(url));
		renderLibrary();

		await screen.findByText('praia.jpg');
		await user.click(screen.getByRole('tab', { name: 'Images' }));

		await waitFor(() => expect(urls.some((url) => url.includes('media_type=image'))).toBe(true));
	});

	it('asks the unused filter of the server, not of the page', async () => {
		const user = userEvent.setup();
		const urls: string[] = [];

		stubFetch((url) => urls.push(url));
		renderLibrary();

		await screen.findByText('praia.jpg');
		await openFilters(user);
		await user.click(await screen.findByRole('switch', { name: 'Unused only' }));

		await waitFor(() => expect(urls.some((url) => url.includes('unused=true') && url.includes('unused_mode=deep'))).toBe(true));
	});
});

describe('media overview', () => {
	it('counts the library by the kinds its tabs use', () => {
		const counts = typeBreakdown([
			{ file_type: 'image', count: '120' },
			{ file_type: 'application', count: '14' },
			{ file_type: 'text', count: 2 },
			{ file_type: 'video', count: '3' },
			{ file_type: 'model', count: '1' },
		]);

		expect(counts).toEqual({ image: 120, video: 3, audio: 0, document: 16, other: 1 });
	});
});
