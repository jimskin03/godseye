#!/usr/bin/env python3
"""Rendered mobile-layout regression check for the live God's Eye View UI."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("QA_BASE_URL", "http://127.0.0.1:5174")
STYLE_PATH = os.environ.get("QA_STYLE_PATH")
ROOT = Path(__file__).resolve().parents[1]
SHOT_DIR = ROOT / "qa-shots" / "mobile-layout"
CHROME = os.environ.get(
    "PLAYWRIGHT_CHROMIUM_EXECUTABLE",
    str(Path.home() / ".cache/ms-playwright/chromium-1234/chrome-linux64/chrome"),
)
VIEWPORTS = [(393, 852), (360, 740)]


def bounds(page, selector: str) -> dict:
    return page.eval_on_selector(
        selector,
        """el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return {
          left:r.left, right:r.right, top:r.top, bottom:r.bottom,
          width:r.width, height:r.height, overflowY:s.overflowY,
          visibility:s.visibility, display:s.display
        }}""",
    )


def within_viewport(rect: dict, width: int, inset: int = 8) -> bool:
    return rect["left"] >= inset - 0.5 and rect["right"] <= width - inset + 0.5


def intersects(a: dict, b: dict, gap: float = 0) -> bool:
    return not (
        a["right"] + gap <= b["left"]
        or b["right"] + gap <= a["left"]
        or a["bottom"] + gap <= b["top"]
        or b["bottom"] + gap <= a["top"]
    )


def main() -> int:
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    reports: list[dict] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.add_init_script("""
              localStorage.setItem('gev:first-run-mission:v1', 'suppressed');
              sessionStorage.setItem('gev:first-run-mission-session:v1', 'dismissed');
            """)
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60_000)
            if STYLE_PATH:
                page.add_style_tag(path=STYLE_PATH)
            page.wait_for_selector("#command-dock", state="attached", timeout=30_000)
            page.wait_for_function("window.__godsEyeView?.styleManager", timeout=60_000)
            page.evaluate("""() => {
              document.getElementById('loading-screen')?.classList.add('hidden');
              document.getElementById('intel-hud')?.classList.add('active');
            }""")

            viewport_report = {"viewport": [width, height], "states": {}}
            scroll_width = page.evaluate("document.documentElement.scrollWidth")
            if scroll_width > width:
                failures.append(f"{width}x{height}: document overflows horizontally ({scroll_width}px)")

            dock = bounds(page, "#command-dock")
            if dock["left"] < 8 or dock["right"] > width - 8:
                failures.append(f"{width}x{height}: command dock out of bounds {dock}")

            # The compact phone chrome must have separate, readable lanes.
            chrome_pairs = (
                ("title/actions", "#title-bar", "#top-center-actions"),
                ("style/actions", "#style-indicator", "#top-center-actions"),
                ("top HUD", ".hud-top-left", ".hud-top-right"),
                ("bottom HUD", ".hud-bottom-left", ".hud-bottom-right"),
                ("telemetry/credits", ".hud-bottom-left", "#cesium-credits"),
            )
            for label, first, second in chrome_pairs:
                first_rect = bounds(page, first)
                second_rect = bounds(page, second)
                if first_rect["width"] and second_rect["width"] and intersects(first_rect, second_rect, gap=4):
                    failures.append(
                        f"{width}x{height}: {label} overlap: {first} {first_rect} vs {second} {second_rect}"
                    )

            location_button = page.eval_on_selector(
                "#location-bar-toggle",
                """el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return {
                  width:r.width, height:r.height, background:s.backgroundColor,
                  color:s.color, iconVisible: el.querySelector('.dock-label-icon-location')?.getBoundingClientRect().width > 0
                }}""",
            )
            if location_button["width"] < 44 or location_button["height"] < 44:
                failures.append(f"{width}x{height}: location button is below 44px {location_button}")
            if location_button["background"] in ("rgb(239, 239, 239)", "rgb(255, 255, 255)"):
                failures.append(f"{width}x{height}: location button is still a blank white native control {location_button}")
            if not location_button["iconVisible"]:
                failures.append(f"{width}x{height}: location button icon is not visible {location_button}")

            preset_label = page.eval_on_selector(
                "#control-panel-toggle .panel-title",
                "el => ({ text: el.innerText.trim(), visibleWidth: el.clientWidth, fullWidth: el.scrollWidth })",
            )
            if preset_label["visibleWidth"] + 1 < preset_label["fullWidth"]:
                failures.append(f"{width}x{height}: PRESETS label is clipped {preset_label}")

            for selector in ("#location-bar", "#gev-voice-control", "#control-panel"):
                rect = bounds(page, f"#command-dock > {selector}")
                if rect["width"] < 44 or rect["height"] < 44:
                    failures.append(f"{width}x{height}: touch target {selector} is below 44px {rect}")

            controls_toggle = bounds(page, "#mobile-controls-toggle")
            closed_drawer = bounds(page, "#mobile-controls")
            if controls_toggle["width"] < 44 or controls_toggle["height"] < 44:
                failures.append(f"{width}x{height}: mobile Controls target is below 44px {controls_toggle}")
            if closed_drawer["width"] != 0 or closed_drawer["height"] != 0:
                failures.append(f"{width}x{height}: mobile panel rails obscure the map while closed {closed_drawer}")

            page.click("#mobile-controls-toggle")
            page.wait_for_function("document.getElementById('mobile-controls').classList.contains('mobile-controls-open')")
            drawer = bounds(page, "#mobile-controls")
            drawer_state = page.evaluate("""() => ({
              expanded: document.getElementById('mobile-controls-toggle').getAttribute('aria-expanded'),
              inert: document.getElementById('mobile-controls').inert,
              headers: [...document.querySelectorAll('#mobile-controls .panel-header, #mobile-controls .pp-header-row')]
                .filter(el => el.getBoundingClientRect().height > 0)
                .map(el => el.getBoundingClientRect().height)
            })""")
            viewport_report["drawer"] = {**drawer, "state": drawer_state}
            if not within_viewport(drawer, width):
                failures.append(f"{width}x{height}: mobile Controls drawer is horizontally clipped {drawer}")
            if drawer["top"] < 8 or drawer["bottom"] > height - 8 or drawer["overflowY"] not in ("auto", "scroll"):
                failures.append(f"{width}x{height}: mobile Controls drawer is vertically unreachable {drawer}")
            if drawer_state["expanded"] != "true" or drawer_state["inert"]:
                failures.append(f"{width}x{height}: mobile Controls drawer ARIA/inert state is wrong {drawer_state}")
            if any(header_height < 44 for header_height in drawer_state["headers"]):
                failures.append(f"{width}x{height}: mobile drawer contains undersized headers {drawer_state}")

            # Data Layers must own a bounded inner scroll lane. If the desktop
            # height:100% rule wins inside this drawer, the panel expands to its
            # full row height and only the outer drawer scrolls (the mobile bug).
            page.evaluate(
                "window.__godsEyeView.styleManager.setPanelCollapsed('data-panel', false, { explicit: true })"
            )
            page.wait_for_timeout(300)
            data_scroll = page.evaluate("""() => {
              const panel = document.getElementById('data-panel');
              const list = document.getElementById('data-toggles');
              const panelRect = panel.getBoundingClientRect();
              const drawerRect = document.getElementById('mobile-controls').getBoundingClientRect();
              const last = list.lastElementChild;
              const before = last?.getBoundingClientRect();
              list.scrollTop = list.scrollHeight;
              const after = last?.getBoundingClientRect();
              const listRect = list.getBoundingClientRect();
              return {
                panelBottom: panelRect.bottom,
                drawerBottom: drawerRect.bottom,
                clientHeight: list.clientHeight,
                scrollHeight: list.scrollHeight,
                scrollTop: list.scrollTop,
                lastInitiallyVisible: Boolean(before && before.top >= listRect.top - 0.5 && before.bottom <= listRect.bottom + 0.5),
                lastVisibleAfterScroll: Boolean(after && after.top >= listRect.top - 0.5 && after.bottom <= listRect.bottom + 0.5),
              };
            }""")
            viewport_report["dataLayers"] = data_scroll
            if data_scroll["panelBottom"] > data_scroll["drawerBottom"] + 0.5:
                failures.append(f"{width}x{height}: Data Layers panel escapes the mobile drawer {data_scroll}")
            if data_scroll["scrollHeight"] <= data_scroll["clientHeight"] or data_scroll["scrollTop"] <= 0:
                failures.append(f"{width}x{height}: Data Layers list has no independent scroll range {data_scroll}")
            if data_scroll["lastInitiallyVisible"] or not data_scroll["lastVisibleAfterScroll"]:
                failures.append(f"{width}x{height}: Data Layers final row is not revealable by list scrolling {data_scroll}")
            page.screenshot(path=str(SHOT_DIR / f"{width}x{height}-data-layers.png"), full_page=False)
            page.evaluate(
                "window.__godsEyeView.styleManager.setPanelCollapsed('data-panel', true, { explicit: true })"
            )
            page.screenshot(path=str(SHOT_DIR / f"{width}x{height}-controls-drawer.png"), full_page=False)
            page.keyboard.press("Escape")
            page.wait_for_function("!document.getElementById('mobile-controls').classList.contains('mobile-controls-open')")
            escape_state = page.evaluate("""() => ({
              expanded: document.getElementById('mobile-controls-toggle').getAttribute('aria-expanded'),
              focused: document.activeElement?.id
            })""")
            if escape_state != {"expanded": "false", "focused": "mobile-controls-toggle"}:
                failures.append(f"{width}x{height}: Escape does not close drawer and return focus {escape_state}")

            page.focus("#location-bar-toggle")
            page.keyboard.press("Enter")
            page.wait_for_function("document.getElementById('location-bar-toggle').getAttribute('aria-expanded') === 'true'")
            page.keyboard.press("Enter")
            page.wait_for_function("document.getElementById('location-bar-toggle').getAttribute('aria-expanded') === 'false'")

            for panel, popover in (
                ("#location-bar", "#location-bar .dock-popover-content"),
                ("#control-panel", "#control-panel-popover"),
            ):
                panel_id = panel.removeprefix("#")
                page.evaluate(
                    "panelId => window.__godsEyeView.styleManager.setPanelCollapsed(panelId, false, { explicit: true })",
                    panel_id,
                )
                page.wait_for_function(
                    "panelId => !document.getElementById(panelId).classList.contains('collapsed')",
                    arg=panel_id,
                )
                page.wait_for_timeout(300)
                rect = bounds(page, popover)
                content = page.eval_on_selector(
                    popover,
                    """el => {
                      const shell = el.getBoundingClientRect();
                      const visibleControls = [...el.querySelectorAll('button, input, select, [role="button"]')]
                        .filter(node => {
                          const r = node.getBoundingClientRect();
                          const s = getComputedStyle(node);
                          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
                        })
                        .map(node => { const r = node.getBoundingClientRect(); return {
                          label: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 32),
                          left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                          width: r.width, height: r.height
                        }});
                      return {
                        clientWidth: el.clientWidth,
                        scrollWidth: el.scrollWidth,
                        clippedControls: visibleControls.filter(r => r.left < shell.left || r.right > shell.right),
                        undersizedControls: visibleControls.filter(r => r.width < 43.5 || r.height < 43.5)
                      };
                    }""",
                )
                viewport_report["states"][panel] = {**rect, "content": content}
                if not within_viewport(rect, width):
                    failures.append(f"{width}x{height}: {popover} is horizontally clipped {rect}")
                if content["scrollWidth"] > content["clientWidth"] + 1:
                    failures.append(
                        f"{width}x{height}: {popover} content overflows horizontally "
                        f"({content['scrollWidth']}px > {content['clientWidth']}px)"
                    )
                if content["clippedControls"]:
                    failures.append(
                        f"{width}x{height}: {popover} hides controls {content['clippedControls']}"
                    )
                if content["undersizedControls"]:
                    failures.append(
                        f"{width}x{height}: {popover} has touch targets below 44px "
                        f"{content['undersizedControls']}"
                    )
                if rect["top"] < 8 or rect["bottom"] > height - 8:
                    failures.append(f"{width}x{height}: {popover} is vertically unreachable {rect}")
                if rect["height"] > height * 0.72 and rect["overflowY"] not in ("auto", "scroll"):
                    failures.append(f"{width}x{height}: {popover} cannot scroll when tall {rect}")
                page.screenshot(
                    path=str(SHOT_DIR / f"{width}x{height}-{panel_id}.png"),
                    full_page=False,
                )
                page.evaluate(
                    "panelId => window.__godsEyeView.styleManager.setPanelCollapsed(panelId, true, { explicit: true })",
                    panel_id,
                )
                page.wait_for_timeout(350)

            left = bounds(page, "#left-panel-stack")
            right = bounds(page, "#right-context-rail")
            viewport_report["leftRail"] = left
            viewport_report["rightRail"] = right
            for name, rect in (("left rail", left), ("right rail", right)):
                if rect["width"] > 0 and (rect["left"] < 8 or rect["right"] > width - 8):
                    failures.append(f"{width}x{height}: {name} is horizontally clipped {rect}")

            page.screenshot(path=str(SHOT_DIR / f"{width}x{height}.png"), full_page=False)
            reports.append(viewport_report)
            page.close()
        browser.close()

    print(json.dumps(reports, indent=2))
    if failures:
        print("\nMOBILE LAYOUT FAILURES:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print("\nMobile layout checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
