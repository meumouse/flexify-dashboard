/**
 * Day arithmetic behind the date pickers.
 *
 * Every value here is a local day at midnight. Fields and routes speak `YYYY-MM-DD`, and
 * `new Date('2026-10-07')` reads that as midnight UTC — the day before anywhere west of
 * Greenwich — so strings only become dates through `parseDay`.
 */

export type DayRange = { from: Date; to: Date };

export const isoDate = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Read a `YYYY-MM-DD` value as that day where the user is. */
export const parseDay = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null;
	}

	const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const date = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(value);

	return Number.isNaN(date.getTime()) ? null : date;
};

export const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * The same day in another month, held to that month's last day.
 *
 * Plain `setMonth` turns 31 January plus one month into 3 March, and the keyboard would skip
 * February entirely.
 */
export const addMonths = (date: Date, months: number): Date => {
	const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

	return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};

export const sameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
	Boolean(a && b) && a!.getFullYear() === b!.getFullYear() && a!.getMonth() === b!.getMonth() && a!.getDate() === b!.getDate();

export const sameMonth = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** The two ends in order, whichever was clicked first. */
export const orderRange = (a: Date, b: Date): DayRange => (a <= b ? { from: a, to: b } : { from: b, to: a });

export const inRange = (day: Date, range: DayRange | null): boolean => Boolean(range) && day >= startOfDay(range!.from) && day <= startOfDay(range!.to);

/** Start of the week the day falls in, with `weekStartsOn` as 0 = Sunday … 6 = Saturday. */
export const startOfWeek = (date: Date, weekStartsOn: number): Date => addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));

/**
 * The days a month view draws: always six weeks.
 *
 * A month spans four to six rows depending on where it starts; a fixed six keeps the popover
 * from changing height under the pointer as the person pages through months.
 */
export const monthGrid = (month: Date, weekStartsOn: number): Date[] => {
	const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1), weekStartsOn);

	return Array.from({ length: 42 }, (_, index) => addDays(first, index));
};

/** Clamp a day between optional bounds. */
export const clampDay = (day: Date, min: Date | null, max: Date | null): Date => {
	if (min && day < min) {
		return min;
	}

	return max && day > max ? max : day;
};

/** Where an arrow, page or home/end key moves the focused day, following the WAI-ARIA date grid. */
export const moveFocus = (day: Date, key: string, weekStartsOn: number, shift = false): Date | null => {
	switch (key) {
		case 'ArrowLeft':
			return addDays(day, -1);
		case 'ArrowRight':
			return addDays(day, 1);
		case 'ArrowUp':
			return addDays(day, -7);
		case 'ArrowDown':
			return addDays(day, 7);
		case 'PageUp':
			return addMonths(day, shift ? -12 : -1);
		case 'PageDown':
			return addMonths(day, shift ? 12 : 1);
		case 'Home':
			return startOfWeek(day, weekStartsOn);
		case 'End':
			return addDays(startOfWeek(day, weekStartsOn), 6);
		default:
			return null;
	}
};

/** The last `days` days, today included. */
export const lastDays = (days: number, today = new Date()): DayRange => ({ from: addDays(startOfDay(today), -(days - 1)), to: startOfDay(today) });

export const thisMonth = (today = new Date()): DayRange => ({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: startOfDay(today) });

export const lastMonth = (today = new Date()): DayRange => ({
	from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
	to: new Date(today.getFullYear(), today.getMonth(), 0),
});

/**
 * First day of the week for a locale.
 *
 * `weekInfo` is where the browser keeps it; Firefox does not have it yet, and Sunday is what
 * the native date input falls back to as well.
 */
export const firstDayOfWeek = (locale?: string): number => {
	try {
		const info = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
			weekInfo?: { firstDay: number };
			getWeekInfo?: () => { firstDay: number };
		};
		const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;

		// Intl counts Monday as 1 and Sunday as 7; Date counts Sunday as 0.
		return firstDay ? firstDay % 7 : 0;
	} catch {
		return 0;
	}
};

/** Short weekday names in grid order, in the browser's language. */
export const weekdayNames = (weekStartsOn: number, locale?: string): { short: string; long: string }[] => {
	// 4 January 1970 was a Sunday.
	const sunday = new Date(1970, 0, 4);
	const short = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
	const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });

	return Array.from({ length: 7 }, (_, index) => {
		const day = addDays(sunday, weekStartsOn + index);

		return { short: short.format(day), long: long.format(day) };
	});
};
