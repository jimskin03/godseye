import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
const actions = fs.readFileSync(path.join(root, 'src/voice/gevActions.js'), 'utf8');
const vite = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');

test('index.html contains accessible My Location buttons in navigation and location dock', () => {
  // Top center action button
  assert.match(
    html,
    /<button id="my-location-nav-btn"[^>]*aria-label="Fly to my location"[^>]*title="Fly to my location \(GPS\)"/i,
    'Top-center actions must contain #my-location-nav-btn'
  );
  assert.match(
    html,
    /<button id="my-location-nav-btn"[^>]*>[\s\S]*?<span class="material-symbols-outlined"[^>]*>my_location<\/span>/i,
    '#my-location-nav-btn must contain the my_location icon'
  );

  // Location search bar button
  assert.match(
    html,
    /<button id="my-location-btn" class="my-location-btn"[^>]*aria-label="Fly to my location"/i,
    'Location tray must contain #my-location-btn'
  );
  assert.match(
    html,
    /<button id="my-location-btn"[^>]*>[\s\S]*?<span class="material-symbols-outlined"[^>]*>my_location<\/span>/i,
    '#my-location-btn must contain the my_location icon'
  );
});

test('style.css defines styling and animation for My Location buttons', () => {
  assert.match(css, /\.my-location-btn\s*\{/);
  assert.match(css, /\.my-location-btn\.locating/);
  assert.match(css, /#top-center-actions #my-location-nav-btn\.locating/);
  assert.match(css, /@keyframes locating-pulse/);
  assert.match(css, /#command-dock \.my-location-btn/);
  assert.match(css, /grid-template-columns:\s*2\.75rem\s+2\.75rem\s+minmax\(0,\s*1fr\)/);
});

test('src/ui.js implements locateUser and wires both My Location buttons', () => {
  assert.match(ui, /this\._myLocationNavBtn\s*=\s*document\.getElementById\('my-location-nav-btn'\)/);
  assert.match(ui, /this\._myLocationBtn\s*=\s*document\.getElementById\('my-location-btn'\)/);
  assert.match(ui, /_initMyLocation\(\)/);
  assert.match(ui, /async locateUser\(\)/);
  assert.match(ui, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(ui, /user-current-location/);
  assert.match(ui, /📍 YOU ARE HERE/);
  assert.match(ui, /Location access denied/);
  assert.match(ui, /Location position unavailable/);
  assert.match(ui, /Location request timed out/);
});

test('locateUser handles camera flight and UI state updating properly', () => {
  const methodStart = ui.indexOf('async locateUser() {');
  assert.ok(methodStart > 0, 'locateUser method must exist');
  const methodEnd = ui.indexOf('  /** Wire the top-center action that clears', methodStart);
  const methodBody = ui.slice(methodStart, methodEnd > methodStart ? methodEnd : methodStart + 2500);

  // Guards against concurrent geolocation requests
  assert.match(methodBody, /if \(this\._isLocatingUser\) return null;/);
  // Toast on missing geolocation
  assert.match(methodBody, /this\._showToast\('Geolocation is not supported by your browser'\);/);
  // Stops orbit
  assert.match(methodBody, /this\.orbitController\.stop\(\);/);
  // Flies to landmark with 1800m range and -35 pitch
  assert.match(methodBody, /flyToLandmark\(this\.viewer,\s*lat,\s*lon,\s*\{[\s\S]*?range:\s*1800,\s*pitch:\s*-35/);
  // Sets searchedLocationLabel and updates mini status
  assert.match(methodBody, /this\._searchedLocationLabel\s*=\s*label;/);
  assert.match(methodBody, /this\._updateLocationMiniStatus\(\);/);
});

test('voice actions handle my_location and query routing to locateUser', () => {
  assert.match(actions, /name === 'my_location'/);
  assert.match(actions, /styleManager\.locateUser\(\)/);
  assert.match(actions, /q === 'my location'/);
});
