import { useCallback, useEffect, useRef, useState } from 'react';
import { applyFiltersToCanvas, type FilterValues } from '@/components/utility/image-editor/src/filters.js';
import { drawVignette } from '@/components/utility/image-editor/src/canvas.js';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Button, Card, Icon, Input, Switch } from '@/react/ui';
import { NO_EDITS, cropFromCanvas, fitWithin, hasEdits, keepRatio, rectBetween, type Edits, type Rect } from '@/react/features/media/imageEdits';

/**
 * Editing an image: turning it, cropping it, resizing it and adjusting how it looks.
 *
 * The pixel work is the plugin's own routines, shared with the Vue editor; what is here is
 * the surface — the canvas, the pointer, and the controls.
 */

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

const SLIDERS: { key: keyof FilterValues; label: string; min: number; max: number; hint?: string }[] = [
	{ key: 'brightness', label: __('Brightness'), min: -100, max: 100 },
	{ key: 'contrast', label: __('Contrast'), min: -100, max: 100 },
	{ key: 'exposure', label: __('Exposure'), min: -100, max: 100 },
	{ key: 'highlights', label: __('Highlights'), min: -100, max: 100 },
	{ key: 'shadows', label: __('Shadows'), min: -100, max: 100 },
	{ key: 'saturation', label: __('Saturation'), min: -100, max: 100 },
	{ key: 'vibrance', label: __('Vibrance'), min: -100, max: 100 },
	{ key: 'hue', label: __('Hue'), min: -180, max: 180 },
	{ key: 'temperature', label: __('Temperature'), min: -100, max: 100, hint: __('Cool ← → Warm') },
	{ key: 'tint', label: __('Tint'), min: -100, max: 100, hint: __('Green ← → Magenta') },
	{ key: 'sharpness', label: __('Sharpness'), min: -100, max: 100, hint: __('Negative blurs, positive sharpens') },
	{ key: 'blur', label: __('Blur'), min: 0, max: 100 },
	{ key: 'grain', label: __('Grain'), min: 0, max: 100 },
	{ key: 'vignette', label: __('Vignette'), min: 0, max: 100 },
];

const RATIOS: { label: string; value: number | null }[] = [
	{ label: __('Free'), value: null },
	{ label: '1:1', value: 1 },
	{ label: '4:3', value: 4 / 3 },
	{ label: '16:9', value: 16 / 9 },
	{ label: '3:2', value: 3 / 2 },
];

type Props = {
	/** The image to edit, already loaded */
	image: HTMLImageElement;
	saving?: boolean;
	onSave: (blob: Blob) => void;
	onCancel: () => void;
};

