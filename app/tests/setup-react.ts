import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	cleanup();
	// A test that fails before restoring the clock would hang every test after it.
	vi.useRealTimers();
});
