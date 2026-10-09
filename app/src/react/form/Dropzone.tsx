import { useState, type DragEvent } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { useFilePicker } from '@/react/form/useFilePicker';
import { Icon } from '@/react/ui/Icon';
import { hintClasses } from '@/react/ui/recipes';

/**
 * Whether a file matches an `accept` list such as `.csv,text/csv` or `image/*`.
 *
 * The file dialog filters by `accept` on its own; a drop does not, so a dropped file is checked
 * here. Extension or type is enough, because browsers disagree on the type of a CSV.
 */
export const acceptsFile = (file: { name: string; type: string }, accept?: string): boolean => {
	if (!accept) {
		return true;
	}

	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();

	return accept
		.split(',')
		.map((rule) => rule.trim().toLowerCase())
		.filter(Boolean)
		.some((rule) => {
			if (rule.startsWith('.')) {
				return name.endsWith(rule);
			}

			if (rule.endsWith('/*')) {
				return type.startsWith(rule.slice(0, -1));
			}

			return type === rule;
		});
};

type Props = {
	onFile: (file: File) => void;
	/** Same format as the file input's `accept` */
	accept?: string;
	title: string;
	/** What is expected, such as "CSV, first row with the column headings" */
	hint?: string;
};

/** An area that takes a file dragged onto it, or opens the file dialog when clicked. */
export const Dropzone = ({ onFile, accept, title, hint }: Props) => {
	const [over, setOver] = useState(false);
	const [refused, setRefused] = useState(false);

	const take = (files: File[]) => {
		const accepted = files.filter((file) => acceptsFile(file, accept));

		setRefused(files.length > 0 && accepted.length === 0);

		if (accepted.length) {
			onFile(accepted[0]);
		}
	};

	const picker = useFilePicker({ accept, onPick: (files) => take(Array.from(files)) });

	const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		setOver(true);
	};

	// Leaving the button for one of its own children also fires a leave; only leaving it counts.
	const onDragLeave = (event: DragEvent<HTMLButtonElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setOver(false);
		}
	};

	const onDrop = (event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		setOver(false);
		take(Array.from(event.dataTransfer.files));
	};

	return (
		<div>
			{picker.picker}
			<button
				type="button"
				onClick={picker.open}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={cn(
					'flex w-full flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors focus:outline-hidden focus-visible:shadow-focus-ring lg:py-10',
					over
						? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
						: 'border-gray-300 bg-gray-50 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500'
				)}
			>
				<span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
					<Icon name="upload_file" className="text-title-xs" />
				</span>
				<span className="mb-1 text-theme-md font-semibold text-gray-800 dark:text-white/90">{over ? __('Drop to add') : title}</span>
				{hint ? <span className="mb-3 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">{hint}</span> : null}
				<span className="text-theme-sm font-medium text-brand-500 underline">{__('Browse files')}</span>
			</button>
			{refused ? <p className={hintClasses.error}>{__('That type of file is not accepted here.')}</p> : null}
		</div>
	);
};
