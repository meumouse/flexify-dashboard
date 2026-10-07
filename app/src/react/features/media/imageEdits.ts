import type { FilterValues } from '@/components/utility/image-editor/src/filters.js';

/**
 * What an edit is, apart from how it is shown.
 *
 * Kept away from the component so the arithmetic — where the image sits on the canvas, what a
 * rectangle drawn on it means in the image's own pixels — can be checked on its own.
 */

export type Edits = FilterValues & {
	rotation: number;
	flipHorizontal: boolean;
	flipVertical: boolean;
};

export const NO_FILTERS: FilterValues = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	hue: 0,
	exposure: 0,
	vibrance: 0,
	sharpness: 0,
	highlights: 0,
	shadows: 0,
	temperature: 0,
	tint: 0,
	blur: 0,
	grain: 0,
	vignette: 0,
};

export const NO_EDITS: Edits = { ...NO_FILTERS, rotation: 0, flipHorizontal: false, flipVertical: false };

export const hasEdits = (edits: Edits): boolean => (Object.keys(NO_EDITS) as (keyof Edits)[]).some((key) => edits[key] !== NO_EDITS[key]);

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Where the image lands when it is drawn to fit a canvas.
 *
 * The image keeps its proportions, so one pair of edges touches the canvas and the other is
 * centred with a gap on each side.
 */
export const fitWithin = (image: { width: number; height: number }, canvas: { width: number; height: number }): Rect => {
	const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
	const width = image.width * scale;
	const height = image.height * scale;

	return { x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height };
};

/**
 * Turn a rectangle drawn on the canvas into the rectangle of the image it covers.
 *
 * Returns null when the rectangle misses the image or is too small to be a crop, so the caller
 * can leave the image alone instead of making a one-pixel one.
 */
export const cropFromCanvas = (selection: Rect, image: { width: number; height: number }, canvas: { width: number; height: number }): Rect | null => {
	const placed = fitWithin(image, canvas);
	const scale = image.width / placed.width;

	const left = Math.max(0, (selection.x - placed.x) * scale);
	const top = Math.max(0, (selection.y - placed.y) * scale);
	const right = Math.min(image.width, (selection.x + selection.width - placed.x) * scale);
	const bottom = Math.min(image.height, (selection.y + selection.height - placed.y) * scale);

	const width = Math.round(right - left);
	const height = Math.round(bottom - top);

	if (width < 2 || height < 2) {
		return null;
	}

	return { x: Math.round(left), y: Math.round(top), width, height };
};

/** Hold a rectangle to a shape while it is being dragged, anchored where the drag started. */
export const lockAspect = (rect: Rect, ratio: number | null): Rect => {
	if (!ratio) {
		return rect;
	}

	const height = rect.width / ratio;

	return { ...rect, height: Math.sign(rect.height || 1) * Math.abs(height) };
};

/** The rectangle between two points, however they were dragged. */
export const rectBetween = (from: { x: number; y: number }, to: { x: number; y: number }): Rect => ({
	x: Math.min(from.x, to.x),
	y: Math.min(from.y, to.y),
	width: Math.abs(to.x - from.x),
	height: Math.abs(to.y - from.y),
});

/** The size the other side has to be for a resize to keep the shape of the image. */
export const keepRatio = (value: number, original: { width: number; height: number }, side: 'width' | 'height'): number =>
	side === 'width' ? Math.round(value * (original.height / original.width)) : Math.round(value * (original.width / original.height));
