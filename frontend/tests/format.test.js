import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBytes,
  formatDate,
  formatNumber,
  initials,
  normalizeText
} from '../src/utils/format.js';

test('normalizeText elimina acentos, mayúsculas y espacios extremos', () => {
  assert.equal(normalizeText('  María  GONZÁLEZ  '), 'maria gonzalez');
  assert.equal(normalizeText('Instalación eléctrica'), 'instalacion electrica');
  assert.equal(normalizeText('ÁÉÍÓÚÜÑ'), 'aeiouun');
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(undefined), '');
  assert.equal(normalizeText(123), '123');
});

test('initials genera iniciales para nombres de una o varias palabras', () => {
  assert.equal(initials('Luis Ramírez'), 'LR');
  assert.equal(initials('Ana María López García'), 'AG');
  assert.equal(initials('Pedro'), 'PE');
  assert.equal(initials('   '), 'TS');
  assert.equal(initials(null), 'TS');
});

test('formatBytes usa unidades legibles y valores límite', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-10), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1024 * 1024), '1.0 MB');
  assert.equal(formatBytes(1024 ** 3), '1.0 GB');
  assert.equal(formatBytes(Number.NaN), '0 B');
});

test('formatNumber usa separadores de la configuración es-MX', () => {
  assert.equal(formatNumber(1234567), new Intl.NumberFormat('es-MX').format(1234567));
  assert.equal(formatNumber(null), '0');
  assert.equal(formatNumber('no-numero'), '0');
});

test('formatDate devuelve un guion para valores inválidos', () => {
  assert.equal(formatDate(''), '—');
  assert.equal(formatDate('no-es-fecha'), '—');
  assert.equal(formatDate(null), '—');
  assert.notEqual(formatDate('2026-11-05T12:00:00.000Z'), '—');
});
