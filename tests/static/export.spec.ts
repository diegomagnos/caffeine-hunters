import { expect, test } from "@playwright/test";

test("carrega HTML, CSS e JavaScript exportados sem servidor Next.js", async ({ page, request }) => {
  const failed: string[] = [];
  page.on("requestfailed", (req) => failed.push(req.url()));
  page.on("response", (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 247, 240)");
  expect(failed).toEqual([]);
  const missing = await request.get("/pagina-inexistente");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("404");
});
