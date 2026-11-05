import assert from 'node:assert/strict';
import test from 'node:test';
import { createUuid } from '../src/utils/uuid.js';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('createUuid genera un UUID v4 válido', () => {
  for (let index = 0; index < 25; index += 1) {
    assert.match(createUuid(), UUID_V4);
  }
});

test('createUuid no repite identificadores en una muestra amplia', () => {
  const values = new Set(Array.from({ length: 500 }, () => createUuid()));
  assert.equal(values.size, 500);
});
