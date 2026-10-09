import { useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { CardRender, Icon, Tooltip } from '@/react/ui';
import { GRID_COLUMNS, MAX_CARD_WIDTH, MIN_CARD_WIDTH, type DashboardCard } from '@/react/features/dashboard/useDashboardLayout';
import { cardClass } from '@/react/ui/recipes';

/**
 * The twelve column grid the cards sit on.
 *
 * Cards are reordered by dragging them and resized by dragging their right edge, which snaps to
 * whole columns — a card that does not line up with the grid would leave a hole beside it.
 */

type Props = {
	cards: DashboardCard[];
	cardProps: Record<string, unknown>;
	onMove: (fromId: string, toId: string) => void;
	onResize: (id: string, width: number) => void;
};

export const DashboardGrid = ({ cards, cardProps, onMove, onResize }: Props) => {
	const gridRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState<string | null>(null);
	const [resizing, setResizing] = useState<string | null>(null);

	const startResize = (event: React.PointerEvent, card: DashboardCard) => {
		event.preventDefault();

		const grid = gridRef.current;

		if (!grid) {
			return;
		}

		const columnWidth = grid.getBoundingClientRect().width / GRID_COLUMNS;
		const startX = event.clientX;
		const startWidth = card.metadata.width;

		setResizing(card.metadata.id);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';

		const onMoveEvent = (moveEvent: PointerEvent) => {
			const columns = Math.round((moveEvent.clientX - startX) / columnWidth);
			const width = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, startWidth + columns));

			if (width !== card.metadata.width) {
				onResize(card.metadata.id, width);
			}
		};

		const onEnd = () => {
			window.removeEventListener('pointermove', onMoveEvent);
			window.removeEventListener('pointerup', onEnd);
			window.removeEventListener('pointercancel', onEnd);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			setResizing(null);
		};

		window.addEventListener('pointermove', onMoveEvent);
		window.addEventListener('pointerup', onEnd);
		window.addEventListener('pointercancel', onEnd);
	};

	return (
		<div ref={gridRef} className="grid grid-cols-1 gap-6 md:grid-cols-12">
			{cards.map((card) => (
				<section
					key={card.metadata.id}
					id={card.metadata.id}
					className={cn(
						cardClass,
						'group/card relative min-w-0 p-5 md:col-span-(--fd-card-span) md:p-6',
						dragging === card.metadata.id && 'opacity-50',
						resizing === card.metadata.id && 'ring-2 ring-brand-500/40'
					)}
					// The width only applies from md, where the grid has twelve columns. Set inline, a
					// span of 4 in the one-column phone grid made three implicit columns and a card a
					// third of the screen wide.
					style={{ '--fd-card-span': card.metadata.width } as CSSProperties}
					onDragOver={(event) => {
						if (dragging && dragging !== card.metadata.id) {
							event.preventDefault();
						}
					}}
					onDrop={(event) => {
						event.preventDefault();

						if (dragging && dragging !== card.metadata.id) {
							onMove(dragging, card.metadata.id);
						}

						setDragging(null);
					}}
				>
					<header className="mb-4 flex items-start justify-between gap-3">
						{card.metadata.title ? <h2 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">{String(card.metadata.title)}</h2> : <span />}

						<Tooltip text={__('Drag to reorder')}>
							<button
								type="button"
								draggable
								className="shrink-0 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 dark:text-gray-600"
								aria-label={__('Drag to reorder')}
								onDragStart={() => setDragging(card.metadata.id)}
								onDragEnd={() => setDragging(null)}
							>
								<Icon name="drag_indicator" className="text-theme-lg" />
							</button>
						</Tooltip>
					</header>

					<CardRender card={card} props={cardProps} />

					{/* Only shown from the medium breakpoint up: below it every card is full width. */}
					<button
						type="button"
						className="absolute inset-y-4 end-0 hidden w-2 cursor-col-resize rounded-full opacity-0 transition-opacity hover:bg-brand-500/30 group-hover/card:opacity-100 focus-visible:opacity-100 md:block"
						aria-label={__('Resize card')}
						onPointerDown={(event) => startResize(event, card)}
						onKeyDown={(event) => {
							if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
								event.preventDefault();
								onResize(card.metadata.id, card.metadata.width + (event.key === 'ArrowRight' ? 1 : -1));
							}
						}}
					/>
				</section>
			))}
		</div>
	);
};
