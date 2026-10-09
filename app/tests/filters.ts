import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Opening a list's filter panel from a test.
 *
 * The filters of a `TableCard` live behind its "Filters" button and only exist in the DOM while
 * the panel is open, the same as the options of a select.
 */
export const openFilters = async (user: UserEvent): Promise<void> => {
	await user.click(await screen.findByRole('button', { name: /^Filters/ }));
};
