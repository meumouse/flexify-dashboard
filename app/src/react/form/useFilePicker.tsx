import { useCallback, useRef, type ReactElement } from 'react';

export type FilePickerOptions = {
	/** `accept` of the input, e.g. `.csv,text/csv`. */
	accept?: string;
	multiple?: boolean;
	onPick: (files: FileList) => void;
};

export type FilePicker = {
	/** Opens the system file dialog. */
	open: () => void;
	/** Render this somewhere in the tree; it draws nothing. */
	picker: ReactElement;
};

/**
 * Choosing a file from a button, without a file input in the screen.
 *
 * A file dialog can only be opened by clicking a real `<input type="file">`, so four screens
 * each kept a hidden one next to their own button — the same ref, the same reset of `value`
 * so that picking the same file twice still fires. That input belongs to the kit, and this
 * is the one copy of it.
 */
export const useFilePicker = ({ accept, multiple = false, onPick }: FilePickerOptions): FilePicker => {
	const input = useRef<HTMLInputElement>(null);

	const open = useCallback(() => input.current?.click(), []);

	const picker = (
		<input
			ref={input}
			type="file"
			accept={accept}
			multiple={multiple}
			className="hidden"
			aria-hidden
			tabIndex={-1}
			onChange={(event) => {
				const { files } = event.target;

				// Cleared before the handler runs, so picking the same file again still fires a change.
				event.target.value = '';

				if (files && files.length > 0) {
					onPick(files);
				}
			}}
		/>
	);

	return { open, picker };
};
