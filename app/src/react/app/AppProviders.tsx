import { useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/react/app/ConfirmProvider';
import { ErrorBoundary } from '@/react/app/ErrorBoundary';
import { MediaPickerProvider } from '@/react/app/MediaPickerProvider';
import { ThemeProvider } from '@/react/app/ThemeProvider';
import { ToastProvider, useNotify } from '@/react/app/ToastProvider';
import { WpDataProvider } from '@/react/app/WpDataProvider';
import { RestError } from '@/react/lib/rest';
import { __ } from '@/react/lib/i18n';
import type { WpData } from '@/react/types/wordpress';

/**
 * Everything a React screen needs: WordPress data, REST client, dark mode, toasts and
 * a query client whose failures are reported through the toast queue.
 */

type Props = {
	children: ReactNode;
	/** Selector of the page specific script tag */
	pageScript?: string;
	/** Pre-built data, used by tests and the visual harness */
	wpData?: WpData;
};

const errorMessage = (error: unknown): string => {
	if (error instanceof RestError) {
		return error.message;
	}

	return error instanceof Error ? error.message : __('The request failed. Please try again.');
};

const QueryProvider = ({ children }: { children: ReactNode }) => {
	const { notify } = useNotify();

	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 30_000,
						retry: (failureCount, error) => !(error instanceof RestError) && failureCount < 2,
						refetchOnWindowFocus: false,
					},
				},
				queryCache: new QueryCache({
					onError: (error) => notify({ tone: 'error', title: __('Could not load the data'), message: errorMessage(error) }),
				}),
				mutationCache: new MutationCache({
					onError: (error) => notify({ tone: 'error', title: __('Could not save the changes'), message: errorMessage(error) }),
				}),
			})
	);

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

export const AppProviders = ({ children, pageScript, wpData }: Props) => (
	<ErrorBoundary>
		<WpDataProvider pageScript={pageScript} value={wpData}>
			<ThemeProvider>
				<ToastProvider>
					<QueryProvider>
						<ConfirmProvider>
							<MediaPickerProvider>{children}</MediaPickerProvider>
						</ConfirmProvider>
					</QueryProvider>
				</ToastProvider>
			</ThemeProvider>
		</WpDataProvider>
	</ErrorBoundary>
);
