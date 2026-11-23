import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const configured = process.env.AUTH_TEST_CONFIGURED === "1";
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "teste@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-10T00:00:00Z",
};
const otherUserId = "22222222-2222-4222-8222-222222222222";
const group = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Clube persistido",
  description: "Cafés entre amigos",
  founder_id: user.id,
  owner_id: user.id,
  membership: [{ is_admin: true }],
};
const detailsPath = `/conta/grupos/detalhes/?id=${group.id}`;
const groupMembers = [
  { user_id: user.id, is_admin: true, display_name: "Ana Teste" },
  { user_id: otherUserId, is_admin: false, display_name: "Bruno Teste" },
];
async function authenticated(page: Page, identity = user) {
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem(
        "sb-auth-auth-token",
        JSON.stringify({
          access_token: "synthetic-token",
          refresh_token: "synthetic-refresh",
          token_type: "bearer",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user,
        }),
      );
    },
    { user: identity },
  );
  await page.route("https://auth.example.test/**", (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/user"))
      return route.fulfill({ json: identity });
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected request" },
    });
  });
}

test("grupos sem sessão não consultam dados privados", async ({ page }) => {
  const reads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/rest/v1/")) reads.push(request.url());
  });
  await page.goto("/conta/grupos/");
  await expect(
    page.getByRole("heading", { name: "Meus grupos", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    configured ? "Entre" : "não configurada",
  );
  await expect(
    page.getByRole("button", { name: "Criar grupo", exact: true }),
  ).toHaveCount(0);
  await page.goto(detailsPath);
  await expect(page.getByRole("status")).toContainText(
    configured ? "Entre" : "não configurada",
  );
  expect(reads).toEqual([]);
});

