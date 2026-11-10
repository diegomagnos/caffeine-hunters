# Fundação técnica — etapa 1

Status: implementação para revisão humana. Base: `main` em `f50855b`, incluindo o PR #2. O escopo autorizado nesta tarefa substitui as restrições da consolidação documental anterior apenas para esta fundação. A etapa 1 do roadmap inclui autenticação, mas esta entrega cobre somente sua base técnica.

Evolução atual: [fundação de autenticação](AUTH.md) substitui o adiamento de persistência abaixo somente para Auth/perfis. O restante registra o escopo original da base técnica.

## Decisões adotadas

| Escolha | Justificativa e consequência |
| --- | --- |
| Node.js 24.19.0, npm 11.9.0 | Linha LTS, compatível com Next.js e o ambiente disponível. `.nvmrc`, engines e CI documentam a versão; `package-lock.json` permite `npm ci`. |
| Next.js 16.4.6 / React e React DOM 19.3.1 | Versões estáveis consultadas no registro npm; App Router e componentes de servidor por padrão. A página atual é pré-renderizada, sem JavaScript de negócio ou requisições externas. |
| TypeScript 5.9.3 estrito | Linha estável com compatibilidade conhecida no ecossistema Next.js; evita antecipar migração para TypeScript 7. `next typegen` permite verificar tipos de rotas antes do primeiro build. |
| Tailwind CSS e plugin PostCSS 4.3.5 | Configuração CSS com tokens mínimos de cor e fontes do sistema; sem download de fontes, bibliotecas de UI ou imagens externas. |
| ESLint 9.39.5 / eslint-config-next 16.4.6 | Configuração oficial Next.js para TypeScript, React e acessibilidade. ESLint 10 foi avaliado e rejeitado por incompatibilidade declarada dos plugins import/react/jsx-a11y. A linha 9 emite aviso de fim de suporte; atualizar quando o conjunto de plugins aceitar uma linha suportada, sem forçar peer dependencies. |
| Playwright 1.65.0 e axe-core/Playwright 4.14.0 | Ferramentas gratuitas que exercitam o build real, teclado, larguras móveis/desktop e regras automatizadas WCAG. Não há domínio implementado que justifique outro executor unitário nesta etapa. |
| Monólito modular, sem camadas vazias de domínio | `src/app` compõe rotas; componentes visuais em `src/components`. Orientações em `src/modules` e `src/lib/server` reservam fronteiras sem inventar entidades ou contratos. |
| Arquivos gerados | `next-env.d.ts` e `.next/` ignorados; `next typegen` os recria. `agentRules: false` impede que `next dev` altere o `AGENTS.md` mantido pelo projeto. |
| Persistência adiada | PostgreSQL continua como destino planejado; Supabase é candidato. Sem SDK, ORM, schema, migrações, Docker ou conexão obrigatória. `.env.example` contém apenas reservas vazias, não consumidas. |
| GitHub Actions em repositório público | Runner padrão `ubuntu-latest`, permissões de leitura, sem segredos, actions fixadas por SHA, timeout de 15 minutos e cancelamento de execuções obsoletas. Sem deploy ou contratação; reavaliar gratuidade se mudar a visibilidade/plano. |

Dependências transitivas e versões exatas resolvidas estão no lockfile. As decisões de implementação serão revisadas neste PR; não são aprovação para as próximas etapas.

## Pendências preservadas

Autenticação/sessões, ORM ou biblioteca SQL, estratégia de migrações, versão de PostgreSQL, conexão/pooling, RLS se Supabase for escolhido, hospedagem, jobs/agendador, cache, retenção, observabilidade e PWA exigem decisões antes de implementar suas partes. Nenhuma bloqueia a página informativa atual. Evitar escolher agora um fornecedor de autenticação que condicione a persistência.

Vercel Hobby e Supabase Free permanecem candidatos para o piloto. Não se presume permissão de uso comercial no Vercel Hobby. Esta entrega não cria projetos nesses serviços, não habilita cobrança, não faz deploy e não provisiona infraestrutura. IA, e-mail, armazenamento pago e pagamentos não foram integrados. Custo incremental contratado: US$ 0/mês.

`docs/BUSINESS_RULES.md` permanece inalterado, inclusive as 21 decisões aprovadas. Não foram implementados autenticação, grupos, convites, ciclos, contribuições, avaliações, catálogo, rankings ou penalidades. As questões funcionais abertas continuam nos documentos de produto e regras.

## Verificações e limites

Os comandos reproduzíveis estão no README. A CI executa `npm ci`, instala Chromium e roda `npm run check`. Os resultados efetivamente executados nesta entrega são registrados no PR.

No ambiente cloud, o download de `cdn.playwright.dev` retornou HTTP 403 `Domain forbidden`. Há Chromium 154.0.8037.57 instalado; a configuração aceita uma substituição explícita somente para ambientes com navegador disponível:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run check
```

Essa substituição não é usada pelo CI. O Chromium gerenciado pelo Playwright é a referência padrão; a execução local com Chromium do sistema deve ser identificada nos resultados. Não foi contornada a política de rede. Instalação limpa e execução dos checks não exigem `.env.local` nem credenciais de serviços.

A análise axe não certifica acessibilidade completa. Safari, Firefox, leitores de tela, instalação PWA, banco e fluxos de negócio não estão cobertos por esta fundação. Não há service worker, manifesto de instalação ou cache offline nesta etapa.

## Manutenção de dependências

`npm audit --omit=dev` foi executado e retornou zero vulnerabilidades. A auditoria completa identificou sete alertas moderados na cadeia `typescript-eslint`/`minimatch` (GHSA-g3hv-75wg-m249), usada pelo lint. `npm audit fix` foi executado sem `--force` e não resolveu os alertas na árvore compatível atual. Não foi forçada uma atualização major de dependência transitiva. Acompanhar correção upstream e atualizar o lockfile com nova execução dos checks. Esses achados e o aviso de fim de suporte do ESLint 9 permanecem limitações explícitas da entrega; não representam falha dos testes nem uma auditoria de segurança completa.
