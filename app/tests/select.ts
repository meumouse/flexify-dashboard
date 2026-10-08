import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Driving the kit's `Select` from a test.
 *
 * It is a Radix listbox, not a native `<select>`, so `userEvent.selectOptions` does not reach
 * it and the options only exist in the DOM while the popup is open.
 */

/** Opens the select with the given accessible name and returns its listbox. */
export const openSelect = async (user: UserEvent, name: string | RegExp): Promise<HTMLElement> => {
	await user.click(screen.getByRole('combobox', { name }));

	return screen.findByRole('listbox');
};

/** Opens the select and picks the option with the given label. */
export const chooseOption = async (user: UserEvent, name: string | RegExp, option: string | RegExp): Promise<void> => {
	await openSelect(user, name);
	await user.click(await screen.findByRole('option', { name: option }));
};
