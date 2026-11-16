import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("artifacts/screenshots");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
  ]);

  await delay(1500);

  try {
    const tabs = await fetchJson("http://localhost:9222/json/list");
    const target = tabs.find(t => t.type === "page") || tabs[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve) => (ws.onopen = resolve));

    const send = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Get JWT token by calling login API directly
    const loginRes = await fetch("http://localhost:8000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@aiops.sentinel", password: "sentinel-admin-1234" }),
    }).then((r) => r.json());

    const token = loginRes.data?.access_token || "";
    console.log("Logged in, token acquired:", token ? "YES" : "NO");

    const routes = [
      { name: "overview", path: "/overview" },
      { name: "services", path: "/services" },
      { name: "service-detail", path: "/services/srv_checkout" },
      { name: "incidents", path: "/incidents" },
      { name: "incident-detail", path: "/incidents/inc_checkout_5xx_spike" },
      { name: "topology", path: "/topology" },
      { name: "deployments", path: "/deployments" },
      { name: "experiments", path: "/experiments" },
      { name: "experiment-detail", path: "/experiments/exp_1" },
      { name: "datasets", path: "/datasets" },
      { name: "alert-rules", path: "/alert-rules" },
      { name: "settings", path: "/settings" },
      { name: "profile", path: "/profile" },
    ];

    // Navigate to /login first to initialize origin localStorage
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await delay(1200);

    // Set token in localStorage
    await send("Runtime.evaluate", {
      expression: `localStorage.setItem('aiops_token', '${token}');`,
    });

    for (const r of routes) {
      console.log(`Navigating to ${r.path}...`);
      await send("Page.navigate", { url: `http://localhost:3000${r.path}` });
      await delay(2000); // Allow render & data fetch

      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(OUT_DIR, `${r.name}.png`);
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      console.log(`Saved screenshot: ${filePath}`);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
