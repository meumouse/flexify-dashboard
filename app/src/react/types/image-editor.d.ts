/**
 * The image editing routines, which are plain JavaScript and shared with the Vue editor.
 *
 * They do the pixel work — the filter pipeline alone is six hundred lines of it — and have
 * nothing to do with either framework, so they are used as they are rather than rewritten.
 */

declare module '@/components/utility/image-editor/src/filters.js' {
	export type FilterValues = {
		brightness: number;
		contrast: number;
		saturation: number;
		hue: number;
		exposure: number;
		vibrance: number;
		sharpness: number;
		highlights: number;
		shadows: number;
		temperature: number;
		tint: number;
		blur: number;
		grain: number;
		vignette: number;
	};

	export function applyFiltersToCanvas(canvas: HTMLCanvasElement, values: FilterValues): void;
}

declare module '@/components/utility/image-editor/src/canvas.js' {
	export function drawVignette(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, vignette: number): void;
}
