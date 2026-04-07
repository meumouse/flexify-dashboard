import { dashboardRegistry } from '@/assets/js/dashboard/registry.js';

// Cards
import recentPosts from './recent-posts/index.js';
import recentComments from './recent-comments/index.js';
import serverHealth from './server-health/index.js';
import mediaAnalytics from './media-analytics/index.js';
import usersChart from './users-chart/index.js';
import scheduledPosts from './scheduled-posts/index.js';
import pageAnalytics from './page-analytics/index.js';
import activeUsers from './active-users/index.js';
import deviceUsage from './device-usage/index.js';
import pageViewsChart from './page-views-chart/index.js';
import topPages from './top-pages/index.js';
import topCountries from './top-countries/index.js';
import topReferrers from './top-referrers/index.js';
import bounceRateTime from './bounce-rate-time/index.js';
import analyticsMap from './analytics-map/index.js';
import wooCustomers from './ecommerce/customers/index.js';
import wooRevenue from './ecommerce/revenue/index.js';
import wooSalesSummary from './ecommerce/sales-summary/index.js';
import wooTopProducts from './ecommerce/top-products/index.js';
import wooAverageTicket from './ecommerce/average-ticket/index.js';
import wooOrdersReceived from './ecommerce/orders-received/index.js';
//import testReactCard from './test-react-card/index.js';
//import topEvents from './top-events/index.js';

const internalCards = [
	recentPosts,
	scheduledPosts,
	recentComments,
	usersChart,
	mediaAnalytics,
	serverHealth,
	pageAnalytics,
	deviceUsage,
	activeUsers,
	pageViewsChart,
	topPages,
	topCountries,
	topReferrers,
	bounceRateTime,
	analyticsMap,
	wooCustomers,
	wooRevenue,
	wooAverageTicket,
	wooSalesSummary,
	wooTopProducts,
	wooOrdersReceived,
	/*testReactCard,*/
];

internalCards.forEach((card) => {
	dashboardRegistry.registerLegacyItem(card, `internal:${card?.metadata?.id || 'unknown'}`);
});
