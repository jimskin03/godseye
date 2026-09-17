/**
 * @module aseanRegional
 *
 * Southeast Asian (ASEAN) regional context, geobounds, and disaster/hazard warning helpers.
 * Covers Malaysia, Singapore, Thailand, Vietnam, Indonesia, Philippines, and Brunei.
 *
 * Pure data normalizers — preserving source truth and UNKNOWN severity rather than inventing levels.
 */

export const ASEAN_BOUNDS = Object.freeze({ south: -11.5, west: 95.0, north: 28.5, east: 141.5 });

export const MALAYSIA_BOUNDS = Object.freeze({ south: 0.8, west: 99.5, north: 7.5, east: 119.5 });
export const SINGAPORE_BOUNDS = Object.freeze({ south: 1.15, west: 103.60, north: 1.48, east: 104.05 });
export const THAILAND_BOUNDS = Object.freeze({ south: 5.6, west: 97.3, north: 20.5, east: 105.7 });
export const VIETNAM_BOUNDS = Object.freeze({ south: 8.5, west: 102.1, north: 23.4, east: 109.5 });
export const INDONESIA_BOUNDS = Object.freeze({ south: -11.1, west: 95.0, north: 6.1, east: 141.1 });
export const PHILIPPINES_BOUNDS = Object.freeze({ south: 4.5, west: 116.8, north: 21.3, east: 126.6 });
export const BRUNEI_BOUNDS = Object.freeze({ south: 4.0, west: 114.0, north: 5.1, east: 115.4 });

export const ASEAN_COUNTRY_CONFIGS = Object.freeze({
  MY: {
    country: 'Malaysia',
    bounds: MALAYSIA_BOUNDS,
    timezone: 'Asia/Kuala_Lumpur',
    locale: 'en-MY',
  },
  SG: {
    country: 'Singapore',
    bounds: SINGAPORE_BOUNDS,
    timezone: 'Asia/Singapore',
    locale: 'en-SG',
  },
  TH: {
    country: 'Thailand',
    bounds: THAILAND_BOUNDS,
    timezone: 'Asia/Bangkok',
    locale: 'th-TH',
  },
  VN: {
    country: 'Vietnam',
    bounds: VIETNAM_BOUNDS,
    timezone: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
  },
  ID: {
    country: 'Indonesia',
    bounds: INDONESIA_BOUNDS,
    timezone: 'Asia/Jakarta',
    locale: 'id-ID',
  },
  PH: {
    country: 'Philippines',
    bounds: PHILIPPINES_BOUNDS,
    timezone: 'Asia/Manila',
    locale: 'en-PH',
  },
  BN: {
    country: 'Brunei',
    bounds: BRUNEI_BOUNDS,
    timezone: 'Asia/Brunei',
    locale: 'ms-BN',
  },
});

export const ASEAN_REGION_ALIASES = Object.freeze({
  // Malaysia
  kl: 'Kuala Lumpur',
  'k l': 'Kuala Lumpur',
  pj: 'Petaling Jaya',
  jb: 'Johor Bahru',
  kk: 'Kota Kinabalu',
  penang: 'Penang',
  'pulau pinang': 'Penang',
  selangor: 'Selangor',
  johor: 'Johor',
  sabah: 'Sabah',
  sarawak: 'Sarawak',
  kuching: 'Kuching',
  putrajaya: 'Putrajaya',

  // Singapore
  sg: 'Singapore',
  changi: 'Singapore Changi',
  sentosa: 'Sentosa',
  'marina bay': 'Marina Bay',

  // Thailand
  bkk: 'Bangkok',
  bangkok: 'Bangkok',
  'chiang mai': 'Chiang Mai',
  phuket: 'Phuket',
  pattaya: 'Pattaya',

  // Vietnam
  hanoi: 'Hanoi',
  hcmc: 'Ho Chi Minh City',
  saigon: 'Ho Chi Minh City',
  'ho chi minh': 'Ho Chi Minh City',
  'da nang': 'Da Nang',

  // Indonesia
  jkt: 'Jakarta',
  jakarta: 'Jakarta',
  bali: 'Bali',
  denpasar: 'Denpasar',
  surabaya: 'Surabaya',
  bandung: 'Bandung',
  medan: 'Medan',

  // Philippines
  mnl: 'Manila',
  manila: 'Manila',
  bgc: 'Bonifacio Global City',
  makati: 'Makati',
  cebu: 'Cebu City',
  davao: 'Davao City',

  // Brunei
  bsb: 'Bandar Seri Begawan',
  brunei: 'Bandar Seri Begawan',
  tutong: 'Tutong',
  belait: 'Belait',
  temburong: 'Temburong',
});

function isCoordInBounds(lat, lon, bounds) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= bounds.south
    && latitude <= bounds.north
    && longitude >= bounds.west
    && longitude <= bounds.east;
}

export function isMalaysiaPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, MALAYSIA_BOUNDS);
}

export function isSingaporePoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, SINGAPORE_BOUNDS);
}

export function isThailandPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, THAILAND_BOUNDS);
}

export function isVietnamPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, VIETNAM_BOUNDS);
}

export function isIndonesiaPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, INDONESIA_BOUNDS);
}