test.describe("grupos com contratos HTTP simulados", () => {
  test.skip(
    !configured,
    "Requer build com variáveis sintéticas conforme AUTH.md",
  );
  test.beforeEach(async ({ page }) => {
    await authenticated(page);
  });
  test("criação com descrição opcional, redirecionamento, recarga e acessibilidade", async ({
    page,
  }) => {
    let created = false;
    let calls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const savedGroup = { ...group, description: "" };
    await page.route("**/rest/v1/groups?**", (route) => {
      const params = new URL(route.request().url()).searchParams;
      expect(route.request().headers().authorization).toBe(
        "Bearer synthetic-token",
      );
      if (params.has("id")) expect(params.get("id")).toBe(`eq.${group.id}`);
      else {
        expect(params.get("membership.user_id")).toBe(`eq.${user.id}`);
        expect(params.get("select")).toContain(
          "group_members!group_members_group_id_fkey!inner(is_admin)",
        );
      }
      return route.fulfill({ json: created ? [savedGroup] : [] });
    });
    await page.route("**/rest/v1/rpc/list_group_members", (route) => {
      expect(route.request().postDataJSON()).toEqual({
        target_group_id: group.id,
      });
      return route.fulfill({ json: [groupMembers[0]] });
    });
    await page.route("**/rest/v1/rpc/create_group", async (route) => {
      calls++;
      expect(route.request().postDataJSON()).toEqual({
        group_name: group.name,
        group_description: "",
      });
      expect(route.request().headers().authorization).toBe(
        "Bearer synthetic-token",
      );
      await pending;
      created = true;
      return route.fulfill({ json: group.id });
    });
    await page.goto("/conta/grupos/");
    await expect(
      page.getByText("Você ainda não participa de nenhum grupo.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByLabel("Nome do grupo").fill("   ");
    await page
      .getByRole("button", { name: "Criar grupo", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "sem usar somente espaços",
    );
    expect(calls).toBe(0);
    await page.getByLabel("Nome do grupo").fill(`  ${group.name}  `);
    await page
      .getByRole("button", { name: "Criar grupo", exact: true })
      .click();
    await expect(page.getByRole("button", { name: "Criando…" })).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page).toHaveURL(detailsPath);
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    await expect(page.getByText("Sem descrição.")).toBeVisible();
    await expect(
      page.locator("dd").filter({ hasText: "Ana Teste (você)" }),
    ).toHaveCount(2);
    await expect(
      page
        .getByRole("listitem")
        .filter({
          hasText: "Ana Teste (você) · Fundador · Dono · Administrador",
        }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recursos ainda indisponíveis" }),
    ).toBeVisible();
    expect(calls).toBe(1);
    await page.reload();
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    await page.getByRole("link", { name: "Voltar para Meus grupos" }).click();
    await expect(
      page.getByText("Privado · Fundador · Dono · Administrador", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: `Ver detalhes de ${group.name}` })
      .click();
    await expect(page).toHaveURL(detailsPath);
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  });
  test("falhas de consulta/criação preservam campos e permitem nova consulta", async ({
    page,
  }) => {
    let fail = true;
    await page.route("**/rest/v1/groups?**", (route) =>
      route.fulfill(
        fail
          ? { status: 403, json: { message: "private internal detail" } }
          : { json: [group] },
      ),
    );
    await page.route("**/rest/v1/rpc/create_group", (route) =>
      route.fulfill({
        status: 403,
        json: { message: "private internal detail" },
      }),
    );
    await page.goto("/conta/grupos/");
    await expect(
      page.getByRole("alert").filter({ hasText: "Não foi possível carregar" }),
    ).toBeVisible();
    await page.getByLabel("Nome do grupo").fill("Novo clube");
    await page
      .getByLabel("Descrição (opcional)", { exact: true })
      .fill("Descrição preservada");
    await page
      .getByRole("button", { name: "Criar grupo", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Não foi possível confirmar a criação",
    );
    await expect(page.getByLabel("Nome do grupo")).toHaveValue("Novo clube");
    await expect(page.getByLabel("Descrição (opcional)")).toHaveValue(
      "Descrição preservada",
    );
    await expect(page.getByText("private internal detail")).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Atualizar lista" }).click();
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "Não foi possível carregar" }),
    ).toHaveCount(0);
  });
  test("lista distingue fundador, administrador e participante", async ({
    page,
  }) => {
    const adminGroup = {
      ...group,
      founder_id: otherUserId,
      owner_id: otherUserId,
    };
    const founderGroup = {
      ...group,
      name: "Grupo original",
      owner_id: otherUserId,
      membership: [{ is_admin: false }],
    };
    const memberGroup = {
      ...adminGroup,
      name: "Grupo como membro",
      membership: [{ is_admin: false }],
    };
    await page.route("**/rest/v1/groups?**", (route) =>
      route.fulfill({
        json: [adminGroup, founderGroup, memberGroup].map((item, index) => ({
          ...item,
          id: `${index}4444444-4444-4444-8444-444444444444`,
        })),
      }),
    );
    await page.goto("/conta/grupos/");
    await expect(page.getByRole("link", { name: "Novo grupo" })).toBeVisible();
    for (const [item, role] of [
      [adminGroup, "Administrador"],
      [founderGroup, "Fundador · Participante"],
      [memberGroup, "Participante"],
    ] as const) {
      const card = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { name: item.name }) });
      await expect(
        card.getByText(`Privado · ${role}`, { exact: true }),
      ).toBeVisible();
      await expect(card.getByText(item.description)).toBeVisible();
    }
  });
  test("detalhes tratam falha temporária e mostram papéis de outros membros", async ({
    page,
  }) => {
    let fail = true;
    await page.route("**/rest/v1/groups?**", (route) =>
      route.fulfill({ json: [{ ...group, owner_id: otherUserId }] }),
    );
    await page.route("**/rest/v1/rpc/list_group_members", (route) =>
      route.fulfill(
        fail
          ? { status: 500, json: { message: "private internal detail" } }
          : {
              json: groupMembers.map((member) => ({
                ...member,
                is_admin: member.user_id === otherUserId,
              })),
            },
      ),
    );
    await page.goto(detailsPath);
    await expect(
      page.getByRole("alert").filter({ hasText: "Não foi possível carregar" }),
    ).toBeVisible();
    await expect(page.getByText("private internal detail")).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    await expect(page.getByText(group.description)).toBeVisible();
    await expect(page.locator("dd")).toHaveText([
      "Bruno Teste",
      "Ana Teste (você)",
    ]);
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "Bruno Teste · Dono · Administrador" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "Ana Teste (você) · Fundador · Participante" }),
    ).toBeVisible();
  });
  test("logout remove acesso aos grupos e impede nova consulta", async ({
    page,
  }) => {
    let reads = 0;
    await page.route("**/rest/v1/groups?**", (route) => {
      reads++;
      return route.fulfill({ json: [group] });
    });
    await page.route("**/rest/v1/profiles?**", (route) =>
      route.fulfill({ json: { display_name: "Teste" } }),
    );
    await page.route("**/auth/v1/logout**", (route) =>
      route.fulfill({ status: 204 }),
    );
    await page.goto("/conta/grupos/");
    await expect(page.getByRole("heading", { name: group.name })).toBeVisible();
    await page
      .getByRole("link", { name: "Meu perfil real", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Sair da conta" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page.getByLabel("Nome de exibição")).toHaveCount(0);
    const readsBefore = reads;
    await page.locator('a[href="/conta/grupos/"]').click();
    await expect(page).toHaveURL(/\/conta\/grupos\//);
    await expect(page.getByRole("status")).toContainText("Entre");
    await expect(page.getByRole("heading", { name: group.name })).toHaveCount(
      0,
    );
    expect(reads).toBe(readsBefore);
  });
  test("sessão rejeitada não consulta grupos", async ({ page }) => {
    await page.route("**/auth/v1/user", (route) =>
      route.fulfill({ status: 401, json: { message: "JWT expired" } }),
    );
    const reads: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/rest/v1/")) reads.push(request.url());
    });
    await page.goto("/conta/grupos/");
    await expect(page.getByRole("status")).toContainText(
      "Sessão ausente ou expirada",
    );
    expect(reads).toEqual([]);
  });
});

test("segundo usuário não vê grupo privado por URL direta ou na lista", async ({
  page,
}) => {
  test.skip(
    !configured,
    "Requer build com variáveis sintéticas conforme AUTH.md",
  );
  const otherUser = { ...user, id: otherUserId };
  await authenticated(page, otherUser);
  const reads: URLSearchParams[] = [];
  let memberReads = 0;
  await page.route("**/rest/v1/groups?**", (route) => {
    reads.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: [] });
  });
  await page.route("**/rest/v1/rpc/list_group_members", (route) => {
    memberReads++;
    return route.fulfill({ json: [] });
  });
  await page.goto("/conta/grupos/detalhes/?id=invalido");
  await expect(
    page.getByRole("heading", { name: "Grupo indisponível" }),
  ).toBeVisible();
  expect(reads).toHaveLength(0);
  await page.goto(detailsPath);
  await expect(
    page.getByRole("heading", { name: "Grupo indisponível" }),
  ).toBeVisible();
  await expect(page.getByText(group.name, { exact: true })).toHaveCount(0);
  expect(reads[0].get("id")).toBe(`eq.${group.id}`);
  expect(memberReads).toBe(0);
  await page.getByRole("link", { name: "Voltar para Meus grupos" }).click();
  await expect(
    page.getByText("Você ainda não participa de nenhum grupo.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(reads[1].get("membership.user_id")).toBe(`eq.${otherUserId}`);
});
