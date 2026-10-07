import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { readWpData } from '@/react/lib/script-data';
import { createRestClient, type RestClient } from '@/react/lib/rest';
import type { WpData } from '@/react/types/wordpress';

type WpContextValue = {
	wp: WpData;
	rest: RestClient;
};

const WpContext = createContext<WpContextValue | null>(null);

type Props = {
	children: ReactNode;
	/** Selector of the page specific script tag, when the screen prints one */
	pageScript?: string;
	/** Pre-built data, used by tests and the visual harness */
	value?: WpData;
};

export const WpDataProvider = ({ children, pageScript, value }: Props) => {
	const contextValue = useMemo<WpContextValue>(() => {
		const wp = value ?? readWpData('#fd-script', pageScript);

		return { wp, rest: createRestClient({ restBase: wp.restBase, restNonce: wp.restNonce }) };
	}, [pageScript, value]);

	return <WpContext.Provider value={contextValue}>{children}</WpContext.Provider>;
};

const useWpContext = (): WpContextValue => {
	const context = useContext(WpContext);

	if (!context) {
		throw new Error('useWpData must be used inside <WpDataProvider>.');
	}

	return context;
};

/** Site, user and plugin data printed by the admin page. */
export const useWpData = (): WpData => useWpContext().wp;

/** REST client already configured with the page nonce. */
export const useRest = (): RestClient => useWpContext().rest;

/** Payload printed by the page script tag (e.g. `woocommerce`). */
export const usePageData = <T,>(key: string, fallback: T): T => {
	const { page } = useWpData();

	return (page[key] as T) ?? fallback;
};

/** Check a capability of the current user. */
export const useCan = (): ((capability: string) => boolean) => {
	const { currentUser, canManageOptions } = useWpData();

	return (capability: string) => {
		if (!currentUser?.allcaps) {
			return canManageOptions;
		}

		return currentUser.allcaps[capability] === true;
	};
};
