import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  ["/grupos/", "Meus grupos"],
  ["/grupos/mesa-do-cafe/", "Mesa do Café"],
  ["/grupos/primeira-xicara/", "Primeira Xícara"],
  ["/ciclos/novembro/", "Origens do Brasil"],
  ["/avaliacoes/serra-do-sol/", "Serra do Sol"],
  ["/avaliacoes/vale-sereno/", "Vale Sereno"],
  ["/perfil/", "Perfil"],
] as const;

for (const [route, title] of routes) {
  test(`acesso direto, atualização, teclado, responsividade e axe: ${route}`, async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on("pageerror", (e) => failures.push(e.message));
    page.on("requestfailed", (req) => {
      // Navegação/atualização pode cancelar prefetch do App Router.
      if (req.failure()?.errorText !== "net::ERR_ABORTED")
        failures.push(req.url());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(response.url());
    });
    expect((await page.goto(route))?.status()).toBe(200);
    expect((await page.reload())?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Ambiente demonstrativo", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Pular para o conteúdo" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    for (const width of [320, 360, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    // Also analyze the mobile layout where stacked navigation and fields differ.
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
    expect(failures).toEqual([]);
  });
}

test("percorre painel, grupo, ciclo, avaliação, perfil e estado vazio", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Meus grupos" })
    .click();
  await page
    .getByRole("article")
    .filter({ hasText: "Mesa do Café" })
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "Explorar ciclo" }).click();
  await page
    .getByRole("link", { name: "Explorar avaliação de Serra do Sol" })
    .click();
  await expect(page).toHaveURL(/\/avaliacoes\/serra-do-sol\//);
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Perfil" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu histórico ainda está em preparo" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Meus grupos" })
    .click();
  await page
    .getByRole("article")
    .filter({ hasText: "Primeira Xícara" })
    .getByRole("link")
    .click();
  await expect(
    page.getByRole("heading", { name: "Nenhum ciclo por aqui" }),
  ).toBeVisible();
});

test("estrelas por teclado são locais, independentes e não liberam resultados", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method()))
      mutations.push(request.url());
  });
  await page.goto("/avaliacoes/serra-do-sol/");
  for (const attribute of ["Aroma", "Sabor", "Acidez", "Corpo", "Finalização"])
    await page
      .getByRole("textbox", { name: attribute, exact: true })
      .fill("Exemplo sensorial");
  const firstStar = page.getByRole("radio", { name: "1 estrela", exact: true });
  await firstStar.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "2 estrelas", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "Aroma", exact: true })
    .fill("Outra impressão");
  await expect(
    page.getByRole("radio", { name: "2 estrelas", exact: true }),
  ).toBeChecked();
  await expect(page.getByText("Seleção local: 2 de 5 estrelas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar avaliação · indisponível" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Os resultados permanecem indisponíveis.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Aroma", exact: true }),
  ).toBeEmpty();
  expect(mutations).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookies: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookies: "" });
});

test("trocar de contribuição não transporta uma avaliação local", async ({
  page,
}) => {
  await page.goto("/avaliacoes/serra-do-sol/");
  await page.getByRole("radio", { name: "5 estrelas", exact: true }).check();
  await page
    .getByRole("navigation", { name: "Caminho de navegação" })
    .getByRole("link", { name: "Origens do Brasil", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Explorar avaliação de Vale Sereno" })
    .click();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(
    page.getByText("Os resultados permanecem indisponíveis.", { exact: false }),
  ).toBeVisible();
});

test("entidades inexistentes retornam 404", async ({ request }) => {
  for (const route of [
    "/grupos/desconhecido/",
    "/ciclos/desconhecido/",
    "/avaliacoes/desconhecida/",
  ]) {
    expect((await request.get(route)).status()).toBe(404);
  }
});
