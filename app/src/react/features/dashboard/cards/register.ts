import { dashboardRegistry } from '@/shared/dashboard/registry.js';
import { __ } from '@/react/lib/i18n';
import { StoreMetricsCard, StoreRecentOrdersCard, StoreRevenueCard, StoreTopProductsCard } from '@/react/features/dashboard/cards/ecommerce';
import { RecentCommentsCard, RecentPostsCard, ScheduledPostsCard } from '@/react/features/dashboard/cards/content';
import { MediaAnalyticsCard, ServerHealthCard, UsersChartCard } from '@/react/features/dashboard/cards/site';
import {
	ActiveUsersCard,
	BounceRateCard,
	DeviceUsageCard,
	PageAnalyticsCard,
	PageViewsChartCard,
	TopCountriesCard,
	TopPagesCard,
	TopReferrersCard,
} from '@/react/features/dashboard/cards/analytics';
import { AnalyticsMapCard, RankMathCard } from '@/react/features/dashboard/cards/extras';


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
		metadata: { id: 'recent-posts', title: __('Recent Posts'), description: __('Latest content activity'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: RecentPostsCard,
	},
	{
		metadata: { id: 'scheduled-posts', title: __('Scheduled Posts'), description: __('What is queued to go out'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: ScheduledPostsCard,
	},
	{
		metadata: { id: 'recent-comments', title: __('Recent Comments'), description: __('Latest conversations'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: RecentCommentsCard,
	},
	{
		metadata: { id: 'media-analytics', title: __('Media library'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: MediaAnalyticsCard,
	},
	{
		metadata: { id: 'server-health', title: __('Server health'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: ServerHealthCard,
	},
	{
		metadata: { id: 'users-chart', title: __('Users'), width: 4, mobileWidth: 12, language: 'react', category: 'site' },
		component: UsersChartCard,
	},
	{
		metadata: { id: 'page-analytics', title: __('Traffic'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: PageAnalyticsCard,
	},
	{
		metadata: { id: 'page-views-chart', title: __('Page views'), width: 8, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: PageViewsChartCard,
	},
	{
		metadata: { id: 'active-users', title: __('Active users'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: ActiveUsersCard,
	},
	{
		metadata: { id: 'bounce-rate-time', title: __('Engagement'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: BounceRateCard,
	},
	{
		metadata: { id: 'device-usage', title: __('Devices'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: DeviceUsageCard,
	},
	{
		metadata: { id: 'top-pages', title: __('Top pages'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: TopPagesCard,
	},
	{
		metadata: { id: 'top-countries', title: __('Top countries'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: TopCountriesCard,
	},
	{
		metadata: { id: 'top-referrers', title: __('Top referrers'), width: 4, mobileWidth: 12, language: 'react', category: 'analytics' },
		component: TopReferrersCard,
	},
	{
		metadata: { id: 'analytics-map', title: __('Visitor map'), width: 8, mobileWidth: 12, language: 'react', category: 'analytics', requires_capabilities: ['edit_posts'] },
		component: AnalyticsMapCard,
	},
	{
		metadata: { id: 'rank-math-overview', title: __('Rank Math'), width: 12, mobileWidth: 12, language: 'react', category: 'analytics', requires_capabilities: ['read'] },
		component: RankMathCard,
	},
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
