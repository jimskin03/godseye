import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMalaysiaPoint,
  malaysiaQueryAlias,
  normalizeMalaysiaWarnings,
  malaysiaWarningStats,
} from './malaysiaRegional.js';
import { regionalLocalization } from './regionalBrief.js';

test('Malaysia bounds and common aliases are deterministic', () => {
  assert.equal(isMalaysiaPoint(3.14, 101.69), true);
  assert.equal(isMalaysiaPoint(40.7, -74), false);
  assert.equal(malaysiaQueryAlias('KL'), 'Kuala Lumpur');
  assert.equal(malaysiaQueryAlias('  PJ '), 'Petaling Jaya');
});

test('Malaysia warning normalizer preserves unknown severity', () => {
  const result = normalizeMalaysiaWarnings({ data: [{ id: 'f1', district: 'Petaling', lat: '3.1', lon: '101.6' }] }, 'test');
  assert.deepEqual(result[0], {
    id: 'f1', title: 'Malaysia warning', area: 'Petaling', severity: 'UNKNOWN',
    issuedAt: null, updatedAt: null, latitude: 3.1, longitude: 101.6, source: 'test',
  });
});

test('warning stats count severe rows', () => {
  const stats = malaysiaWarningStats({ warnings: [{ name: 'A', severity: 'red' }, { name: 'B', severity: 'info' }] }, 'test');
  assert.equal(stats.count, 2);
  assert.equal(stats.severe, 1);
});

test('regional localization selects Malaysia timezone from coordinates', () => {
  assert.deepEqual(regionalLocalization({ latitude: 3.14, longitude: 101.69 }), {
    countryCode: 'MY', timezone: 'Asia/Kuala_Lumpur', locale: 'en-MY', regionAlias: null,
  });
});
