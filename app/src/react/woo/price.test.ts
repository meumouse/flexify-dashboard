import { describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY, formatPrice, parsePrice } from '@/react/woo/price';
import type { Currency } from '@/react/woo/types';

/** The old node:test file used assert.equal; this keeps its cases as they were. */
const expectEqual = (actual: unknown, expected: unknown) => expect(actual).toEqual(expected);

const brl = DEFAULT_CURRENCY;
const usd: Currency = { ...DEFAULT_CURRENCY, code: 'USD', symbol: '$', position: 'left', thousand_separator: ',', decimal_separator: '.' };
const eur: Currency = { ...DEFAULT_CURRENCY, code: 'EUR', symbol: '€', position: 'right_space', thousand_separator: ' ', decimal_separator: ',' };

describe('formatPrice', () => {
  it('formats with the store separators and symbol position', () => {
    expectEqual(formatPrice(1234.5, brl), 'R$ 1.234,50');
    expectEqual(formatPrice('1234567.891', usd), '$1,234,567.89');
    expectEqual(formatPrice(99, eur), '99,00 €');
    expectEqual(formatPrice(5, { ...usd, position: 'right' as const }), '5.00$');
  });

  it('keeps the sign before the symbol', () => {
    expectEqual(formatPrice(-9.9, brl), '-R$ 9,90');
    expectEqual(formatPrice('-0.5', usd), '-$0.50');
  });

  it('respects zero decimals', () => {
    expectEqual(formatPrice(1500, { ...brl, decimals: 0 }), 'R$ 1.500');
  });

  it('returns an empty string for empty values and the raw value when not numeric', () => {
    expectEqual(formatPrice('', brl), '');
    expectEqual(formatPrice(null, brl), '');
    expectEqual(formatPrice(undefined, brl), '');
    expectEqual(formatPrice('abc', brl), 'abc');
  });
});

describe('parsePrice', () => {
  it('parses localized values into decimal strings', () => {
    expectEqual(parsePrice('1.234,56', brl), '1234.56');
    expectEqual(parsePrice('59,90', brl), '59.90');
    expectEqual(parsePrice('R$ 1.234', brl), '1234');
    expectEqual(parsePrice('-10,5', brl), '-10.5');
    expectEqual(parsePrice('1,234.56', usd), '1234.56');
    expectEqual(parsePrice('1 234,5', eur), '1234.5');
  });

  it('accepts a dot as decimal separator when typed with up to two decimals', () => {
    expectEqual(parsePrice('59.90', brl), '59.90');
    expectEqual(parsePrice('59.9', brl), '59.9');
  });

  it('handles numbers and empty input', () => {
    expectEqual(parsePrice(12.5, brl), '12.5');
    expectEqual(parsePrice('', brl), '');
    expectEqual(parsePrice('   ', brl), '');
  });

  it('round-trips formatted prices', () => {
    for (const value of [0, 1, 10.1, 999.99, 1234567.89]) {
      expectEqual(Number(parsePrice(formatPrice(value, brl), brl)), value);
      expectEqual(Number(parsePrice(formatPrice(value, usd), usd)), value);
    }
  });
});