export function isPhilippinesPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, PHILIPPINES_BOUNDS);
}

export function isBruneiPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, BRUNEI_BOUNDS);
}

export function isAseanPoint(latitude, longitude) {
  return isCoordInBounds(latitude, longitude, ASEAN_BOUNDS);
}

/**
 * Resolve an ASEAN country code from WGS84 point coordinates.
 * Order: specific high-density enclaves (SG, BN) checked before overlapping regional bounds.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {'MY'|'SG'|'TH'|'VN'|'ID'|'PH'|'BN'|null}
 */
export function detectAseanCountry(latitude, longitude) {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isSingaporePoint(lat, lon)) return 'SG';
  if (isBruneiPoint(lat, lon)) return 'BN';
  if (isMalaysiaPoint(lat, lon)) return 'MY';
  if (isThailandPoint(lat, lon)) return 'TH';
  if (isVietnamPoint(lat, lon)) return 'VN';
  if (isPhilippinesPoint(lat, lon)) return 'PH';
  if (isIndonesiaPoint(lat, lon)) return 'ID';

  return null;
}

export function aseanQueryAlias(value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ASEAN_REGION_ALIASES[key] || null;
}

function cleanText(value, max = 160) {
  const result = String(value ?? '').replace(/\s+/g, ' ').trim();
  return result ? result.slice(0, max) : null;
}

function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'results', 'warnings', 'alerts', 'items', 'features']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

/**
 * Standardize multi-agency hazard and disaster warnings (AHA Centre, BMKG, PAGASA, TMD, MET Malaysia, etc.)
 * @param {object|Array} payload
 * @param {string} [source='ASEAN Disaster & Weather Warning']
 * @returns {Array<object>}
 */
export function normalizeAseanWarnings(payload, source = 'ASEAN Disaster & Weather Warning') {
  return rowsFrom(payload).map((row, index) => {
    // Support GeoJSON Feature shapes
    const props = row?.properties || row;
    const geometry = row?.geometry;
    const coords = geometry?.coordinates;

    const lat = Number(props.latitude ?? props.lat ?? props.location?.latitude ?? (coords ? coords[1] : null));
    const lon = Number(props.longitude ?? props.lon ?? props.lng ?? props.location?.longitude ?? (coords ? coords[0] : null));
    const country = cleanText(props.country_code ?? props.countryCode ?? props.country ?? detectAseanCountry(lat, lon), 4)?.toUpperCase() || null;

    return {
      id: cleanText(props.id ?? props.warning_id ?? props.alert_id ?? props.code) || `ASEAN-WARN-${String(index).padStart(4, '0')}`,
      title: cleanText(props.title ?? props.name ?? props.headline ?? props.type) || 'Regional hazard warning',
      area: cleanText(props.area ?? props.district ?? props.province ?? props.state ?? props.location?.name),
      severity: cleanText(props.severity ?? props.level ?? props.status)?.toUpperCase() || 'UNKNOWN',
      issuedAt: cleanText(props.issued_at ?? props.issuedAt ?? props.datetime ?? props.timestamp, 40),
      updatedAt: cleanText(props.updated_at ?? props.updatedAt ?? props.last_updated, 40),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      countryCode: country,
      source,
    };
  }).filter((row) => row.title || row.area || row.latitude !== null || row.longitude !== null);
}

export function aseanWarningStats(payload, source) {
  const warnings = normalizeAseanWarnings(payload, source);
  const severeKeys = new Set(['SEVERE', 'DANGER', 'EMERGENCY', 'RED', 'CRITICAL', 'HIGH']);
  return {
    count: warnings.length,
    severe: warnings.filter((row) => severeKeys.has(row.severity)).length,
    warnings,
  };
}

/**
 * Resolves regional localization config (country code, timezone, locale, alias) for a given point and optional place.
 * Backwards-compatible with Malaysia point queries while expanding to all 7 ASEAN nations.
 * @param {{latitude?: number, longitude?: number}|null} point
 * @param {object|null} [place=null]
 * @returns {{countryCode: string|null, timezone: string|null, locale: string, regionAlias: string|null}}
 */
export function resolveAseanLocalization(point, place = null) {
  const codeFromPlace = cleanText(place?.countryCode, 4)?.toUpperCase();
  const detectedCode = codeFromPlace
    || (point ? detectAseanCountry(point.latitude, point.longitude) : null);

  const config = detectedCode ? ASEAN_COUNTRY_CONFIGS[detectedCode] : null;

  if (config) {
    let tz = config.timezone;
    // Special handling for Indonesia's three timezone zones (WIB, WITA, WIT)
    if (detectedCode === 'ID' && Number.isFinite(Number(point?.longitude))) {
      const lon = Number(point.longitude);
      if (lon > 130) tz = 'Asia/Jayapura';
      else if (lon > 115) tz = 'Asia/Makassar';
    }

    return {
      countryCode: detectedCode,
      timezone: tz,
      locale: config.locale,
      regionAlias: aseanQueryAlias(place?.locality || place?.region),
    };
  }

  return {
    countryCode: codeFromPlace || null,
    timezone: null,
    locale: 'en-US',
    regionAlias: aseanQueryAlias(place?.locality || place?.region),
  };
}
