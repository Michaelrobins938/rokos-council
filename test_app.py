from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console logs
    errors = []
    page.on(
        "console",
        lambda msg: errors.append(f"[{msg.type}] {msg.text}")
        if msg.type == "error"
        else None,
    )

    # Navigate to the deployed app
    print("Navigating to Roko's Council...")
    page.goto("https://roko-s-council.vercel.app")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Take screenshot of initial state
    page.screenshot(path="test_initial.png", full_page=True)
    print("Screenshot saved: test_initial.png")

    # Check for initial errors
    print(f"\n=== INITIAL CONSOLE ERRORS: {len(errors)} ===")
    for err in errors:
        print(f"  {err}")
    errors.clear()

    # Find and fill the textarea
    try:
        textarea = page.locator("textarea").first
        textarea.wait_for(state="visible", timeout=5000)
        print("\n=== Found textarea, typing test message ===")
        textarea.fill("What is the meaning of artificial intelligence?")
        page.wait_for_timeout(1000)

        # Find submit button - look for any button with relevant text
        submit_btn = None
        all_btns = page.locator("button").all()
        for btn in all_btns:
            try:
                t = btn.inner_text(timeout=500).lower()
                if (
                    "submit" in t
                    or "start" in t
                    or "begin" in t
                    or "deliberate" in t
                    or "convene" in t
                    or "summon" in t
                ):
                    submit_btn = btn
                    print(f"  Found submit button: '{t}'")
                    break
            except:
                pass

        if submit_btn and submit_btn.is_visible():
            print("=== Clicking submit ===")
            submit_btn.click()

            # Wait longer for API calls to complete
            print("Waiting for council deliberation (60 seconds)...")
            for i in range(12):
                page.wait_for_timeout(5000)
                content = page.content()
                has_opinion = (
                    "opinion" in content.lower()
                    or "vote" in content.lower()
                    or "consensus" in content.lower()
                )
                has_error = (
                    "typeerror" in content.lower()
                    or "cannot read properties" in content.lower()
                )
                print(
                    f"  [{(i + 1) * 5}s] Opinions visible: {has_opinion}, Error visible: {has_error}"
                )

                if has_opinion:
                    print("  === COUNCIL RESULTS APPEARED! ===")
                    break
                if has_error:
                    print("  === ERROR DETECTED ON PAGE! ===")
                    break

            # Take screenshot
            page.screenshot(path="test_result.png", full_page=True)
            print("\nScreenshot saved: test_result.png")
        else:
            print("\n=== No submit button found ===")
            # Take screenshot anyway
            page.screenshot(path="test_no_submit.png", full_page=True)
    except Exception as e:
        print(f"\n=== Error: {e} ===")
        page.screenshot(path="test_error.png", full_page=True)

    # Final error check
    print(f"\n=== FINAL CONSOLE ERRORS: {len(errors)} ===")
    for err in errors[-20:]:
        print(f"  {err[:200]}")

    # Check for crash indicators
    final_content = page.content()
    has_crash = "cannot read properties of undefined" in final_content.lower()
    has_map_error = "reading 'map'" in final_content.lower()

    print(f"\n=== CRASH CHECK ===")
    print(f"  TypeError crash: {has_crash}")
    print(f"  .map() error: {has_map_error}")
    print(f"  Total console errors: {len(errors)}")

    if not has_crash and not has_map_error:
        print("\n✅ NO CRASH DETECTED - App is stable!")
    else:
        print("\n❌ CRASH DETECTED - App is broken!")

    browser.close()
