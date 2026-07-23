#!/usr/bin/env node
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "..", "screenshots");
const APP = "https://stellarforge-demo.vercel.app";

async function snap(page, name) {
  const fp = path.join(OUT, name);
  await page.screenshot({ path: fp, type: "png" });
  console.log("  📸 " + name);
}

async function main() {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ═══ Mobile Forge View ═══
  console.log("Capturing: Mobile Forge");
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844 });
  await mob.goto(APP, { waitUntil: "domcontentloaded", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));
  await snap(mob, "01-mobile-forge.png");

  // ═══ Mobile Gallery ═══
  console.log("Capturing: Mobile Gallery");
  await mob.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const g = btns.find((b) => b.textContent && b.textContent.includes("Gallery"));
    if (g) g.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(mob, "02-mobile-gallery.png");

  // ═══ Mobile with Nav Open ═══
  console.log("Capturing: Mobile Nav");
  await mob.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Toggle menu"]');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await snap(mob, "03-mobile-nav.png");

  // ═══ Desktop Forge ═══
  console.log("Capturing: Desktop Forge");
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1280, height: 800 });
  await desk.goto(APP, { waitUntil: "domcontentloaded", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));
  await snap(desk, "04-desktop-forge.png");

  // ═══ Desktop Gallery ═══
  console.log("Capturing: Desktop Gallery");
  await desk.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const g = btns.find((b) => b.textContent && b.textContent.includes("Gallery"));
    if (g) g.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await snap(desk, "05-desktop-gallery.png");

  await browser.close();
  console.log("Done! " + fs.readdirSync(OUT).length + " screenshots captured.");
}

main().catch((e) => { console.error(e); process.exit(1); });
