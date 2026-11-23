import { expect, test } from "@playwright/test";

test("carrega HTML, CSS e JavaScript exportados sem servidor Next.js", async ({ page, request }) => {
  const failed: string[] = [];
  page.on("requestfailed", (req) => {
    // O App Router pode cancelar prefetch; falhas reais continuam sendo reportadas.
    if (req.failure()?.errorText !== "net::ERR_ABORTED") failed.push(req.url());
  });
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

test("a rota exportada de convite abre sem divulgar o token em requisições HTTP", async ({ page }) => {
  const token = "ab".repeat(32);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await page.goto(`/conta/convite/#token=${token}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Convite para grupo privado" })).toBeVisible();
  await expect(page).toHaveURL(/\/conta\/convite\/$/);
  expect(requests.filter((url) => url.includes(token))).toEqual([]);
});
