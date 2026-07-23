#!/usr/bin/env node
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "..", "demo-screenshots");
const APP = "http://localhost:3000";

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, name), type: "png" });
  console.log("  📸 " + name);
}

async function main() {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ── Scene 1: Desktop Forge ──
  console.log("Scene 1: Forge Desktop");
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1280, height: 800 });
  await desk.goto(APP, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(desk, "01-forge-desktop.png");

  // ── Scene 2: Desktop Gallery ──
  console.log("Scene 2: Gallery Desktop");
  await desk.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const g = btns.find((b) => b.textContent && b.textContent.includes("Gallery"));
    if (g) g.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(desk, "02-gallery-desktop.png");

  // ── Scene 3: Desktop Activity ──
  console.log("Scene 3: Activity Desktop");
  await desk.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const a = btns.find((b) => b.textContent && b.textContent.includes("Activity"));
    if (a) a.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(desk, "03-activity-desktop.png");

  // ── Scene 4: Mobile Forge ──
  console.log("Scene 4: Forge Mobile");
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844 });
  await mob.goto(APP, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(mob, "04-forge-mobile.png");

  // ── Scene 5: Mobile Nav Open ──
  console.log("Scene 5: Mobile Nav");
  await mob.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Toggle menu"]');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await snap(mob, "05-mobile-nav.png");

  // ── Scene 6: Mobile Gallery ──
  console.log("Scene 6: Gallery Mobile");
  await mob.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const g = btns.find((b) => b.textContent && b.textContent.includes("Gallery"));
    if (g) g.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(mob, "06-gallery-mobile.png");

  // ── Scene 7: Full Desktop ──
  console.log("Scene 7: Full Desktop");
  await desk.setViewport({ width: 1440, height: 900 });
  await desk.goto(APP, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(desk, "07-full-desktop.png");

  await browser.close();
  console.log("Done! " + fs.readdirSync(OUT).length + " screenshots captured.");
}

main().catch((e) => { console.error(e); process.exit(1); });
