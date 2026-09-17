import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASEAN_BOUNDS,
  isAseanPoint,
  detectAseanCountry,
  aseanQueryAlias,
  normalizeAseanWarnings,
  aseanWarningStats,
  resolveAseanLocalization,
} from './aseanRegional.js';

test('detectAseanCountry correctly identifies all 7 Southeast Asian nations from coordinates', () => {
  // Malaysia: Kuala Lumpur (3.14, 101.69)
  assert.equal(detectAseanCountry(3.14, 101.69), 'MY');

  // Singapore: Marina Bay (1.28, 103.85)
  assert.equal(detectAseanCountry(1.28, 103.85), 'SG');

  // Thailand: Bangkok (13.75, 100.50)
  assert.equal(detectAseanCountry(13.75, 100.50), 'TH');

  // Vietnam: Hanoi (21.03, 105.85)
  assert.equal(detectAseanCountry(21.03, 105.85), 'VN');

  // Indonesia: Jakarta (-6.20, 106.82)
  assert.equal(detectAseanCountry(-6.20, 106.82), 'ID');

  // Philippines: Manila (14.60, 120.98)
  assert.equal(detectAseanCountry(14.60, 120.98), 'PH');

  // Brunei: Bandar Seri Begawan (4.90, 114.93)
  assert.equal(detectAseanCountry(4.90, 114.93), 'BN');

  // Outside ASEAN: New York (40.71, -74.00), Tokyo (35.68, 139.69), London (51.50, -0.12)
  assert.equal(detectAseanCountry(40.71, -74.00), null);
  assert.equal(detectAseanCountry(35.68, 139.69), null);
  assert.equal(detectAseanCountry(51.50, -0.12), null);
});

test('ASEAN macro bounds and query aliases resolve correctly', () => {
  assert.equal(isAseanPoint(3.14, 101.69), true);
  assert.equal(isAseanPoint(1.35, 103.82), true);
  assert.equal(isAseanPoint(13.75, 100.50), true);
  assert.equal(isAseanPoint(40.71, -74.00), false);

  assert.equal(aseanQueryAlias('KL'), 'Kuala Lumpur');
  assert.equal(aseanQueryAlias('BKK'), 'Bangkok');
  assert.equal(aseanQueryAlias('HCMC'), 'Ho Chi Minh City');
  assert.equal(aseanQueryAlias('JKT'), 'Jakarta');
  assert.equal(aseanQueryAlias('MNL'), 'Manila');
  assert.equal(aseanQueryAlias('BSB'), 'Bandar Seri Begawan');
  assert.equal(aseanQueryAlias('SG'), 'Singapore');
});

test('normalizeAseanWarnings normalizes multi-agency disaster/hazard feeds', () => {
  const payload = {
    features: [
      {
        properties: {
          id: 'FL-001',
          headline: 'Severe Monsoon Flash Flood Warning',
          province: 'Kelantan',
          severity: 'DANGER',
          datetime: '2026-09-17T08:00:00Z',
          countryCode: 'MY',
        },
        geometry: { coordinates: [102.24, 6.12] },
      },
      {
        properties: {
          id: 'TY-002',
          title: 'Tropical Cyclone Signal No. 3',
          area: 'Cagayan',
          severity: 'EMERGENCY',
          timestamp: '2026-09-17T09:00:00Z',
          countryCode: 'PH',
          latitude: 18.2,
          longitude: 121.7,
        },
      },
    ],
  };

  const warnings = normalizeAseanWarnings(payload, 'AHA Centre');
  assert.equal(warnings.length, 2);
  assert.equal(warnings[0].id, 'FL-001');
  assert.equal(warnings[0].severity, 'DANGER');
  assert.equal(warnings[0].countryCode, 'MY');
  assert.equal(warnings[0].latitude, 6.12);
  assert.equal(warnings[0].longitude, 102.24);

  assert.equal(warnings[1].id, 'TY-002');
  assert.equal(warnings[1].severity, 'EMERGENCY');
  assert.equal(warnings[1].countryCode, 'PH');

  const stats = aseanWarningStats(payload, 'AHA Centre');
  assert.equal(stats.count, 2);
  assert.equal(stats.severe, 2);
});

test('resolveAseanLocalization configures timezones and locales for all 7 ASEAN countries', () => {
  // Malaysia
  const my = resolveAseanLocalization({ latitude: 3.14, longitude: 101.69 });
  assert.equal(my.countryCode, 'MY');
  assert.equal(my.timezone, 'Asia/Kuala_Lumpur');
  assert.equal(my.locale, 'en-MY');

  // Singapore
  const sg = resolveAseanLocalization({ latitude: 1.28, longitude: 103.85 });
  assert.equal(sg.countryCode, 'SG');
  assert.equal(sg.timezone, 'Asia/Singapore');
  assert.equal(sg.locale, 'en-SG');

  // Thailand
  const th = resolveAseanLocalization({ latitude: 13.75, longitude: 100.50 });
  assert.equal(th.countryCode, 'TH');
  assert.equal(th.timezone, 'Asia/Bangkok');
  assert.equal(th.locale, 'th-TH');

  // Vietnam
  const vn = resolveAseanLocalization({ latitude: 21.03, longitude: 105.85 });
  assert.equal(vn.countryCode, 'VN');
  assert.equal(vn.timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(vn.locale, 'vi-VN');

  // Indonesia
  const id = resolveAseanLocalization({ latitude: -6.20, longitude: 106.82 });
  assert.equal(id.countryCode, 'ID');
  assert.equal(id.timezone, 'Asia/Jakarta');
  assert.equal(id.locale, 'id-ID');

  // Philippines
  const ph = resolveAseanLocalization({ latitude: 14.60, longitude: 120.98 });
  assert.equal(ph.countryCode, 'PH');
  assert.equal(ph.timezone, 'Asia/Manila');
  assert.equal(ph.locale, 'en-PH');

  // Brunei
  const bn = resolveAseanLocalization({ latitude: 4.90, longitude: 114.93 });
  assert.equal(bn.countryCode, 'BN');
  assert.equal(bn.timezone, 'Asia/Brunei');
  assert.equal(bn.locale, 'ms-BN');
});
