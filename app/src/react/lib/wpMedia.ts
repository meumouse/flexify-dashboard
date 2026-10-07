import { __ } from '@/react/lib/i18n';

/**
 * Open the native WordPress media modal and resolve with the selected files.
 *
 * The modal lives outside React, so this wraps it in a promise the components can await.
 */

export type MediaItem = {
	id: number;
	src: string;
	url: string;
	title: string;
	alt: string;
};

type Attachment = {
	id: number;
	url: string;
	title?: string;
	filename?: string;
	alt?: string;
	sizes?: { medium?: { url: string }; thumbnail?: { url: string } };
};

type MediaFrame = {
	on: (event: string, callback: () => void) => void;
	open: () => void;
	state: () => { get: (key: string) => { toJSON: () => Attachment[] } };
};

type Options = {
	title?: string;
	button?: string;
	multiple?: boolean;
	/** Media type to list; an empty string allows every file */
	type?: string;
	/** Called when the media library is not available on this screen */
	onUnavailable?: () => void;
};

export const openMediaFrame = ({ title, button, multiple = false, type = 'image', onUnavailable }: Options = {}): Promise<MediaItem[]> =>
	new Promise((resolve) => {
		const media = (window as unknown as { wp?: { media?: (options: unknown) => MediaFrame } }).wp?.media;

		if (!media) {
			onUnavailable?.();
			resolve([]);
			return;
		}

		const frame = media({
			title: title || __('Select image'),
			button: { text: button || __('Use image') },
			library: type ? { type } : {},
			multiple: multiple ? 'add' : false,
		});

		let selected = false;

		frame.on('select', () => {
			selected = true;

			resolve(
				frame
					.state()
					.get('selection')
					.toJSON()
					.map((attachment) => ({
						id: attachment.id,
						src: attachment.sizes?.medium?.url || attachment.sizes?.thumbnail?.url || attachment.url,
						url: attachment.url,
						title: attachment.title || attachment.filename || '',
						alt: attachment.alt || '',
					}))
			);
		});

		frame.on('close', () => {
			// "select" fires before "close"; resolve empty only when the modal was dismissed.
			setTimeout(() => {
				if (!selected) {
					resolve([]);
				}
			}, 0);
		});

		frame.open();
	});
