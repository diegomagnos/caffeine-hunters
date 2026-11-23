import { expect, test, type Page } from "@playwright/test";

const path = "/conta/convite/";
const token = "ab".repeat(32);
const groupId = "44444444-4444-4444-8444-444444444444";
const inviteId = "55555555-5555-4555-8555-555555555555";
const person = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "convidado@example.test",
  email_confirmed_at: "2026-11-23T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-23T00:00:00Z",
};
const googlePerson = {
  ...person,
  id: "22222222-2222-4222-8222-222222222222",
  email: "google@example.test",
  app_metadata: { provider: "google" },
  user_metadata: { avatar_url: "https://lh3.googleusercontent.com/test-photo" },
};
const group = { id: groupId, name: "Grupo particular", description: "", owner_id: person.id, founder_id: person.id };
const details = `/conta/grupos/detalhes/?id=${groupId}`;

function session(user: typeof person) {
  return {
    access_token: `synthetic-${user.id}`, refresh_token: `refresh-${user.id}`,
    token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user,
  };
}

async function mockAuth(page: Page) {
  await page.route("**/auth/v1/user", (route) => {
    const second = route.request().headers().authorization?.includes(googlePerson.id);
    return route.fulfill({ json: second ? googlePerson : person });
  });
  await page.route("**/auth/v1/token?grant_type=password", (route) =>
    route.fulfill({ json: session(route.request().postDataJSON().email === googlePerson.email ? googlePerson : person) }),
  );
  await page.route("**/auth/v1/logout**", (route) => route.fulfill({ status: 204 }));
  await page.route("**/rest/v1/profiles?**", (route) => route.fulfill({
    json: { display_name: route.request().url().includes(googlePerson.id) ? "Conta Google" : "Convidada Teste" },
  }));
}

async function login(page: Page, email: string) {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password-123");
  await page.getByRole("button", { name: "Entrar com e-mail" }).click();
}

test.skip(process.env.AUTH_TEST_CONFIGURED !== "1", "Requer configuração sintética do Supabase");

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test("cadastro por convite continua após confirmação em outra aba", async ({ page, context }) => {
  await page.route("**/auth/v1/signup**", (route) => {
    expect(route.request().postDataJSON().email).toBe(person.email);
    return route.fulfill({ json: {} });
  });
  await page.goto(`${path}#token=${token}`);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.getByRole("button", { name: "Criar conta com e-mail" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(person.email);
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password-123");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toContainText("Confira seu e-mail");

  const callback = await context.newPage();
  await mockAuth(callback);
  await callback.route("**/auth/v1/verify", (route) => route.fulfill({ json: session(person) }));
  let accepted = false;
  await callback.route("**/rest/v1/rpc/accept_group_invitation", (route) => {
    expect(route.request().postDataJSON()).toEqual({ invitation_token: token });
    accepted = true;
    return route.fulfill({ json: groupId });
  });
  await callback.route("**/rest/v1/groups?**", (route) => route.fulfill({ json: accepted ? [group] : [] }));
  await callback.route("**/rest/v1/rpc/list_group_members", (route) => route.fulfill({
    json: [{ user_id: person.id, is_admin: false, display_name: "Convidada Teste" }],
  }));
  await callback.goto("/conta/callback/?type=signup&token_hash=synthetic-confirmation");
  await expect(callback).toHaveURL(new RegExp(`${path}$`));
  await expect(callback.getByText(group.name)).toHaveCount(0);
  await expect(callback.getByRole("main").getByText(person.email, { exact: true })).toBeVisible();
  await callback.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(callback).toHaveURL(details);
  await expect(callback.getByRole("heading", { name: group.name })).toBeVisible();
  await expect(callback.getByRole("heading", { name: "Convites", exact: true })).toHaveCount(0);
});

test("Google retorna ao mesmo convite após a troca PKCE", async ({ page }) => {
  await page.route("**/auth/v1/authorize?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("provider")).toBe("google");
    expect(params.has("code_challenge")).toBe(true);
    return route.fulfill({
      status: 302,
      headers: { Location: `${params.get("redirect_to")}?code=synthetic-google-code` },
    });
  });
  await page.route("**/auth/v1/token?grant_type=pkce", (route) => {
    expect(route.request().postDataJSON().auth_code).toBe("synthetic-google-code");
    return route.fulfill({ json: session(googlePerson) });
  });
  await page.goto(`${path}#token=${token}`);
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("main").getByText(googlePerson.email, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aceitar convite" })).toBeEnabled();
});

test("login preserva o link, e a troca de conta atualiza nome e avatar no cabeçalho", async ({ page }) => {
  await page.route("https://lh3.googleusercontent.com/test-photo", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="brown"/></svg>' }),
  );
  await page.route("**/rest/v1/rpc/accept_group_invitation", (route) =>
    route.fulfill({ body: "null", contentType: "application/json" }),
  );
  await page.goto(`${path}#token=${token}`);
  await login(page, person.email);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Convidada Teste" })).toBeVisible();
  await expect(header.locator(".account-avatar")).toHaveText("C");
  await expect(header.locator(".account-avatar img")).toHaveCount(0);
  await header.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(header.getByText("Convidada Teste")).toHaveCount(0);
  await login(page, googlePerson.email);
  await expect(header.getByRole("link", { name: "Conta Google" })).toBeVisible();
  await expect(header.getByText("Convidada Teste")).toHaveCount(0);
  await expect(header.locator(".account-avatar img")).toHaveAttribute("src", googlePerson.user_metadata.avatar_url);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(header.getByRole("button", { name: "Sair", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(page.getByRole("status")).toContainText("outro endereço");
});

test("administrador acompanha falha de envio, reenvia e cancela", async ({ page }) => {
  await page.addInitScript((data) => localStorage.setItem("sb-auth-auth-token", JSON.stringify(data)), session(person));
  await page.route("**/rest/v1/groups?**", (route) => route.fulfill({ json: [group] }));
  await page.route("**/rest/v1/rpc/list_group_members", (route) => route.fulfill({
    json: [{ user_id: person.id, display_name: "Convidada Teste", is_admin: true }],
  }));
  let status: string | null = null;
  let delivery = "unconfirmed";
  await page.route("**/rest/v1/rpc/list_group_invitations", (route) => route.fulfill({
    json: status ? [{
      id: inviteId, email: "nova@example.test", status, delivery_status: delivery,
      expires_at: "2026-11-30T00:00:00Z", can_manage: status === "pending",
    }] : [],
  }));
  await page.route("**/functions/v1/send-group-invitation", (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${session(person).access_token}`);
    expect(route.request().postDataJSON()).toEqual(status
      ? { groupId, invitationId: inviteId }
      : { groupId, email: "nova@example.test" });
    delivery = status ? "sent" : "unconfirmed";
    status = "pending";
    return route.fulfill({ json: { delivery } });
  });
  await page.route("**/rest/v1/rpc/cancel_group_invitation", (route) => {
    expect(route.request().postDataJSON()).toEqual({ target_group_id: groupId, invitation_id: inviteId });
    status = "cancelled";
    return route.fulfill({ status: 204 });
  });

  await page.goto(details);
  await page.getByLabel("E-mail do convidado").fill("nova@example.test");
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("status")).toContainText("O envio não foi confirmado");
  await expect(page.getByText("Pendente · Envio não confirmado")).toBeVisible();
  await page.getByRole("button", { name: "Reenviar" }).click();
  await expect(page.getByText("Pendente · Envio aceito pelo provedor")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Cancelado · Envio aceito pelo provedor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reenviar" })).toHaveCount(0);
});
