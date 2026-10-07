import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Shared JavaScript from the Vue side translates through a global, and some of it does so
// while it is being imported.
import '@/react/lib/wp-globals';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	cleanup();
	// A test that fails before restoring the clock would hang every test after it.
	vi.useRealTimers();
});

// jsdom has no layout, so it leaves scrollIntoView out; components that keep a highlighted row
// in sight would throw instead of being tested.
if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}
