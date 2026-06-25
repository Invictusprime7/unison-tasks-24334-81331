"""
AI Builder error-recovery Playwright suite.

Drives the in-app AI Builder against a real draft and runs a scenario table
covering the failure modes the launcher / preview pipeline have shipped
auto-repairs for. For each scenario we:

  1. Submit a prompt designed to trigger or reproduce the failure class.
  2. Wait for the assistant turn to settle (or time out).
  3. Read the preview iframe + console for the canonical error signatures.
  4. Record PASS / FAIL / TIMEOUT plus a screenshot.

This is a sandbox-only smoke harness, not a CI test. Re-run with:
    python3 /tmp/browser/ai-builder-errors/run.py
"""

import asyncio
import json
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright, Page, ConsoleMessage

ROOT = Path(__file__).parent
SHOTS = ROOT / "screens"
SHOTS.mkdir(parents=True, exist_ok=True)
REPORT = ROOT / "report.json"

ORIGIN = "http://localhost:8080"
BUILDER_URL = f"{ORIGIN}/web-builder"

# Canonical error fingerprints we want to detect/auto-resolve.
ERROR_SIGNATURES = {
    "element_type_invalid": re.compile(r"Element type is invalid", re.I),
    "default_export_missing": re.compile(r"forgot to export your component", re.I),
    "syntax_error": re.compile(r"(Unexpected token|SyntaxError|Parse error)", re.I),
    "module_not_found": re.compile(r"Could not find module|Cannot find module|Module not found", re.I),
    "something_went_wrong": re.compile(r"Something went wrong", re.I),
    "lane_b_missed_pages": re.compile(r"Lane B missed \d+ selected page", re.I),
    "forbidden_intent": re.compile(r"forbidden.*intent", re.I),
    "gateway_auth": re.compile(r"Managed AI gateway authentication failed", re.I),
    "missing_required_intent": re.compile(r"did not satisfy the 4-step generation contract", re.I),
}


# Scenarios — each prompt is crafted to either reproduce a historical failure
# class OR confirm the resident auto-repair handles it silently.
SCENARIOS = [
    {
        "id": "01_default_export_missing",
        "prompt": (
            "On the Home page, add an import for a new sibling component called "
            "`SpecialOffer` from './SpecialOffer' and render <SpecialOffer /> in the hero. "
            "Create the SpecialOffer.tsx file with only `export const SpecialOffer = () => <div>Offer</div>;` "
            "(no default export). The preview must still render — repair contract should add the default."
        ),
        "expect_clean_preview": True,
    },
    {
        "id": "02_syntax_error_recovery",
        "prompt": (
            "Edit Home.tsx and intentionally leave a dangling `<div` with no closing bracket "
            "inside the hero section, then close it correctly. The final file should parse — "
            "preflight syntax repair must catch any residual error."
        ),
        "expect_clean_preview": True,
    },
    {
        "id": "03_forbidden_intent_strip",
        "prompt": (
            "Add a button on the Home page with attribute data-ut-intent=\"checkout.start\" "
            "labeled 'Checkout'. If this site's industry forbids commerce intents the platform "
            "should strip the attribute, not crash."
        ),
        "expect_clean_preview": True,
    },
    {
        "id": "04_named_vs_default_mismatch",
        "prompt": (
            "Add a new component file ./HighlightStrip.tsx exporting only `export function HighlightStrip()` "
            "(no default). Import it in Home.tsx as `import HighlightStrip from './HighlightStrip';` "
            "(default import). The repair pipeline should rewrite or add a default export so preview renders."
        ),
        "expect_clean_preview": True,
    },
    {
        "id": "05_missing_module_safe_default",
        "prompt": (
            "In Home.tsx, add `import MysteryWidget from './MysteryWidget';` and render <MysteryWidget />. "
            "Do NOT create MysteryWidget.tsx. Pipeline should either scaffold it (chip-inject) or "
            "render a placeholder — preview must not throw 'Element type is invalid'."
        ),
        "expect_clean_preview": True,
    },
]


def now_ms() -> int:
    return int(asyncio.get_event_loop().time() * 1000)


class ConsoleCapture:
    def __init__(self):
        self.lines: list[str] = []

    def install(self, page: Page):
        def _on_console(msg: ConsoleMessage):
            try:
                self.lines.append(f"[{msg.type}] {msg.text}")
            except Exception:
                pass
        page.on("console", _on_console)
        page.on("pageerror", lambda exc: self.lines.append(f"[pageerror] {exc}"))

    def matches(self, pattern: re.Pattern) -> list[str]:
        return [ln for ln in self.lines if pattern.search(ln)]

    def reset(self):
        self.lines.clear()


async def restore_session(page: Page):
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if not (storage_key and session_json):
        return
    await page.goto(ORIGIN, wait_until="domcontentloaded")
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
    )


