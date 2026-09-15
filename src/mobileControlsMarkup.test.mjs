import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');

test('Location is a semantic disclosure with a labelled region', () => {
  assert.match(html, /<button id="location-bar-toggle"[\s\S]*?data-dock-toggle-target="location-bar"[\s\S]*?aria-controls="location-bar-popover"/);
  assert.match(html, /<div id="location-bar-popover" class="dock-popover-content" role="region" aria-labelledby="location-bar-toggle">/);
});

test('mobile controls use one explicit drawer around both panel rails', () => {
  assert.match(html, /<button id="mobile-controls-toggle"[\s\S]*?aria-controls="mobile-controls"[\s\S]*?aria-expanded="false"/);
  assert.match(html, /<div id="mobile-controls"[\s\S]*?<div id="left-panel-stack">[\s\S]*?<aside id="right-context-rail">[\s\S]*?<\/aside>[\s\S]*?<\/div>/);
  assert.match(ui, /_initMobileControls\(\)/);
  assert.match(ui, /mobile-controls-open/);
  assert.match(ui, /mobileControlsMedia/);
});

test('mobile CSS protects safe areas, drawer scrolling, and coarse-pointer targets', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /#mobile-controls-toggle/);
  assert.match(css, /#mobile-controls\.mobile-controls-open/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(max-width: 620px\), \(pointer: coarse\)/);
  assert.match(css, /min-height: 44px/);
});

test('opening a primary mobile drawer panel collapses its siblings', () => {
  const method = ui.slice(ui.indexOf('setPanelCollapsed(panelId, collapsed'), ui.indexOf('toggleCleanView(forceEnabled)'));
  assert.match(method, /MOBILE_DRAWER_PANEL_IDS/);
  assert.match(method, /matchMedia\('\(max-width: 620px\)'\)/);
  assert.match(method, /setPanelCollapsed\(siblingId, true/);
});
