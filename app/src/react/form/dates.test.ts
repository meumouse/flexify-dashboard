import { describe, expect, it } from 'vitest';
import { addMonths, clampDay, isoDate, lastDays, lastMonth, monthGrid, moveFocus, orderRange, parseDay, startOfWeek, thisMonth } from '@/react/form/dates';

const day = (value: string) => parseDay(value)!;

describe('parseDay', () => {
	it('reads YYYY-MM-DD as that local day, not midnight UTC', () => {
		const date = day('2026-10-07');

		expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 7, 0]);
		expect(isoDate(date)).toBe('2026-10-07');
	});

	it('returns null for empty or broken values', () => {
		expect(parseDay('')).toBeNull();
		expect(parseDay(null)).toBeNull();
		expect(parseDay('not a date')).toBeNull();
	});
});

describe('addMonths', () => {
	it('holds the day to the end of a shorter month', () => {
		expect(isoDate(addMonths(day('2026-01-31'), 1))).toBe('2026-02-28');
		expect(isoDate(addMonths(day('2024-01-31'), 1))).toBe('2024-02-29');
		expect(isoDate(addMonths(day('2026-03-31'), -1))).toBe('2026-02-28');
	});

	it('crosses years', () => {
		expect(isoDate(addMonths(day('2026-12-15'), 1))).toBe('2027-01-15');
	});
});

describe('monthGrid', () => {
	it('always draws six weeks starting on the first day of the week', () => {
		// October 2026 starts on a Thursday.
		const sundayFirst = monthGrid(day('2026-10-01'), 0);
		const mondayFirst = monthGrid(day('2026-10-01'), 1);

		expect(sundayFirst).toHaveLength(42);
		expect(isoDate(sundayFirst[0])).toBe('2026-09-27');
		expect(isoDate(mondayFirst[0])).toBe('2026-09-28');
		expect(isoDate(mondayFirst[41])).toBe('2026-11-08');
	});
});

describe('moveFocus', () => {
	const from = day('2026-10-07'); // a Wednesday

	it('moves by day and by week with the arrows', () => {
		expect(isoDate(moveFocus(from, 'ArrowRight', 0)!)).toBe('2026-10-08');
		expect(isoDate(moveFocus(from, 'ArrowUp', 0)!)).toBe('2026-09-30');
	});

	it('moves by month with page keys and by year with shift', () => {
		expect(isoDate(moveFocus(from, 'PageDown', 0)!)).toBe('2026-11-07');
		expect(isoDate(moveFocus(from, 'PageUp', 0, true)!)).toBe('2025-10-07');
	});

	it('goes to the ends of the week with home and end', () => {
		expect(isoDate(moveFocus(from, 'Home', 1)!)).toBe('2026-10-05');
		expect(isoDate(moveFocus(from, 'End', 1)!)).toBe('2026-10-11');
	});

	it('ignores other keys', () => {
		expect(moveFocus(from, 'a', 0)).toBeNull();
	});
});

describe('ranges', () => {
	it('orders the ends whichever was picked first', () => {
		const range = orderRange(day('2026-10-09'), day('2026-10-02'));

		expect([isoDate(range.from), isoDate(range.to)]).toEqual(['2026-10-02', '2026-10-09']);
	});

	it('builds the presets from today', () => {
		const today = day('2026-10-08');

		expect(isoDate(lastDays(7, today).from)).toBe('2026-10-02');
		expect(isoDate(thisMonth(today).from)).toBe('2026-10-01');
		expect([isoDate(lastMonth(today).from), isoDate(lastMonth(today).to)]).toEqual(['2026-09-01', '2026-09-30']);
	});

	it('keeps a day inside the bounds', () => {
		expect(isoDate(clampDay(day('2026-10-01'), day('2026-10-05'), null))).toBe('2026-10-05');
		expect(isoDate(clampDay(day('2026-10-09'), null, day('2026-10-08')))).toBe('2026-10-08');
		expect(isoDate(startOfWeek(day('2026-10-04'), 1))).toBe('2026-09-28');
	});
});
