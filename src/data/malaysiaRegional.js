/** Malaysia-specific Phase 1 regional context helpers.
 *
 * These pure normalizers deliberately accept the documented Open API shapes plus
 * common wrapper forms, while preserving UNKNOWN rather than inventing severity.
 */

export const MALAYSIA_BOUNDS = Object.freeze({ south: 0.8, west: 99.5, north: 7.5, east: 119.5 });

export const MALAYSIA_REGION_ALIASES = Object.freeze({
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
});

export function isMalaysiaPoint(latitude, longitude) {
  return Number.isFinite(Number(latitude))
    && Number.isFinite(Number(longitude))
    && Number(latitude) >= MALAYSIA_BOUNDS.south
    && Number(latitude) <= MALAYSIA_BOUNDS.north
    && Number(longitude) >= MALAYSIA_BOUNDS.west
    && Number(longitude) <= MALAYSIA_BOUNDS.east;
}

export function malaysiaQueryAlias(value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return MALAYSIA_REGION_ALIASES[key] || null;
}

function text(value, max = 160) {
  const result = String(value ?? '').replace(/\s+/g, ' ').trim();
  return result ? result.slice(0, max) : null;
}

function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'results', 'warnings', 'alerts', 'items']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

/** Normalize flood-warning rows into the app's source-stamped point/area contract. */
export function normalizeMalaysiaWarnings(payload, source = 'Malaysia Official Open API') {
  return rowsFrom(payload).map((row, index) => {
    const lat = Number(row.latitude ?? row.lat ?? row.location?.latitude);
    const lon = Number(row.longitude ?? row.lon ?? row.lng ?? row.location?.longitude);
    return {
      id: text(row.id ?? row.warning_id ?? row.code) || `MY-WARNING-${String(index).padStart(4, '0')}`,
      title: text(row.title ?? row.name ?? row.type) || 'Malaysia warning',
      area: text(row.area ?? row.district ?? row.state ?? row.location?.name),
      severity: text(row.severity ?? row.level ?? row.status)?.toUpperCase() || 'UNKNOWN',
      issuedAt: text(row.issued_at ?? row.issuedAt ?? row.datetime ?? row.timestamp, 40),
      updatedAt: text(row.updated_at ?? row.updatedAt ?? row.last_updated, 40),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      source,
    };
  }).filter((row) => row.title || row.area || row.latitude !== null || row.longitude !== null);
}

export function malaysiaWarningStats(payload, source) {
  const warnings = normalizeMalaysiaWarnings(payload, source);
  return {
    count: warnings.length,
    severe: warnings.filter((row) => ['SEVERE', 'DANGER', 'EMERGENCY', 'RED'].includes(row.severity)).length,
    warnings,
  };
}
