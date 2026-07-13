import { test, expect } from "@playwright/test";

test("homepage loads the tournament map and list", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Discover Chess/i })).toBeVisible();

  const map = page.locator("#map .leaflet-container");
  await expect(map).toBeVisible({ timeout: 20_000 });

  const rows = page.locator(".table-container table tbody tr.table-row");
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  expect(await rows.count()).toBeGreaterThan(0);
});
