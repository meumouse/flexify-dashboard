import { ref } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const cache = ref({});

const formatDate = (date) => {
    if (!date) {
        return '';
    }
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const buildKey = (dateRange) => {
    const from = formatDate(dateRange?.[0]);
    const to = formatDate(dateRange?.[1]);
    
    return `${from}_${to}`;
};

export const getWooDashboardData = async (dateRange) => {
    const key = buildKey(dateRange);

    if (cache.value[key]) {
        return cache.value[key];
    }

    const response = await lmnFetch({
        endpoint: 'flexify-dashboard/v1/woocommerce-dashboard',
        type: 'GET',
        params: {
            date_from: formatDate(dateRange?.[0]),
            date_to: formatDate(dateRange?.[1]),
        },
    });

    const result = response?.data?.metrics || null;
    cache.value[key] = result;

    return result;
};

export const formatCurrency = (value, currency = 'USD') => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
};
