import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCombos, comboKey, missingCombos, sameAttribute } from '../src/pages/products/src/editor/variationCombos.js';

const size = { id: 1, name: 'Tamanho', options: ['P', 'M'] };
const color = { id: 2, name: 'Cor', options: ['Azul', 'Preto', 'Verde'] };
const material = { id: 0, name: 'Material', options: ['Algodão', 'Linho'] };

describe('sameAttribute', () => {
  it('matches global attributes by id and custom attributes by name', () => {
    assert.equal(sameAttribute({ id: 1, name: 'Size' }, size), true);
    assert.equal(sameAttribute({ id: 2, name: 'Tamanho' }, size), false);
    assert.equal(sameAttribute({ id: 0, name: 'material' }, material), true);
  });

  it('falls back to the name when the variation attribute has no id', () => {
    assert.equal(sameAttribute({ name: 'tamanho', option: 'P' }, size), true);
  });
});

describe('buildCombos', () => {
  it('creates the cartesian product of every option', () => {
    const combos = buildCombos([size, color]);
    assert.equal(combos.length, 6);
    assert.deepEqual(combos[0], [
      { id: 1, name: 'Tamanho', option: 'P' },
      { id: 2, name: 'Cor', option: 'Azul' },
    ]);
  });

  it('returns a single empty combination without attributes', () => {
    assert.deepEqual(buildCombos([]), [[]]);
  });
});

describe('missingCombos', () => {
  it('skips combinations that already exist, ignoring attribute order and case', () => {
    const variations = [
      { attributes: [{ id: 2, name: 'Cor', option: 'Azul' }, { id: 1, name: 'Tamanho', option: 'P' }] },
      { attributes: [{ name: 'tamanho', option: 'M' }, { name: 'cor', option: 'Preto' }] },
    ];

    const missing = missingCombos([size, color], variations);

    assert.equal(missing.length, 4);
    const keys = missing.map((combo) => comboKey(combo, [size, color]));
    assert.ok(!keys.includes(comboKey(variations[0].attributes, [size, color])));
    assert.ok(!keys.includes(comboKey(variations[1].attributes, [size, color])));
  });

  it('treats "any" variations as a different combination', () => {
    const missing = missingCombos([size, material], [{ attributes: [{ id: 1, option: 'P' }] }]);
    assert.equal(missing.length, 4);
  });

  it('returns nothing when no attribute is used for variations', () => {
    assert.deepEqual(missingCombos([], [{ attributes: [] }]), []);
  });
});
