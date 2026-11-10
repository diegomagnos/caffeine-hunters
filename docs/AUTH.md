# Fundação Supabase Auth — PR de autenticação

Escopo aprovado: autenticação e perfil mínimo, preservando Next.js e Cloudflare Pages Free com exportação estática. Base: `main` em `679588f` (PR #5). Orçamento: R$ 0/mês. Nenhuma conta, projeto, integração, SMTP ou configuração de produção foi criada/alterada. Não realizar merge automaticamente.

## Arquitetura e fronteira de segurança

O HTML/JS de todas as páginas é público. `/conta/perfil/` é uma casca estática sem dados pessoais no build: o componente `RequireAuth` impede renderização e consultas antes de verificar o usuário com `auth.getUser()`. Isso é controle de experiência; a autorização efetiva é feita pelo Supabase Auth e pelo PostgreSQL/RLS, inclusive quando alguém ignora a interface e usa REST diretamente. Não há necessidade de SSR, cookies de servidor, middleware ou Pages Functions para esse escopo.

Única dependência direta nova: SDK oficial `@supabase/supabase-js`, com versão resolvida no lockfile. O cliente único usa PKCE, persistência e renovação automática do SDK, sem armazenamento próprio de tokens. O SDK usa armazenamento do navegador: scripts executados na mesma origem podem acessá-lo, portanto evitar scripts de terceiros e tratar XSS como risco de sessão. Nenhum service worker/cache offline foi adicionado. O provider existe somente em `/conta/`; a demonstração não lê sessão nem banco.

`supabase/migrations/202611100001_profiles.sql` cria `profiles.id → auth.users.id`, nome de exibição (0–80 caracteres) e data de criação. Um trigger restrito cria um perfil vazio por usuário; usuários existentes recebem perfil no backfill. Não copia e-mail, foto ou metadados não confiáveis. RLS é habilitada e forçada: somente `authenticated` pode ler o próprio perfil e atualizar seu `display_name`. Sem insert/delete pelo cliente, sem update de id/data e sem acesso anônimo. Nenhum papel administrativo é derivado de metadados. A migração é transacional e deve ser aplicada uma única vez, em ordem, pelo responsável do banco.

Rotas futuras com dados privados devem usar `RequireAuth` e módulos próprios com RLS específica; a guarda não concede autorização de grupo. Não adicionar dados privados a Server Components pré-renderizados, HTML, payloads RSC, arquivos públicos ou caches. Grupos, ciclos, avaliações e rankings continuam exclusivamente fictícios e com as 21 decisões intactas. Operações futuras que exigirem transações complexas, jobs ou segredos demandam desenho de backend próprio antes da implementação.

## Rotas

| Rota | Função |
| --- | --- |
| `/`, `/grupos/`, `/ciclos/*`, `/avaliacoes/*`, `/perfil/` | Demonstração pública existente, dados sintéticos, sem persistência |
| `/conta/entrar/` | Google ou e-mail/senha; cadastro com confirmação obrigatória |
| `/conta/recuperar/` | Solicitação de recuperação com mensagem sem enumeração de contas |
| `/conta/callback/` | Código PKCE OAuth ou token de confirmação/recuperação verificado pelo SDK |
| `/conta/perfil/` | Perfil real, edição do nome e logout; consulta somente após validar sessão |

Callbacks removem query/fragmento do histórico, usam `referrer=no-referrer`, não registram tokens nem exibem erros externos brutos, e não aceitam `next`/redirecionamento arbitrário. Links inválidos, expirados, reutilizados ou cancelamento no provedor falham sem liberar redefinição de senha. PKCE OAuth deve terminar no mesmo navegador/origem que iniciou o fluxo. Confirmação e recuperação usam `token_hash` via template manual abaixo e funcionam em outro dispositivo. A autorização de recuperação só existe em memória depois da verificação; recarregar a página exige um novo link. Nenhum callback implícito com tokens em fragmento é aceito.

Sessões são verificadas ao abrir a área de conta e em eventos do SDK; login/renovação/logout sincronizam a interface. Falha de validação fecha o acesso visual ao perfil. Logout usa o escopo global padrão do SDK, revogando refresh tokens; um access token já emitido pode continuar válido até sua expiração. RLS continua aplicável. Escolher validade curta adequada do JWT no painel, sem prometer revogação instantânea de tokens emitidos.

## Configuração manual pelo responsável — sem executar neste PR

1. Criar/usar um projeto **Supabase Free de propriedade do responsável**, sem upgrade, faturamento, add-ons ou recursos pagos. Caso o painel exija contratação, parar. Aplicar a migração em ambiente de teste primeiro, pelo SQL Editor ou ferramenta de migrações do responsável. Credenciais administrativas permanecem somente nas ferramentas do responsável; nunca no navegador, CI ou Git.
2. Em Auth, habilitar e-mail/senha e **Confirm email**; manter usuários anônimos e vinculação manual de identidades desabilitados. Configurar mínimo de senha em 12 caracteres (o cliente valida no cadastro/recuperação, mas o servidor deve exigir isso também). Manter proteções de alteração segura de e-mail. Revisar rate limits e expiração de OTP/JWT sem ativar opções pagas.
3. Definir Site URL como a origem HTTPS definitiva. Adicionar à lista Redirect URLs os endereços exatos terminados em `/conta/callback/`: localhost de desenvolvimento, produção e somente previews explicitamente confiáveis. Exemplo local: `http://localhost:3000/conta/callback/`. Não liberar wildcard amplo `*.pages.dev` nem permitir previews não confiáveis no projeto de produção. As URLs de exemplos não são URLs de deploy existentes.
4. No Google Cloud do responsável, configurar consentimento OAuth e um cliente Web, com origens autorizadas apropriadas. Usar somente `openid email profile`. Adicionar **como redirect URI do Google** o callback mostrado pelo Supabase: `https://<project-ref>.supabase.co/auth/v1/callback` (não a página da aplicação). Inserir Client ID/Client Secret somente no painel Supabase, habilitar Google, manter verificações de e-mail do provedor. Em modo de teste do consentimento, cadastrar testadores autorizados; revisar requisitos Google antes de publicar. Não ativar APIs pagas ou billing.
5. Em Email Templates, substituir os links de **Confirm signup** e **Reset password** pelos exemplos abaixo. `RedirectTo` deve apontar para o callback permitido, incluindo barra final. Não usar o template padrão com `ConfirmationURL` nesta implementação. Testar os e-mails renderizados e nunca compartilhar links reais em logs/PRs.

```html
<!-- Confirm signup -->
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup">Confirmar e-mail</a>
<!-- Reset password -->
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Redefinir senha</a>
```

6. Copiar `.env.example` para `.env.local` para execução local. Preencher apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (chave publishable; anon legada é compatível). Essas variáveis são públicas, incorporadas no build. O build rejeita configuração parcial e chaves que não sejam publishable ou JWT com papel anon, antes de gerar o bundle. Nunca usar `service_role`, `sb_secret_...`, senha PostgreSQL, Client Secret Google ou chave administrativa. Nenhuma conexão direta PostgreSQL vai para o cliente.
7. Após aprovação humana para configuração de produção, o responsável poderá definir essas duas variáveis no build do Pages e reconstruir. Sem elas, a demonstração funciona e os formulários reais ficam indisponíveis. O build continua `npm run build:static`, diretório `out`, sem runtime adicional. Não fazer esses passos automaticamente. Previews devem preferir projeto de teste separado, dentro da cota gratuita, e não compartilhar sessões com produção.

## Identidades e duplicatas

Não há tabela paralela de contas, busca pública por e-mail, fusão por nome ou chamadas a `linkIdentity`. A unicidade é gerida pelo Supabase Auth; o perfil usa somente o UUID de `auth.users`. Cadastro repetido usa a resposta ofuscada do serviço, com orientação genérica para entrar/recuperar senha.

O Supabase faz vinculação automática para o mesmo e-mail com verificações do serviço e proteção contra identidades não confirmadas (documentação oficial abaixo). Não se deve desativar confirmação para contornar esse fluxo. E-mails diferentes permanecem contas diferentes: não há como concluir que pertencem à mesma pessoa com segurança. Validar manualmente ambos os sentidos Google → e-mail e e-mail confirmado → Google e tentativa com e-mail não confirmado, assegurando que nenhuma identidade não verificada dê acesso a conta alheia. Se o comportamento do projeto/provedor divergir dessas garantias, bloquear ativação e revisar a solução antes de liberar. Apple e Microsoft constam somente no registro de provedores, ambos `false`; sua ativação e eventuais custos/requisitos exigem revisão própria.

## Plano gratuito e limitação de entrega de e-mails

**O SMTP padrão não permite cadastro público geral:** envia apenas a endereços da equipe do projeto, com limite documentado de 2 mensagens/hora, sujeito a mudança e sem garantia de entrega. Não adicionar usuários finais à equipe para contornar isso. Confirmação e recuperação são implementadas, mas a liberação pública de e-mail/senha depende de decisão humana sobre SMTP com custo total zero (incluindo domínio/remetente e cotas). Nenhum serviço foi escolhido ou contratado. Proposta: validar inicialmente com endereços de testadores que já pertençam à equipe, depois avaliar serviço SMTP gratuito do responsável, sem upgrade automático. Google pode ser validado separadamente. Não desabilitar confirmação para esconder a limitação.

Na consulta oficial de 10/11/2026: Free inclui 50.000 usuários ativos/mês, PostgreSQL de 500 MB e 5 GB de egress; até dois projetos ativos, com pausa após uma semana de inatividade. Storage não é usado. Confirmar limites vigentes no painel; cotas não são promessa de disponibilidade ilimitada. Ao atingir limites, interromper/reduzir uso ou aguardar renovação; nenhum upgrade está autorizado. Não há garantias de produção ou backups gerenciados presumidas. Pages Free e sua configuração existente são preservados.

## Validação reproduzível

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run build:static
npm run test:static
npm run test:rls
```

`test:rls` requer Docker local e baixa a imagem oficial PostgreSQL 17 Alpine. Usa container descartável sem rede ou portas publicadas, sem dados/credenciais reais e remove o container ao concluir. Executa a migração e os testes SQL de acesso anônimo, dois usuários, leitura/escrita cruzada, ausência de identidade, insert/delete, mudança de id e limite de nome. É PostgreSQL real; os contratos mínimos de `auth.users`/`auth.uid()` são fixtures, portanto isso não comprova configuração de Auth/JWT/PostgREST de um Supabase real. Para testar no Supabase local completo, aplicar a migração e executar `supabase/tests/profiles.sql` com `ON_ERROR_STOP=1` somente em banco descartável, nunca em produção.

Para exercitar contratos do SDK e da interface sem um projeto externo, reconstruir com variáveis sintéticas e executar os testes com a flag abaixo (a CI usa somente esses valores):

```sh
export NEXT_PUBLIC_SUPABASE_URL=https://auth.example.test
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test
export AUTH_TEST_CONFIGURED=1
npm run build
npm test
npm run build:static
npm run test:static
```

Playwright intercepta esse domínio com fixtures sintéticas. Isso testa carregamento, erros, confirmação/cadastro, recuperação, sessão rejeitada, guarda, leitura/edição, logout e início PKCE Google, além da acessibilidade e responsividade. **Não comprova OAuth real nem entrega de e-mails.** Sem variáveis, os testes de contrato são pulados explicitamente; testes de páginas, ausência de sessão e demonstração continuam executados. Para testar o modo sem configuração, remover as três variáveis e reconstruir.

### Validação real ainda obrigatória antes de liberar contas

- Aplicar migração e confirmar RLS por REST usando anon e tokens de dois usuários: A não lê/edita B, UUID forjado não permite insert, anônimo não consulta perfil e campos id/data não podem ser alterados.
- Google: consentimento, cancelamento, retorno PKCE no mesmo navegador/origem, redirect bloqueado fora da allowlist e identidade/e-mail verificados; repetir localhost e Pages/preview autorizado.
- E-mail: cadastro, confirmação, link expirado/reutilizado, login não confirmado, duplicata, recuperação no mesmo/outro dispositivo, senha alterada e login com nova senha; testar os templates personalizados e cotas de entrega.
- Renovação, expiração, falha de rede e logout em duas abas; verificar que dados anteriores desaparecem e que nenhuma resposta privada é armazenada em cache estático.
- Verificar no HTML/arquivos publicados ausência de dados pessoais e segredos, recarga/acesso direto a callbacks no Pages e rotas públicas da demonstração.
- Revisão humana por teclado/leitor de tela e Safari/Firefox, além de Chromium automatizado.

### Resultados locais desta entrega

- `npm ci` e instalação do SDK concluídos; cache temporário em `/tmp` porque o cache padrão do ambiente não era gravável.
- `npm run lint`, `npm run typecheck`, `npm run build` e `npm run build:static`: aprovados, incluindo novo build normal e exportação com os ajustes finais.
- `npm test -- --workers=2`: 62 testes aprovados na primeira suíte completa. Após ampliar cobertura de confirmação/PKCE, `npm test -- tests/auth.spec.ts --workers=2`: 24 aprovados.
- `npm run test:static -- --workers=2`: **66 aprovados** no código final, em Chromium desktop/móvel, com variáveis sintéticas e interceptação HTTP.
- Build estático sem variáveis: aprovado. Testes da área de conta nesse modo: 10 aprovados, 14 testes de contrato pulados explicitamente por ausência de configuração. Os 8 testes existentes da página pública também passaram contra essa exportação sem configuração.
- `npm run test:rls`: aprovado em PostgreSQL 17 real descartável, com contratos de Auth simulados, incluindo proteção de id/data e nomes excessivos.
- Verificação da configuração: segredo moderno e JWT `service_role` sintéticos rejeitados; configuração parcial rejeitada, ausência de configuração e JWT anon sintético aceitos.
- Inspeção visual da tela móvel e `git diff --check`: aprovados. `docs/BUSINESS_RULES.md` preservado sem alterações.

Esses resultados não comprovam OAuth, e-mail, JWT/PostgREST remoto nem publicação no Pages. A lista de validação real acima permanece pendente. Nenhum teste simulado deve ser descrito como validação real do Google.

## Referências oficiais

Consultadas em 10/11/2026: [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP e restrições](https://supabase.com/docs/guides/auth/auth-smtp), [Free e cotas](https://supabase.com/pricing), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
