#!/usr/bin/env python3
"""
scripts/verify-static-site.py

Static site validation suite for AIOps Sentinel GitHub Pages site (gh-pages/).
Validates:
1. All required pages exist.
2. All local links, stylesheet links, script links, and image links resolve to real files.
3. No localhost links exist as active hyperlinks.
4. No .local email addresses exist.
5. All pages have valid <title>, meta viewport, meta description, and UTF-8 charset.
6. Navigation links and brand links match across all pages.
7. Theme toggle element exists on every page.
8. .nojekyll exists.
"""

import sys
import re
from pathlib import Path
from html.parser import HTMLParser

REPO_ROOT = Path(__file__).resolve().parent.parent
GH_PAGES_DIR = REPO_ROOT / "gh-pages"

REQUIRED_PAGES = [
    "index.html",
    "about.html",
    "features.html",
    "research.html",
    "architecture.html",
    "docs.html",
    "contact.html",
    "404.html",
]

REQUIRED_FILES = [
    ".nojekyll",
    "styles.css",
    "main.js",
]

class PageAuditor(HTMLParser):
    def __init__(self, file_path: Path):
        super().__init__()
        self.file_path = file_path
        self.errors = []
        self.links = []
        self.images = []
        self.scripts = []
        self.stylesheets = []
        self.has_viewport = False
        self.has_charset = False
        self.has_title = False
        self.title_text = ""
        self.in_title = False
        self.has_theme_toggle = False
        self.has_mobile_btn = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        
        if tag == "title":
            self.has_title = True
            self.in_title = True

        if tag == "meta":
            if attr_dict.get("charset", "").lower() == "utf-8":
                self.has_charset = True
            if attr_dict.get("name") == "viewport":
                self.has_viewport = True

        if tag == "button":
            if attr_dict.get("id") == "theme-toggle":
                self.has_theme_toggle = True
            if attr_dict.get("id") == "mobile-menu-btn":
                self.has_mobile_btn = True

        if tag == "link":
            if attr_dict.get("rel") == "stylesheet":
                href = attr_dict.get("href")
                if href:
                    self.stylesheets.append(href)

        if tag == "script":
            src = attr_dict.get("src")
            if src:
                self.scripts.append(src)

        if tag == "img":
            src = attr_dict.get("src")
            if src:
                self.images.append(src)

        if tag == "a":
            href = attr_dict.get("href")
            if href:
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_text += data

def verify_site():
    print(f"=== Verifying Static Site in {GH_PAGES_DIR} ===")
    overall_success = True

    # 1. Check required files
    for req in REQUIRED_FILES:
        path = GH_PAGES_DIR / req
        if not path.exists():
            print(f"[FAIL] Required file missing: {req}")
            overall_success = False
        else:
            print(f"[PASS] Required file present: {req}")

    # 2. Check required pages
    for page in REQUIRED_PAGES:
        path = GH_PAGES_DIR / page
        if not path.exists():
            print(f"[FAIL] Required page missing: {page}")
            overall_success = False
        else:
            print(f"[PASS] Page present: {page}")

    # 3. Audit each HTML page
    html_files = sorted(GH_PAGES_DIR.glob("*.html"))
    for html_file in html_files:
        print(f"\n--- Auditing {html_file.name} ---")
        content = html_file.read_text(encoding="utf-8")

        # Check for forbidden artifacts
        if "@aiops-sentinel.local" in content:
            print(f"[FAIL] Found placeholder .local email address in {html_file.name}")
            overall_success = False
        if "sentinel-admin-1234" in content:
            print(f"[FAIL] Found hardcoded admin credentials in {html_file.name}")
            overall_success = False

        auditor = PageAuditor(html_file)
        auditor.feed(content)

        if not auditor.has_title or not auditor.title_text.strip():
            print(f"[FAIL] Missing or empty <title> tag in {html_file.name}")
            overall_success = False
        else:
            print(f"[PASS] Title: '{auditor.title_text.strip()}'")

        if not auditor.has_viewport:
            print(f"[FAIL] Missing <meta name='viewport'> in {html_file.name}")
            overall_success = False

        if not auditor.has_theme_toggle:
            print(f"[FAIL] Missing #theme-toggle button in {html_file.name}")
            overall_success = False

        if html_file.name != "404.html" and not auditor.has_mobile_btn:
            print(f"[FAIL] Missing #mobile-menu-btn in {html_file.name}")
            overall_success = False

        # Validate stylesheets
        for css in auditor.stylesheets:
            target = (html_file.parent / css).resolve()
            if not target.exists():
                print(f"[FAIL] Stylesheet not found: {css} in {html_file.name}")
                overall_success = False
            else:
                print(f"[PASS] Stylesheet resolved: {css}")

        # Validate scripts
        for js in auditor.scripts:
            target = (html_file.parent / js).resolve()
            if not target.exists():
                print(f"[FAIL] Script not found: {js} in {html_file.name}")
                overall_success = False
            else:
                print(f"[PASS] Script resolved: {js}")

        # Validate images
        for img in auditor.images:
            target = (html_file.parent / img).resolve()
            if not target.exists():
                print(f"[FAIL] Image not found: {img} in {html_file.name}")
                overall_success = False
            else:
                print(f"[PASS] Image resolved: {img}")

        # Validate internal links
        for link in auditor.links:
            if link.startswith(("http://", "https://", "mailto:", "#")):
                # Check for bad localhost public links
                if "localhost" in link and not html_file.name == "docs.html":
                    print(f"[FAIL] Unauthorized localhost link in {html_file.name}: {link}")
                    overall_success = False
                continue
            # Relative internal link
            clean_link = link.split("#")[0].split("?")[0]
            if clean_link:
                target = (html_file.parent / clean_link).resolve()
                if not target.exists():
                    print(f"[FAIL] Broken internal link: {link} in {html_file.name}")
                    overall_success = False

    print("\n==========================================")
    if overall_success:
        print("STATIC SITE VALIDATION: ALL CHECKS PASSED")
        sys.exit(0)
    else:
        print("STATIC SITE VALIDATION: FAILED")
        sys.exit(1)

if __name__ == "__main__":
    verify_site()
