import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';

/**
 * Toast notifications for the React pages, with the same look as the Vue notifications.
 */

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export type Toast = {
	id: string;
	tone: ToastTone;
	title: string;
	message?: string;
	/** Milliseconds before dismissing; 0 keeps the toast until the user closes it */
	duration?: number;
};

type ToastInput = Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone };

type ToastContextValue = {
	notify: (toast: ToastInput) => string;
	dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONES: Record<ToastTone, { icon: string; className: string }> = {
	success: { icon: 'check_circle', className: 'text-success-500' },
	error: { icon: 'error', className: 'text-error-500' },
	warning: { icon: 'warning', className: 'text-warning-500' },
	info: { icon: 'info', className: 'text-blue-light-500' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const timers = useRef(new Map<string, number>());

	const dismiss = useCallback((id: string) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));

		const timer = timers.current.get(id);

		if (timer) {
			window.clearTimeout(timer);
			timers.current.delete(id);
		}
	}, []);

	const notify = useCallback(
		({ tone = 'info', duration = 6000, ...rest }: ToastInput) => {
			const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

			setToasts((current) => [...current, { id, tone, duration, ...rest }]);

			if (duration > 0) {
				timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
			}

			return id;
		},
		[dismiss]
	);

	useEffect(() => {
		const pending = timers.current;

		return () => {
			pending.forEach((timer) => window.clearTimeout(timer));
			pending.clear();
		};
	}, []);

	const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="pointer-events-none fixed inset-x-4 bottom-4 z-99999 flex flex-col items-end gap-3 sm:inset-x-auto sm:end-6" role="region" aria-label={__('Notifications')}>
				{toasts.map((toast) => (
					<div
						key={toast.id}
						role="status"
						className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
					>
						<Icon name={TONES[toast.tone].icon} className={cn('mt-0.5 shrink-0 text-lg', TONES[toast.tone].className)} />
						<div className="min-w-0 flex-1">
							<p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{toast.title}</p>
							{toast.message ? <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{toast.message}</p> : null}
						</div>
						<button
							type="button"
							className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
							aria-label={__('Dismiss')}
							onClick={() => dismiss(toast.id)}
						>
							<Icon name="close" className="text-base" />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};

/** Show toast notifications. */
export const useNotify = (): ToastContextValue => {
	const context = useContext(ToastContext);

	if (!context) {
		throw new Error('useNotify must be used inside <ToastProvider>.');
	}

	return context;
};
