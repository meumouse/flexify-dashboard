import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { BackgroundColor } from '@/shared/rich-text/tiptapColorExtensions.js';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { useMediaPicker } from '@/react/app/MediaPickerProvider';
import { Button, DropdownMenu, Icon, Input, Modal, Popover, Tooltip, type MenuItem } from '@/react/ui';

/**
 * Rich text editor used by the product descriptions.
 *
 * Same Tiptap extensions as the Vue editor, so both produce the same HTML.
 */

type Props = {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
	className?: string;
	/** Minimum height of the writing area */
	minHeight?: string;
};

const TEXT_COLORS = ['#1d2939', '#475467', '#008aff', '#12b76a', '#f79009', '#f04438', '#7a5af8'];
const HIGHLIGHTS = ['#fef0c7', '#d1fadf', '#d1e9ff', '#fee4e2', '#eaecf0'];

const toolbarButton = (active: boolean) =>
	cn(
		'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:shadow-focus-ring focus-visible:outline-hidden disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200',
		active && 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
	);

const ToolbarButton = ({ icon, label, active = false, disabled = false, onClick }: { icon: string; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) => (
	<Tooltip text={label}>
		<button type="button" className={toolbarButton(active)} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
			<Icon name={icon} className="text-theme-md" />
		</button>
	</Tooltip>
);

const Swatches = ({ colors, onPick, onClear, clearLabel }: { colors: string[]; onPick: (color: string) => void; onClear: () => void; clearLabel: string }) => (
	<div className="flex max-w-44 flex-wrap gap-1.5 p-2">
		{colors.map((color) => (
			<button
				key={color}
				type="button"
				className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700"
				style={{ backgroundColor: color }}
				aria-label={color}
				onClick={() => onPick(color)}
			/>
		))}
		<button type="button" className="h-6 rounded-full border border-gray-200 px-2 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400" onClick={onClear}>
			{clearLabel}
		</button>
	</div>
);

const Divider = () => <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />;

export const RichText = ({ value, onChange, placeholder, className, minHeight = '12rem' }: Props) => {
	const pickMedia = useMediaPicker();
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState('');

	const editor = useEditor({
		extensions: [
			// StarterKit already ships Link; the standalone extension is configured here instead.
			StarterKit.configure({ link: false }),
			ImageResize,
			TextStyle,
			Color,
			BackgroundColor,
			Link,
			Image.configure({ HTMLAttributes: { class: 'editor-image' } }),
			TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
			Placeholder.configure({ placeholder: placeholder || __('Write something…') }),
		],
		content: value,
		onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
	});

	// Content set from the outside (loading a product) must not fight what is being typed.
	useEffect(() => {
		if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
			editor.commands.setContent(value, { emitUpdate: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	if (!editor) {
		return null;
	}

	const chain = () => editor.chain().focus();

	const headingItems: MenuItem[] = [
		{ label: __('Paragraph'), onSelect: () => chain().setParagraph().run() },
		...[1, 2, 3, 4, 5, 6].map((level) => ({
			label: `${__('Heading')} ${level}`,
			onSelect: () => chain().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run(),
		})),
	];

	const addImage = async () => {
		const [image] = await pickMedia({ title: __('Select image'), button: __('Use image') });

		if (image) {
			chain().setImage({ src: image.url, alt: image.alt }).run();
		}
	};

	const openLink = () => {
		setLinkUrl(editor.getAttributes('link').href ?? '');
		setLinkOpen(true);
	};

	const applyLink = () => {
		const href = linkUrl.trim();

		if (href) {
			chain().setLink({ href }).run();
		} else {
			chain().unsetLink().run();
		}

		setLinkOpen(false);
	};

	const heading = ([1, 2, 3, 4, 5, 6] as const).find((level) => editor.isActive('heading', { level }));

	return (
		<div className={cn('overflow-hidden rounded-xl border border-gray-300 focus-within:border-brand-300 dark:border-gray-700', className)}>
			<style>{`.fd-richtext .ProseMirror{min-height:${minHeight};outline:none}.fd-richtext .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;height:0;pointer-events:none;color:rgb(var(--fd-base-400))}.fd-richtext .editor-image{max-width:100%;height:auto}`}</style>

			<div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-800 dark:bg-white/[0.02]">
				<DropdownMenu
					items={headingItems}
					align="start"
					width="w-44"
					trigger={
						<button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2 text-theme-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]">
							{heading ? `${__('Heading')} ${heading}` : __('Paragraph')}
							<Icon name="expand_more" className="text-theme-md" />
						</button>
					}
				/>
				<Divider />
				<ToolbarButton icon="format_bold" label={__('Bold')} active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
				<ToolbarButton icon="format_italic" label={__('Italic')} active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
				<ToolbarButton icon="format_strikethrough" label={__('Strikethrough')} active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
				<ToolbarButton icon="code" label={__('Inline code')} active={editor.isActive('code')} onClick={() => chain().toggleCode().run()} />
				<Divider />
				<ToolbarButton icon="format_list_bulleted" label={__('Bullet list')} active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
				<ToolbarButton icon="format_list_numbered" label={__('Numbered list')} active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
				<ToolbarButton icon="format_quote" label={__('Quote')} active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} />
				<Divider />
				<ToolbarButton icon="format_align_left" label={__('Align left')} active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()} />
				<ToolbarButton icon="format_align_center" label={__('Align center')} active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()} />
				<ToolbarButton icon="format_align_right" label={__('Align right')} active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()} />
				<ToolbarButton icon="format_align_justify" label={__('Justify')} active={editor.isActive({ textAlign: 'justify' })} onClick={() => chain().setTextAlign('justify').run()} />
				<Divider />
				<ToolbarButton icon="link" label={__('Link')} active={editor.isActive('link')} onClick={openLink} />
				<ToolbarButton icon="image" label={__('Insert image')} onClick={addImage} />
				<Popover
					trigger={
						<button type="button" className={toolbarButton(editor.isActive('textStyle'))} aria-label={__('Text color')}>
							<Icon name="format_color_text" className="text-theme-md" />
						</button>
					}
				>
					<Swatches colors={TEXT_COLORS} clearLabel={__('Default')} onPick={(color) => chain().setColor(color).run()} onClear={() => chain().unsetColor().run()} />
				</Popover>
				<Popover
					trigger={
						<button type="button" className={toolbarButton(editor.isActive('backgroundColor'))} aria-label={__('Highlight color')}>
							<Icon name="format_color_fill" className="text-theme-md" />
						</button>
					}
				>
					<Swatches
						colors={HIGHLIGHTS}
						clearLabel={__('None')}
						onPick={(color) => chain().setMark('backgroundColor', { color }).run()}
						onClear={() => chain().unsetMark('backgroundColor').run()}
					/>
				</Popover>
				<Divider />
				<ToolbarButton icon="undo" label={__('Undo')} disabled={!editor.can().undo()} onClick={() => chain().undo().run()} />
				<ToolbarButton icon="redo" label={__('Redo')} disabled={!editor.can().redo()} onClick={() => chain().redo().run()} />
			</div>

			<div className="fd-richtext bg-transparent px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
				<EditorContent editor={editor} />
			</div>

			<Modal
				open={linkOpen}
				onOpenChange={setLinkOpen}
				size="sm"
				title={__('Link')}
				footer={
					<>
						<Button variant="outline" onClick={() => setLinkOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button type="submit" form="fd-richtext-link">
							{__('Apply')}
						</Button>
					</>
				}
			>
				<form
					id="fd-richtext-link"
					onSubmit={(event) => {
						event.preventDefault();
						applyLink();
					}}
				>
					<Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} label={__('URL')} placeholder="https://" hint={__('Leave empty to remove the link.')} />
				</form>
			</Modal>
		</div>
	);
};
