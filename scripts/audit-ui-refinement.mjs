import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:8088";
const OUTPUT_DIR = path.resolve("artifacts/screenshots/ui-refinement");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio
function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-375", width: 375, height: 667 },
];

const PAGES_TO_AUDIT = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "features", path: "/features" },
  { name: "research", path: "/research" },
  { name: "docs", path: "/docs" },
  { name: "contact", path: "/contact" },
  { name: "login", path: "/login" },
  { name: "overview", path: "/overview", auth: true },
  { name: "codebase-assessments", path: "/codebase-assessments", auth: true },
  { name: "incidents", path: "/incidents", auth: true },
  { name: "services", path: "/services", auth: true },
];

async function main() {
  console.log(`Starting UI Refinement & WCAG Contrast Audit against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Authenticate to get token
  const apiContext = await browser.newContext();
  const loginRes = await apiContext.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email: "admin@aiops.sentinel", password: "sentinel-admin-1234" },
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.access_token || "";
  console.log("Admin token acquired:", token ? "SUCCESS" : "FAILED");
  await apiContext.close();

  for (const pageConfig of PAGES_TO_AUDIT) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });

      const page = await context.newPage();

      // If auth required, set localStorage token
      if (pageConfig.auth && token) {
        await page.addInitScript((tok) => {
          window.localStorage.setItem("aiops_token", tok);
        }, token);
      }

      // Set initial theme in localStorage
      await page.addInitScript((th) => {
        window.localStorage.setItem("aiops-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }, theme);

      try {
        await page.goto(`${BASE_URL}${pageConfig.path}`, { waitUntil: "networkidle", timeout: 15000 });
      } catch (e) {
        console.warn(`Timeout navigating to ${pageConfig.path}, proceeding anyway...`);
      }

      // Ensure theme class is correctly set on <html>
      await page.evaluate((th) => {
        if (th === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }, theme);
      await page.waitForTimeout(600);

      // Extract text elements and evaluate contrast
      const auditData = await page.evaluate(() => {
        function parseRgb(colorStr) {
          const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (!match) return [0, 0, 0, 1];
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4] ? parseFloat(match[4]) : 1];
        }

        function getEffectiveBackgroundColor(el) {
          let curr = el;
          while (curr && curr !== document) {
            const style = window.getComputedStyle(curr);
            const bg = style.backgroundColor;
            if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
              const parsed = parseRgb(bg);
              if (parsed[3] > 0.05) return parsed;
            }
            curr = curr.parentElement;
          }
          return document.documentElement.classList.contains("dark") ? [11, 18, 32, 1] : [248, 250, 252, 1];
        }

        const elements = Array.from(document.querySelectorAll("h1, h2, h3, h4, p, span, a, label, th, td, code, button"));
        const items = [];

        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0 || el.offsetParent === null) continue;
          const text = el.innerText?.trim();
          if (!text || text.length < 2) continue;

          const style = window.getComputedStyle(el);
          const fg = parseRgb(style.color);
          const bg = getEffectiveBackgroundColor(el);
          const fontSize = parseFloat(style.fontSize);
          const fontWeight = parseInt(style.fontWeight) || 400;
          const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 600);

          items.push({
            tag: el.tagName.toLowerCase(),
            text: text.slice(0, 50),
            fontSize,
            fontWeight,
            isLarge,
            fg: [fg[0], fg[1], fg[2]],
            bg: [bg[0], bg[1], bg[2]],
          });
        }
        return items;
      });

      let passedCount = 0;
      let failedCount = 0;
      const failures = [];

      for (const item of auditData) {
        const ratio = getContrastRatio(item.fg, item.bg);
        const minRatio = item.isLarge ? 3.0 : 4.5;
        if (ratio >= minRatio) {
          passedCount++;
        } else {
          failedCount++;
          if (failures.length < 5) {
            failures.push({
              tag: item.tag,
              text: item.text,
              fontSize: `${item.fontSize}px`,
              ratio: ratio.toFixed(2),
              required: minRatio,
              fg: `rgb(${item.fg.join(",")})`,
              bg: `rgb(${item.bg.join(",")})`,
            });
          }
        }
      }

      const passRate = auditData.length > 0 ? ((passedCount / auditData.length) * 100).toFixed(1) : "100.0";
      results.push({
        page: pageConfig.name,
        theme,
        totalChecked: auditData.length,
        passedCount,
        failedCount,
        passRate: `${passRate}%`,
        sampleFailures: failures,
      });

      console.log(`[${pageConfig.name.toUpperCase()} - ${theme.toUpperCase()}] Evaluated ${auditData.length} elements: ${passRate}% passed (Failures: ${failedCount})`);

      await context.close();
    }
  }

  // Next, capture responsive screenshots across viewports for key pages in both themes
  console.log("\nCapturing responsive screenshots across viewports (1440, 1280, 768, 375)...");
  const SCREENSHOT_PAGES = [
    { name: "home", path: "/" },
    { name: "about", path: "/about" },
    { name: "features", path: "/features" },
    { name: "research", path: "/research" },
    { name: "docs", path: "/docs" },
    { name: "contact", path: "/contact" },
    { name: "overview", path: "/overview", auth: true },
    { name: "codebase-assessments", path: "/codebase-assessments", auth: true },
  ];

  for (const pageConfig of SCREENSHOT_PAGES) {
    for (const vp of VIEWPORTS) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();

        if (pageConfig.auth && token) {
          await page.addInitScript((tok) => {
            window.localStorage.setItem("aiops_token", tok);
          }, token);
        }

        await page.addInitScript((th) => {
          window.localStorage.setItem("aiops-theme", th);
          if (th === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }, theme);

        try {
          await page.goto(`${BASE_URL}${pageConfig.path}`, { waitUntil: "networkidle", timeout: 15000 });
        } catch (e) {
          // ignore timeout
        }

        await page.evaluate((th) => {
          if (th === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }, theme);
        await page.waitForTimeout(500);

        const filename = `${pageConfig.name}-${vp.name}-${theme}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        await context.close();
      }
    }
  }

  await browser.close();

  // Save report JSON
  const reportPath = path.resolve("artifacts/ui-refinement-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete! JSON saved to ${reportPath}`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
