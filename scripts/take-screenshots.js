const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const THEMES = [
  { id: "dark", file: "theme-dark.png", name: "Spotify Dark" },
  { id: "light", file: "theme-light.png", name: "Crisp Light" },
  { id: "blue", file: "theme-blue.png", name: "Cyberpunk Blue" },
  { id: "black-yellow", file: "theme-black-yellow.png", name: "Midnight Gold" },
  { id: "grass-purple", file: "theme-grass-purple.png", name: "Emerald Neon" },
  { id: "purple-yellow", file: "theme-purple-yellow.png", name: "Cyber Violet" },
  { id: "orange-skyblue", file: "theme-orange-skyblue.png", name: "Sunset Orange" },
  { id: "red-green", file: "theme-red-green.png", name: "Crimson Rose" },
];

async function capture() {
  const executablePath = "/opt/google/chrome/chrome";
  console.log("Launching headless browser at:", executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 15000 });

  // Wait for track rows to load
  await page.waitForSelector(".tabular-nums", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click on the first track to start playing so player bar and lyrics populate
  console.log("Clicking first track to initiate playback...");
  await page.evaluate(() => {
    // Click the first track row
    const firstRow = document.querySelector(".group.grid");
    if (firstRow) {
      firstRow.click();
    }
  });

  // Give 1.5s for lyrics & metadata to load
  await new Promise((r) => setTimeout(r, 1500));

  fs.mkdirSync("screenshots", { recursive: true });
  fs.mkdirSync("public/screenshots", { recursive: true });

  for (const t of THEMES) {
    console.log(`Switching to theme: ${t.name} (${t.id})...`);

    await page.evaluate((themeId) => {
      const select = document.querySelector("header select");
      if (select) {
        select.value = themeId;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      document.body.className = themeId;
      localStorage.setItem("harmonify_theme", themeId);
    }, t.id);

    // Wait for theme CSS transition
    await new Promise((r) => setTimeout(r, 800));

    const out1 = path.join("screenshots", t.file);
    const out2 = path.join("public/screenshots", t.file);

    await page.screenshot({ path: out1 });
    fs.copyFileSync(out1, out2);
    console.log(`Saved screenshot -> ${out1} & ${out2}`);
  }

  await browser.close();
  console.log("All 8 theme screenshots successfully captured!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
