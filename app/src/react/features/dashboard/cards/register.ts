import { dashboardRegistry } from '@/assets/js/dashboard/registry.js';
import { __ } from '@/react/lib/i18n';
import { StoreMetricsCard, StoreRecentOrdersCard, StoreRevenueCard, StoreTopProductsCard } from '@/react/features/dashboard/cards/ecommerce';


/**
 * Register the cards the React dashboard shows.
 *
 * Only React cards: a Vue card reaches for globals that its own Vue app provided, and veaury
 * creates the app it mounts into without a way to configure it, so those cards render blank
 * here. They keep working on the Vue dashboard until each one is ported.
 */

const WOO = ['woocommerce/woocommerce.php'];

const reactCards = [
	{
		metadata: { id: 'woo-store-metrics', title: __('Store overview'), width: 12, mobileWidth: 12, language: 'react', category: 'e-commerce', requires_plugins: WOO },
		component: StoreMetricsCard,
	},
	{
		metadata: { id: 'woo-revenue-chart', title: __('Revenue'), width: 8, mobileWidth: 12, language: 'react', category: 'e-commerce', requires_plugins: WOO },
		component: StoreRevenueCard,
	},
	{
		metadata: { id: 'woo-top-products-react', title: __('Top products'), width: 4, mobileWidth: 12, language: 'react', category: 'e-commerce', requires_plugins: WOO },
		component: StoreTopProductsCard,
	},
	{
		metadata: { id: 'woo-recent-orders', title: __('Recent orders'), width: 12, mobileWidth: 12, language: 'react', category: 'e-commerce', requires_plugins: WOO },
		component: StoreRecentOrdersCard,
	},
];


export const registerDashboardCards = () => {
	dashboardRegistry.registerCategory({ id: 'ecommerce', label: __('e-Commerce') });

	reactCards.forEach((card) => {
		dashboardRegistry.registerLegacyItem(card, `internal:${card?.metadata?.id ?? 'unknown'}`);
	});
};
