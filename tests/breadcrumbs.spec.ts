import { expect, test } from "@playwright/test";

const groups = { label: "Meus grupos", href: "/grupos/" };
const group = { label: "Mesa do Café", href: "/grupos/mesa-do-cafe/" };
const cycle = { label: "Origens do Brasil", href: "/ciclos/novembro/" };
const cases = [
  { route: group.href, current: group.label, ancestors: [groups] },
  {
    route: "/grupos/primeira-xicara/",
    current: "Primeira Xícara",
    ancestors: [groups],
  },
  { route: cycle.href, current: cycle.label, ancestors: [groups, group] },
  {
    route: "/avaliacoes/serra-do-sol/",
    current: "Serra do Sol",
    ancestors: [groups, group, cycle],
  },
  {
    route: "/avaliacoes/vale-sereno/",
    current: "Vale Sereno",
    ancestors: [groups, group, cycle],
  },
];

for (const { route, current, ancestors } of cases) {
  test(`breadcrumbs acessíveis, responsivos e navegáveis: ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    const breadcrumb = page.getByRole("navigation", {
      name: "Caminho de navegação",
    });
    await expect(breadcrumb.getByRole("listitem")).toHaveText([
      ...ancestors.map((a) => `${a.label}›`),
      current,
    ]);
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
      current,
    );
    await expect(
      breadcrumb.getByRole("link", { name: current, exact: true }),
    ).toHaveCount(0);
    await expect(breadcrumb.getByRole("link")).toHaveCount(ancestors.length);
    await expect(
      page
        .getByRole("navigation", { name: "Navegação principal" })
        .getByRole("link", { name: "Meus grupos" }),
    ).toHaveAttribute("aria-current", "page");
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(breadcrumb).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    for (const { label, href } of ancestors) {
      const link = breadcrumb.getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("href", href);
      await link.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(href);
      await expect(
        page.getByRole("heading", { name: label, exact: true, level: 1 }),
      ).toBeVisible();
      await page.goto(route);
    }
  });
}
