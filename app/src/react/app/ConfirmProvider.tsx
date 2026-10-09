import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { __ } from '@/react/lib/i18n';
import { Button } from '@/react/ui/Button';
import { Modal } from '@/react/ui/Modal';

/**
 * Confirmation dialog with an imperative API:
 *
 * `const confirm = useConfirm(); if (await confirm({ title, message })) { … }`
 */

export type ConfirmOptions = {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: 'primary' | 'danger';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const resolver = useRef<((value: boolean) => void) | null>(null);

	const confirm = useCallback<ConfirmFn>((next) => {
		setOptions(next);

		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
		});
	}, []);

	const settle = (value: boolean) => {
		resolver.current?.(value);
		resolver.current = null;
		setOptions(null);
	};

	const value = useMemo(() => confirm, [confirm]);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<Modal
				open={options !== null}
				onOpenChange={(open) => {
					if (!open) {
						settle(false);
					}
				}}
				size="sm"
				tone={options?.variant === 'danger' ? 'error' : 'info'}
				title={options?.title ?? ''}
				footer={
					<>
						<Button variant="outline" onClick={() => settle(false)}>
							{options?.cancelLabel ?? __('Cancel')}
						</Button>
						<Button variant={options?.variant === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
							{options?.confirmLabel ?? __('Confirm')}
						</Button>
					</>
				}
			>
				{options?.message ? <p className="text-theme-sm text-gray-600 dark:text-gray-300">{options.message}</p> : null}
			</Modal>
		</ConfirmContext.Provider>
	);
};

export const useConfirm = (): ConfirmFn => {
	const context = useContext(ConfirmContext);

	if (!context) {
		throw new Error('useConfirm must be used inside <ConfirmProvider>.');
	}

	return context;
};
