// Records a 4-frame demo GIF for the README: homepage -> filtered results ->
// tournament detail -> stats. Re-run after data changes.
// Usage: node scripts/record-demo.mjs [url]

import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.argv[2] || "https://www.tourneyradar.com";
const OUT_GIF = path.join(REPO_ROOT, "docs", "media", "demo.gif");

// [filename, hold-duration-seconds]
const FRAMES = [
  ["01-homepage.png", 2.2],
  ["02-filtered.png", 1.8],
  ["03-tournament-detail.png", 1.8],
  ["04-stats.png", 1.8],
];

async function main() {
  const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), "tr-demo-"));
  console.log(`[*] Frames: ${frameDir}`);
  console.log(`[*] URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // The FeedbackPrompt nudge fires instantly on any tracked interaction (search,
  // filter engagement) in a fresh (no localStorage) browser context. Dismiss
  // it before every screenshot so it doesn't cover the frame.
  const dismissStarPrompt = () =>
    page.getByRole("button", { name: "Close" }).click({ timeout: 1500 }).catch(() => {});

  try {
    console.log("[*] Loading homepage...");
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    // Hero fills the viewport; the map card is the next section down.
    await page.locator("#map").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await dismissStarPrompt();
    await page.screenshot({ path: path.join(frameDir, FRAMES[0][0]) });
    console.log(`[✓] ${FRAMES[0][0]}`);

    console.log("[*] Filtering by category...");
    const categorySelect = page.locator(".filters-grid select.form-select").first();
    // selectOption doesn't need the element in the viewport to work, so scroll
    // to the filters card explicitly or the screenshot stays on the map.
    await categorySelect.scrollIntoViewIfNeeded();
    await categorySelect.selectOption("Classical");
    await page.waitForTimeout(900);
    await dismissStarPrompt();
    await page.screenshot({ path: path.join(frameDir, FRAMES[1][0]) });
    console.log(`[✓] ${FRAMES[1][0]}`);

    console.log("[*] Opening tournament detail...");
    const viewDetails = page.locator(".table-row a.btn-primary").first();
    await viewDetails.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await dismissStarPrompt();
    await page.screenshot({ path: path.join(frameDir, FRAMES[2][0]) });
    console.log(`[✓] ${FRAMES[2][0]}`);

    console.log("[*] Loading stats page...");
    await page.goto(new URL("/stats", BASE_URL).toString(), { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);
    await dismissStarPrompt();
    await page.screenshot({ path: path.join(frameDir, FRAMES[3][0]) });
    console.log(`[✓] ${FRAMES[3][0]}`);
  } finally {
    await browser.close();
  }

  console.log("[*] Compiling GIF with ffmpeg...");
  await fs.mkdir(path.dirname(OUT_GIF), { recursive: true });

  const concatPath = path.join(frameDir, "concat.txt");
  const concatBody = FRAMES.map(
    ([name, seconds]) => `file '${path.join(frameDir, name).replace(/'/g, "'\\''")}'\nduration ${seconds}\n`,
  ).join("");
  // ffmpeg's concat demuxer needs the last file repeated (its final duration is otherwise ignored).
  const lastFrame = path.join(frameDir, FRAMES[FRAMES.length - 1][0]).replace(/'/g, "'\\''");
  await fs.writeFile(concatPath, concatBody + `file '${lastFrame}'\n`);

  const palettePath = path.join(frameDir, "palette.png");
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
    "-vf", "fps=10,scale=1280:-1:flags=lanczos,palettegen",
    palettePath,
  ]);
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
    "-i", palettePath,
    "-lavfi", "fps=10,scale=1280:-1:flags=lanczos [x]; [x][1:v] paletteuse",
    "-loop", "0",
    OUT_GIF,
  ]);

  const { size } = await fs.stat(OUT_GIF);
  console.log(`[✓] GIF created: ${OUT_GIF} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  await fs.rm(frameDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(`[!] ${err.message}`);
  process.exit(1);
});