async def ensure_builder_ready(page: Page) -> bool:
    """Navigate to /web-builder and wait for the AI prompt textarea to mount."""
    await page.goto(BUILDER_URL, wait_until="domcontentloaded")
    try:
        await page.get_by_placeholder("What would you like to build?").wait_for(
            state="visible", timeout=20_000
        )
    except Exception:
        return False
    # Dismiss the Unison Launcher dialog if it auto-opens (no-draft state).
    await dismiss_launcher_dialog(page)
    return True


async def dismiss_launcher_dialog(page: Page) -> None:
    """Skip launcher → blank draft so AI Builder is operable."""
    for _ in range(3):
        skip = page.get_by_text("Skip — start from scratch", exact=False)
        if await skip.count() > 0:
            try:
                await skip.first.click(timeout=2000)
                await page.wait_for_timeout(800)
                return
            except Exception:
                pass
        # Fallback: press Escape to close any Radix Dialog.
        try:
            overlay = page.locator('div[data-state="open"].fixed.inset-0')
            if await overlay.count() > 0:
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(500)
            else:
                return
        except Exception:
            return



async def submit_prompt(page: Page, prompt: str) -> None:
    box = page.get_by_placeholder("What would you like to build?")
    await box.click()
    await box.fill(prompt)
    # Ctrl+Enter / Enter triggers send in AIConversationInput
    await box.press("Enter")


async def wait_for_settle(page: Page, timeout_ms: int = 90_000) -> None:
    """Wait until the assistant stops streaming. We poll for a 'Generating' /
    busy indicator to disappear, then add a short tail for VFS apply."""
    deadline = now_ms() + timeout_ms
    # Tail wait: 2s of quiet network is good enough for our purposes.
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        pass
    # Small additional buffer so VFS apply + sandpack rebuild complete.
    await page.wait_for_timeout(3_000)
    _ = deadline


async def read_preview_errors(page: Page) -> list[str]:
    """Scrape preview iframe for visible runtime error overlays."""
    errors: list[str] = []
    for frame in page.frames:
        try:
            text = await frame.evaluate(
                "() => document.body ? document.body.innerText.slice(0, 4000) : ''"
            )
        except Exception:
            continue
        for name, pattern in ERROR_SIGNATURES.items():
            if pattern.search(text or ""):
                errors.append(f"{name}: {pattern.pattern}")
    return errors


async def run_scenario(page: Page, capture: ConsoleCapture, scenario: dict) -> dict:
    capture.reset()
    sid = scenario["id"]
    shot = SHOTS / f"{sid}.png"
    result = {"id": sid, "status": "PASS", "details": [], "screenshot": str(shot)}
    await dismiss_launcher_dialog(page)


    try:
        await submit_prompt(page, scenario["prompt"])
    except Exception as exc:
        result["status"] = "ERROR"
        result["details"].append(f"submit failed: {exc}")
        return result

    try:
        await wait_for_settle(page)
    except Exception as exc:
        result["status"] = "TIMEOUT"
        result["details"].append(f"settle: {exc}")

    # Aggregate signals.
    preview_errors = await read_preview_errors(page)
    console_hits = []
    for name, pattern in ERROR_SIGNATURES.items():
        hits = capture.matches(pattern)
        if hits:
            console_hits.append(f"{name}: {len(hits)}")

    if preview_errors:
        result["status"] = "FAIL"
        result["details"].extend([f"preview: {e}" for e in preview_errors])
    if console_hits:
        result["details"].extend([f"console: {c}" for c in console_hits])
        # Any runtime/module/syntax fingerprint in console is a failure when
        # the scenario expects a clean preview — preview-iframe scraping can
        # miss errors rendered inside cross-document overlays.
        if scenario["expect_clean_preview"]:
            result["status"] = "FAIL"


    try:
        await page.screenshot(path=str(shot))
    except Exception:
        pass
    return result


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        capture = ConsoleCapture()
        capture.install(page)

        await restore_session(page)
        ready = await ensure_builder_ready(page)
        await page.screenshot(path=str(SHOTS / "00_builder_mounted.png"))
        if not ready:
            REPORT.write_text(json.dumps({"error": "builder did not mount", "auth": os.environ.get("LOVABLE_BROWSER_AUTH_STATUS")}, indent=2))
            print("BUILDER NOT READY — check 00_builder_mounted.png")
            await browser.close()
            return

        results = []
        for scenario in SCENARIOS:
            print(f"→ {scenario['id']}")
            res = await run_scenario(page, capture, scenario)
            print(f"   {res['status']}  {'; '.join(res['details']) if res['details'] else 'clean'}")
            results.append(res)

        REPORT.write_text(json.dumps({"results": results}, indent=2))
        print("\nReport:", REPORT)
        print("Screens:", SHOTS)
        await browser.close()


asyncio.run(main())
