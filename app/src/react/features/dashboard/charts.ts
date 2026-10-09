/**
 * Geometry and colours for the small charts the dashboard draws itself.
 *
 * A sparkline and a gauge are a line and an arc; loading ApexCharts for them would cost more
 * than the cards they sit in.
 */

/**
 * The `points` of a polyline that fits `values` into a box, oldest on the left.
 *
 * A flat series is drawn across the middle rather than along the floor, where it would read as
 * "nothing happened" instead of "the same every day".
 */
export const sparklinePoints = (values: number[], width: number, height: number, inset = 2): string => {
	if (values.length < 2) {
		return '';
	}

	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;
	const step = (width - inset * 2) / (values.length - 1);

	return values
		.map((value, index) => {
			const x = inset + index * step;
			const y = span === 0 ? height / 2 : inset + (1 - (value - min) / span) * (height - inset * 2);

			return `${round(x)},${round(y)}`;
		})
		.join(' ');
};

/** How far along a target is, as a percentage that may pass 100; 0 when there is no target. */
export const targetProgress = (value: number, target: number): number => (target > 0 ? Math.max(0, (value / target) * 100) : 0);

/** The accent colour of the admin, read from the tokens the theme prints, as `rgb()`. */
export const accentColor = (shade = 500): string => {
	const channels = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(`--fd-accent-${shade}`).trim();

	return channels ? `rgb(${channels.split(/\s+/).join(',')})` : '#008aff';
};

/** Categorical colours after the accent: success, warning, info, purple, orange, gray. */
export const SERIES_COLORS = ['#12b76a', '#f79009', '#0ba5ec', '#7a5af8', '#fb6514', '#98a2b3'];

const round = (value: number) => Math.round(value * 100) / 100;
