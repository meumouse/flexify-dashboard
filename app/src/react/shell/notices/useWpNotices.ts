import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The notices WordPress prints at the top of a screen.
 *
 * They are hidden where they are, counted, and moved into the notifications panel the first
 * time it opens — moving them keeps the markup and the behaviour plugins attached to it.
 */

const TARGET_SELECTOR =
	".notice:not(table .notice):not(#message.notice):not(.hide-if-js .notice):not(.themes .notice):not(.notice.hidden):not(.notice[aria-hidden='true']):not(.notice.hide-if-js)";

// `textContent` rather than `innerText`: the answer is the same for a notice and it does not
// depend on layout, which keeps the behaviour testable.
const isCountable = (element: HTMLElement) => Boolean(element.textContent?.trim()) && element.id !== 'setting-error-settings_updated';

export const useWpNotices = () => {
	const [count, setCount] = useState(0);
	// Refs attach before effects run, so the panel can take the notices in before they are hidden.
	const moved = useRef(new Set<HTMLElement>());

	useEffect(() => {
		const notices = [...document.querySelectorAll<HTMLElement>(TARGET_SELECTOR)];

		setCount(notices.filter(isCountable).length);

		notices.forEach((notice) => {
			if (!moved.current.has(notice)) {
				notice.style.display = 'none';
			}
		});
	}, []);

	/** Move the notices into the panel. */
	const attach = useCallback((container: HTMLElement | null) => {
		if (!container) {
			return;
		}

		[...document.querySelectorAll<HTMLElement>(TARGET_SELECTOR)]
			.filter((notice) => !container.contains(notice) && isCountable(notice))
			.forEach((notice) => {
				notice.style.display = '';
				container.appendChild(notice);
				moved.current.add(notice);
			});
	}, []);

	return { count, attach };
};
