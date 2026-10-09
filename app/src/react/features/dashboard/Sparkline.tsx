import { cn } from '@/react/lib/cn';
import { sparklinePoints } from '@/react/features/dashboard/charts';

/**
 * The shape of a series, without axes or numbers, beside the figure it belongs to.
 */

const WIDTH = 96;
const HEIGHT = 32;

type Props = {
	values: number[];
	/** Text colour class; the line is drawn in the current colour */
	className?: string;
};

export const Sparkline = ({ values, className }: Props) => {
	const points = sparklinePoints(values, WIDTH, HEIGHT);

	if (!points) {
		return null;
	}

	return (
		<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className={cn('shrink-0 overflow-visible', className)} aria-hidden="true">
			<polyline points={`2,${HEIGHT} ${points} ${WIDTH - 2},${HEIGHT}`} fill="currentColor" fillOpacity={0.1} stroke="none" />
			<polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
};
