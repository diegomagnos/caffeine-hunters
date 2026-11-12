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
const session = {
  access_token: "synthetic-test-token",
  refresh_token: "synthetic-refresh",
  token_type: "bearer",
  expires_in: 3600,
  user,
};
async function mockAuth(page: Page) {
  await page.route("https://auth.example.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    if (path.endsWith("/profiles"))
      return route.fulfill({
        json:
          route.request().method() === "PATCH"
            ? { id: user.id }
            : { display_name: "Pessoa teste" },
      });
    if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
    if (path.endsWith("/recover") || path.endsWith("/signup"))
      return route.fulfill({ json: {} });
    return route.fulfill({ json: session });
  });
}

for (const path of ["entrar", "recuperar", "perfil", "callback"]) {
  test(`conta estática acessível e responsiva: ${path}`, async ({ page }) => {
    if (configured) await mockAuth(page);
    await page.goto(`/conta/${path}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
}
test("perfil sem sessão não consulta dados privados", async ({ page }) => {
  const reads: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/rest/v1/")) reads.push(req.url());
  });
  await page.goto("/conta/perfil/");
  await expect(page.getByRole("button", { name: "Salvar perfil" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("status")).toContainText(
    configured ? "Entre" : "não configurada",
  );
  expect(reads).toEqual([]);
});

test.describe("contratos do SDK com respostas simuladas (não validam OAuth real)", () => {
  test.skip(
    !configured,
    "Requer build com variáveis sintéticas descritas em AUTH.md",
  );
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });
  test("login, carregamento, perfil, atualização e logout", async ({
    page,
  }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/auth/v1/token?grant_type=password", async (route) => {
      await pending;
      await route.fulfill({ json: session });
    });
    await page.goto("/conta/entrar/");
    await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
    await page
      .getByLabel("Senha", { exact: true })
      .fill("synthetic-password-123");
    await page.getByRole("button", { name: "Entrar com e-mail" }).click();
    await expect(page.getByRole("button", { name: "Aguarde…" })).toBeDisabled();
    release();
    await expect(page).toHaveURL(/\/conta\/perfil\//);
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(
      "Pessoa teste",
    );
    await page.getByLabel("Nome de exibição").fill("Novo nome");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByRole("status")).toHaveText("Perfil salvo.");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page.getByLabel("Nome de exibição")).toHaveCount(0);
  });
  test("cadastro e recuperação retornam mensagens sem enumerar contas", async ({
    page,
  }) => {
    // Manter o cadastro visível até liberar a navegação reproduz a corrida da CI.
    let releaseNavigation!: () => void;
    const recoveryNavigation = new Promise<void>((resolve) => {
      releaseNavigation = resolve;
    });
    await page.route(
      "http://127.0.0.1:3000/conta/recuperar/**",
      async (route) => {
        await recoveryNavigation;
        await route.continue();
      },
    );
    let releaseRecovery!: () => void;
    const recoveryResponse = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });
    await page.route(
      "https://auth.example.test/auth/v1/recover**",
      async (route) => {
        await recoveryResponse;
        await route.fulfill({ json: {} });
      },
    );
    await page.goto("/conta/entrar/");
    await page.getByRole("button", { name: "Criar conta com e-mail" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
    await page
      .getByLabel("Senha", { exact: true })
      .fill("synthetic-password-123");
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Confira seu e-mail");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Criar conta", exact: true }),
    ).toBeVisible();
    releaseNavigation();
    // O cadastro também tem E-mail: aguardar a nova rota e seu formulário
    // antes de preencher evita escrever no campo da página que está saindo.
    await expect(page).toHaveURL("/conta/recuperar/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Recuperar senha",
        exact: true,
      }),
    ).toBeVisible();
    const email = page.getByLabel("E-mail", { exact: true });
    await email.fill("teste@example.test");
    await expect(email).toHaveValue("teste@example.test");
    const requestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.origin === "https://auth.example.test" &&
        url.pathname === "/auth/v1/recover" &&
        request.method() === "POST"
      );
    });
    await page.getByRole("button", { name: "Enviar recuperação" }).click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({
      email: "teste@example.test",
    });
    expect(new URL(request.url()).searchParams.get("redirect_to")).toBe(
      "http://127.0.0.1:3000/conta/callback/",
    );
    await expect(page.getByRole("button", { name: "Aguarde…" })).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    releaseRecovery();
    await expect(page.getByRole("status")).toHaveText(
      "Se o endereço puder receber a mensagem, enviaremos um link de recuperação. Confira também o spam.",
    );
    await expect(
      page.getByRole("button", { name: "Enviar recuperação" }),
    ).toBeEnabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "false");
  });
  test("erros de credenciais e callback inválido não liberam perfil", async ({
    page,
  }) => {
    await page.route("**/auth/v1/token?grant_type=password", (route) =>
      route.fulfill({
        status: 400,
        json: {
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        },
      }),
    );
    await page.goto("/conta/entrar/");
    await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
    await page.getByLabel("Senha", { exact: true }).fill("invalid");
    await page.getByRole("button", { name: "Entrar com e-mail" }).click();
    await expect(page.getByRole("status")).toContainText("Não foi possível");
    await page.goto(
      "/conta/callback/?error=access_denied&next=https://evil.example",
    );
    await expect(page.getByRole("status")).toContainText("Link inválido");
    await expect(page).toHaveURL(/\/conta\/callback\/$/);
    await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
  });
  test("token de recuperação verificado permite redefinir senha", async ({
    page,
  }) => {
    await page.goto("/conta/callback/?token_hash=synthetic&type=recovery");
    await expect(page.getByLabel("Nova senha", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/conta\/callback\/$/);
    await page
      .getByLabel("Nova senha", { exact: true })
      .fill("new-synthetic-password-123");
    await page
      .getByLabel("Confirmar nova senha")
      .fill("new-synthetic-password-123");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByRole("status")).toContainText("Senha atualizada");
    await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
  });
  test("sessão rejeitada pelo servidor não consulta perfil", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ session }) => {
        // Fixture sintética no formato do SDK; a aplicação nunca escreve tokens diretamente.
        localStorage.setItem(
          "sb-auth-auth-token",
          JSON.stringify({
            ...session,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        );
      },
      { session },
    );
    await page.route("**/auth/v1/user", (route) =>
      route.fulfill({ status: 401, json: { msg: "JWT expired" } }),
    );
    const reads: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/rest/v1/")) reads.push(r.url());
    });
    await page.goto("/conta/perfil/");
    await expect(page.getByRole("status")).toContainText(
      "Sessão ausente ou expirada",
    );
    expect(reads).toEqual([]);
  });
  test("confirmação e troca PKCE usam o SDK e não aceitam callback expirado", async ({
    page,
  }) => {
    await page.goto("/conta/callback/?token_hash=synthetic&type=signup");
    await expect(page.getByRole("status")).toContainText("E-mail confirmado");
    await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
    await page.addInitScript(() =>
      localStorage.setItem(
        "sb-auth-auth-token-flow-11111111111111111111111111111111-code-verifier",
        JSON.stringify("synthetic-verifier"),
      ),
    );
    await page.goto(
      "/conta/callback/?code=synthetic-code&sb_flow_id=11111111111111111111111111111111",
    );
    await expect(page.getByRole("status")).toContainText(
      "Autenticação concluída",
    );
    await page.route("**/auth/v1/verify", (route) =>
      route.fulfill({
        status: 403,
        json: { error_code: "otp_expired", msg: "Token expired" },
      }),
    );
    await page.goto("/conta/callback/?token_hash=expired&type=recovery");
    await expect(page.getByRole("status")).toContainText("Link inválido");
    await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
  });
  test("Google inicia PKCE com callback permitido", async ({ page }) => {
    let destination = "";
    await page.route("**/auth/v1/authorize?**", (route) => {
      destination = route.request().url();
      return route.fulfill({
        contentType: "text/html",
        body: "Provedor simulado",
      });
    });
    await page.goto("/conta/entrar/");
    await page.getByRole("button", { name: "Continuar com Google" }).click();
    await expect.poll(() => destination).toContain("code_challenge=");
    const url = new URL(destination);
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe(
      "http://127.0.0.1:3000/conta/callback/",
    );
  });
});
