import { Component, type ErrorInfo, type ReactNode } from 'react';
import { __ } from '@/react/lib/i18n';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps a crash inside the React app from blanking the admin screen.
 */
export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		// eslint-disable-next-line no-console -- surfacing the stack helps support
		console.error('[Flexify Dashboard]', error, info.componentStack);
	}

	render() {
		const { error } = this.state;

		if (!error) {
			return this.props.children;
		}

		return (
			<div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/30 dark:bg-error-500/10">
				<h2 className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">{__('Something went wrong on this screen')}</h2>
				<p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-300">
					{__('Reload the page to try again. If it keeps happening, share the details below with support.')}
				</p>
				<pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-white/70 p-3 text-theme-xs text-gray-700 custom-scrollbar dark:bg-gray-900/60 dark:text-gray-300">
					{error.message}
				</pre>
				<button
					type="button"
					className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
					onClick={() => window.location.reload()}
				>
					{__('Reload page')}
				</button>
			</div>
		);
	}
}