export const ImageEditor = ({ image, saving = false, onSave, onCancel }: Props) => {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [source, setSource] = useState<HTMLImageElement | HTMLCanvasElement>(image);
	const [edits, setEdits] = useState<Edits>(NO_EDITS);
	const [cropping, setCropping] = useState(false);
	const [ratio, setRatio] = useState<number | null>(null);
	const [selection, setSelection] = useState<Rect | null>(null);
	const [comparing, setComparing] = useState(false);
	const [size, setSize] = useState({ width: image.naturalWidth, height: image.naturalHeight });
	const [lockRatio, setLockRatio] = useState(true);
	const dragFrom = useRef<{ x: number; y: number } | null>(null);

	const draw = useCallback(() => {
		const element = canvas.current;

		if (!element) {
			return;
		}

		const context = element.getContext('2d');

		if (!context) {
			return;
		}

		const shown = comparing ? image : source;
		const placed = fitWithin(shown, element);

		context.clearRect(0, 0, element.width, element.height);
		context.save();
		context.translate(element.width / 2, element.height / 2);

		if (!comparing) {
			context.rotate((edits.rotation * Math.PI) / 180);
			context.scale(edits.flipHorizontal ? -1 : 1, edits.flipVertical ? -1 : 1);
		}

		context.drawImage(shown, -placed.width / 2, -placed.height / 2, placed.width, placed.height);
		context.restore();

		// Filters are applied to a copy and painted back, because reading pixels out of the
		// canvas and writing them again is what the routines need, and doing it in place
		// would read the pixels they just wrote.
		if (!comparing && !cropping) {
			const scratch = document.createElement('canvas');
			scratch.width = element.width;
			scratch.height = element.height;
			scratch.getContext('2d')?.drawImage(element, 0, 0);

			applyFiltersToCanvas(scratch, edits);

			context.clearRect(0, 0, element.width, element.height);
			context.drawImage(scratch, 0, 0);

			if (edits.vignette > 0) {
				drawVignette(context, element, edits.vignette);
			}
		}

		if (cropping && selection) {
			context.save();
			context.fillStyle = 'rgba(0,0,0,0.5)';
			context.fillRect(0, 0, element.width, element.height);
			context.clearRect(selection.x, selection.y, selection.width, selection.height);
			context.drawImage(element, selection.x, selection.y, selection.width, selection.height, selection.x, selection.y, selection.width, selection.height);
			context.strokeStyle = '#008aff';
			context.lineWidth = 2;
			context.strokeRect(selection.x, selection.y, selection.width, selection.height);
			context.restore();
		}
	}, [comparing, cropping, edits, image, selection, source]);

	useEffect(() => {
		draw();
	}, [draw]);

	const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect();

		return {
			x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
			y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
		};
	};

	const applyCrop = () => {
		const element = canvas.current;

		if (!element || !selection) {
			return;
		}

		const rect = cropFromCanvas(selection, source, element);

		if (!rect) {
			setCropping(false);
			setSelection(null);
			return;
		}

		const cropped = document.createElement('canvas');
		cropped.width = rect.width;
		cropped.height = rect.height;
		cropped.getContext('2d')?.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

		setSource(cropped);
		setSize({ width: rect.width, height: rect.height });
		setCropping(false);
		setSelection(null);
	};

	/**
	 * Build the file at the size it is meant to be, not the size it was being looked at.
	 */
	const save = () => {
		const output = document.createElement('canvas');
		output.width = size.width;
		output.height = size.height;

		const context = output.getContext('2d');

		if (!context) {
			return;
		}

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.save();
		context.translate(output.width / 2, output.height / 2);
		context.rotate((edits.rotation * Math.PI) / 180);
		context.scale(edits.flipHorizontal ? -1 : 1, edits.flipVertical ? -1 : 1);
		context.drawImage(source, -output.width / 2, -output.height / 2, output.width, output.height);
		context.restore();

		applyFiltersToCanvas(output, edits);

		if (edits.vignette > 0) {
			drawVignette(context, output, edits.vignette);
		}

		output.toBlob((blob) => (blob ? onSave(blob) : undefined), 'image/jpeg', 0.92);
	};

	const changed = hasEdits(edits) || source !== image || size.width !== image.naturalWidth;

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
			<Card className="flex flex-col gap-4 p-4">
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" icon="rotate_left" onClick={() => setEdits({ ...edits, rotation: (edits.rotation - 90) % 360 })}>
						{__('Left')}
					</Button>
					<Button variant="outline" size="sm" icon="rotate_right" onClick={() => setEdits({ ...edits, rotation: (edits.rotation + 90) % 360 })}>
						{__('Right')}
					</Button>
					<Button variant="outline" size="sm" icon="flip" onClick={() => setEdits({ ...edits, flipHorizontal: !edits.flipHorizontal })}>
						{__('Flip H')}
					</Button>
					<Button variant="outline" size="sm" icon="flip" onClick={() => setEdits({ ...edits, flipVertical: !edits.flipVertical })}>
						{__('Flip V')}
					</Button>

					<span className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

					{cropping ? (
						<>
							<Button size="sm" icon="crop" onClick={applyCrop} disabled={!selection}>
								{__('Apply crop')}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setCropping(false);
									setSelection(null);
								}}
							>
								{__('Cancel')}
							</Button>
							<div className="flex items-center gap-1">
								{RATIOS.map((option) => (
									<button
										key={option.label}
										type="button"
										onClick={() => setRatio(option.value)}
										className={cn(
											'rounded-md px-2 py-1 text-theme-xs font-medium transition-colors',
											ratio === option.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
										)}
									>
										{option.label}
									</button>
								))}
							</div>
						</>
					) : (
						<Button variant="outline" size="sm" icon="crop" onClick={() => setCropping(true)}>
							{__('Crop')}
						</Button>
					)}

					<Button
						variant="ghost"
						size="sm"
						icon="compare"
						className="ms-auto"
						onPointerDown={() => setComparing(true)}
						onPointerUp={() => setComparing(false)}
						onPointerLeave={() => setComparing(false)}
					>
						{__('Compare')}
					</Button>
				</div>

				<div className="flex items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
					<canvas
						ref={canvas}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						className={cn('max-w-full', cropping && 'cursor-crosshair')}
						onPointerDown={(event) => {
							if (!cropping) {
								return;
							}

							event.currentTarget.setPointerCapture(event.pointerId);
							dragFrom.current = pointAt(event);
							setSelection(null);
						}}
						onPointerMove={(event) => {
							if (!cropping || !dragFrom.current) {
								return;
							}

							const to = pointAt(event);
							const rect = rectBetween(dragFrom.current, to);

							setSelection(ratio ? { ...rect, height: rect.width / ratio } : rect);
						}}
						onPointerUp={() => {
							dragFrom.current = null;
						}}
					/>
				</div>
			</Card>

			<div className="flex flex-col gap-4">
				<Card title={__('Size')}>
					<div className="flex items-center gap-2">
						<Input
							type="number"
							size="sm"
							value={String(size.width)}
							aria-label={__('Width')}
							onChange={(event) => {
								const width = Number(event.target.value) || 1;
								setSize({ width, height: lockRatio ? keepRatio(width, { width: image.naturalWidth, height: image.naturalHeight }, 'width') : size.height });
							}}
						/>
						<Icon name="close" className="text-sm text-gray-400" />
						<Input
							type="number"
							size="sm"
							value={String(size.height)}
							aria-label={__('Height')}
							onChange={(event) => {
								const height = Number(event.target.value) || 1;
								setSize({ height, width: lockRatio ? keepRatio(height, { width: image.naturalWidth, height: image.naturalHeight }, 'height') : size.width });
							}}
						/>
					</div>
					<div className="mt-3">
						<Switch checked={lockRatio} onCheckedChange={setLockRatio} label={__('Lock aspect ratio')} size="sm" />
					</div>
				</Card>

				<Card title={__('Adjustments')} className="max-h-[30rem] overflow-y-auto custom-scrollbar">
					<div className="flex flex-col gap-4">
						{SLIDERS.map((slider) => (
							<label key={slider.key} className="block">
								<span className="mb-1 flex items-center justify-between text-theme-xs">
									<span className="text-gray-600 dark:text-gray-400">{slider.label}</span>
									<span className="font-medium text-gray-800 dark:text-white/90">{edits[slider.key]}</span>
								</span>
								<input
									type="range"
									min={slider.min}
									max={slider.max}
									value={edits[slider.key]}
									onChange={(event) => setEdits({ ...edits, [slider.key]: Number(event.target.value) })}
									className="w-full accent-brand-500"
								/>
								{slider.hint ? <span className="mt-0.5 block text-theme-xs text-gray-400">{slider.hint}</span> : null}
							</label>
						))}
					</div>
				</Card>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						icon="restart_alt"
						onClick={() => {
							setEdits(NO_EDITS);
							setSource(image);
							setSize({ width: image.naturalWidth, height: image.naturalHeight });
						}}
						disabled={!changed}
					>
						{__('Reset')}
					</Button>
					<Button variant="ghost" size="sm" onClick={onCancel}>
						{__('Cancel')}
					</Button>
					<Button size="sm" icon="save" className="ms-auto" loading={saving} disabled={!changed} onClick={save}>
						{__('Save')}
					</Button>
				</div>
			</div>
		</div>
	);
};
