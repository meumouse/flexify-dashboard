import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CURRENCY, formatPrice, parsePrice } from '../src/composables/wooPrice.js';

const brl = DEFAULT_CURRENCY;
const usd = { ...DEFAULT_CURRENCY, code: 'USD', symbol: '$', position: 'left', thousand_separator: ',', decimal_separator: '.' };
const eur = { ...DEFAULT_CURRENCY, code: 'EUR', symbol: '€', position: 'right_space', thousand_separator: ' ', decimal_separator: ',' };

describe('formatPrice', () => {
  it('formats with the store separators and symbol position', () => {
    assert.equal(formatPrice(1234.5, brl), 'R$ 1.234,50');
    assert.equal(formatPrice('1234567.891', usd), '$1,234,567.89');
    assert.equal(formatPrice(99, eur), '99,00 €');
    assert.equal(formatPrice(5, { ...usd, position: 'right' }), '5.00$');
  });

  it('keeps the sign before the symbol', () => {
    assert.equal(formatPrice(-9.9, brl), '-R$ 9,90');
    assert.equal(formatPrice('-0.5', usd), '-$0.50');
  });

  it('respects zero decimals', () => {
    assert.equal(formatPrice(1500, { ...brl, decimals: 0 }), 'R$ 1.500');
  });

  it('returns an empty string for empty values and the raw value when not numeric', () => {
    assert.equal(formatPrice('', brl), '');
    assert.equal(formatPrice(null, brl), '');
    assert.equal(formatPrice(undefined, brl), '');
    assert.equal(formatPrice('abc', brl), 'abc');
  });
});

describe('parsePrice', () => {
  it('parses localized values into decimal strings', () => {
    assert.equal(parsePrice('1.234,56', brl), '1234.56');
    assert.equal(parsePrice('59,90', brl), '59.90');
    assert.equal(parsePrice('R$ 1.234', brl), '1234');
    assert.equal(parsePrice('-10,5', brl), '-10.5');
    assert.equal(parsePrice('1,234.56', usd), '1234.56');
    assert.equal(parsePrice('1 234,5', eur), '1234.5');
  });

  it('accepts a dot as decimal separator when typed with up to two decimals', () => {
    assert.equal(parsePrice('59.90', brl), '59.90');
    assert.equal(parsePrice('59.9', brl), '59.9');
  });

  it('handles numbers and empty input', () => {
    assert.equal(parsePrice(12.5, brl), '12.5');
    assert.equal(parsePrice('', brl), '');
    assert.equal(parsePrice('   ', brl), '');
  });

  it('round-trips formatted prices', () => {
    for (const value of [0, 1, 10.1, 999.99, 1234567.89]) {
      assert.equal(Number(parsePrice(formatPrice(value, brl), brl)), value);
      assert.equal(Number(parsePrice(formatPrice(value, usd), usd)), value);
    }
  });
});
