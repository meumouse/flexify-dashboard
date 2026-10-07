import { DEFAULT_CURRENCY as JS_DEFAULT_CURRENCY, formatPrice as jsFormatPrice, parsePrice as jsParsePrice } from '@/composables/wooPrice.js';
import type { Currency } from '@/react/woo/types';

/**
 * The money helpers are shared with the Vue pages; this module only puts types on them so the
 * formatting rules stay in one place while both frontends exist.
 */

export const DEFAULT_CURRENCY = JS_DEFAULT_CURRENCY as Currency;

export const formatPrice = (value: string | number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string => jsFormatPrice(value as string | number, currency);

export const parsePrice = (value: string | number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string => jsParsePrice(value as string | number, currency);
