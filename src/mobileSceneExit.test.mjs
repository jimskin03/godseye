import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const directorCode = fs.readFileSync(path.join(root, 'src/scenes/director.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');

test('scene runtime banner has accessible stop/exit button and label', () => {
  assert.match(html, /<div id="scene-runtime"[\s\S]*?class="scene-runtime"/);
  assert.match(html, /<span id="scene-runtime-label" class="scene-runtime-label"><\/span>/);
  assert.match(html, /<button id="scene-runtime-stop-btn" class="scene-runtime-stop-btn"[^>]*aria-label="Exit scene and return to main menu"/);
  assert.match(html, /EXIT SCENE/);
});

test('SceneDirector hooks up runtime stop button and dismisses mobile drawer on playback', () => {
  assert.match(directorCode, /this\._sceneRuntimeStopBtn = document\.getElementById\('scene-runtime-stop-btn'\);/);
  assert.match(directorCode, /this\._sceneRuntimeStopBtn\?\.addEventListener\('click'/);
  assert.match(directorCode, /this\._sceneRuntime\?\.addEventListener\('click'/);
  assert.match(directorCode, /closeMobileControls/);
});

test('StyleManager provides closeMobileControls and calls it when recording mode engages', () => {
  assert.match(uiCode, /closeMobileControls\(/);
  assert.match(uiCode, /this\.closeMobileControls\(\);/);
});

test('CSS hides mobile controls drawer and toggle during scene playback and recording mode', () => {
  assert.match(css, /body\.recording-mode #mobile-controls-toggle/);
  assert.match(css, /body\.recording-mode #mobile-controls/);
  assert.match(css, /body\.scene-playback-mode :is\(#mobile-controls-toggle, #mobile-controls\)/);
  assert.match(css, /\.scene-runtime-stop-btn/);
  assert.match(css, /z-index:\s*310;/);
});
