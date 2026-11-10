# Caffeine Hunters

Plataforma Web responsiva, com experiência PWA, para clubes de degustação de cafés em grãos ou moídos. Cada clube poderá reunir participantes em um grupo privado, organizar ciclos, acompanhar contribuições, avaliar cafés e consultar rankings.

O projeto possui uma **primeira interface demonstrativa navegável**: painel, grupos, detalhes de grupo, ciclo, avaliação e perfil responsivos, com dados fictícios e sem autenticação ou banco conectado. Consulte o [registro da interface](docs/INITIAL_INTERFACE.md) para rotas, decisões e limitações. Este repositório continua sendo a fonte principal de conhecimento. As próximas etapas exigem autorização própria e revisão humana.

## Visão do produto

- Grupos privados com múltiplos administradores, criador original preservado e regras versionadas para próximos ciclos. O fluxo de convites e aprovação de entrada ainda precisa de definição.
- Contribuição de um café por membro a cada ciclo; sugestão inicial de frequência mensal e quantidade de 250g por membro.
- Avaliações sensoriais e nota geral direta de 1 a 5 estrelas; visibilidade após avaliação própria, edição auditada até encerramento automático e médias de notas válidas.
- Penalidades configuráveis, preservando avaliações anteriores e o histórico das regras.
- Produto compartilhado no catálogo global separado de cada contribuição privada; cadastro manual e, em fase posterior, assistência por IA com revisão humana.
- Médias globais com autorização por grupo, desativada por padrão e revogável; rankings com ajuste bayesiano dinâmico, sem notas individuais ou identidades públicas.

As [21 decisões aprovadas](docs/BUSINESS_RULES.md#as-21-decisões-aprovadas) orientam a visão completa. O [roadmap](docs/ROADMAP.md) prioriza grupos, ciclos, cadastro manual e avaliações no MVP e planeja catálogo, IA, moderação e publicação em fases posteriores. A fórmula operacional do ajuste estatístico e a métrica de popularidade continuam pendentes.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Produto](docs/PRODUCT.md) | Objetivo, funcionalidades, escopo e dúvidas de produto |
| [Regras de negócio](docs/BUSINESS_RULES.md) | Ciclos, contribuições, avaliações, penalidades e histórico |
| [Arquitetura](docs/ARCHITECTURE.md) | Stack preservada e propostas para domínio, catálogo, IA, privacidade e rankings |
| [Roadmap](docs/ROADMAP.md) | Etapas incrementais e critérios de revisão |
| [Instruções para agentes](AGENTS.md) | Limites, segurança e fluxo de contribuição |

## Como começar

1. Leia esta documentação e registre dúvidas antes de propor mudanças de comportamento.
2. Confirme o escopo aprovado para a tarefa. Propostas nestes documentos dependem de revisão humana.
3. Atualize sua referência de `main` e crie uma branch específica, por exemplo `docs/tema` ou `feat/escopo-aprovado`. Nunca altere `main` diretamente.
4. Faça apenas as alterações autorizadas, valide-as e atualize a documentação afetada.
5. Abra um Pull Request para revisão humana. Não realize merge automaticamente.

## Execução local

Requisitos: Node.js 24 (a versão usada está em `.nvmrc`) e npm 11.9.0. Com nvm instalado, execute `nvm install && nvm use`. As dependências e ferramentas são gratuitas; a instalação inicial requer internet.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Não é necessário copiar `.env.example`, criar contas ou conectar um banco. O arquivo documenta somente variáveis reservadas e vazias para integração futura. Para encerrar, use Ctrl+C.

## Verificação

```sh
npx playwright install --with-deps chromium
npm run check
```

O instalador de dependências do navegador pode exigir permissões administrativas no Linux. Em sistemas já preparados, `npx playwright install chromium` basta. O CI usa o instalador completo no runner efêmero.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | ESLint com regras Next.js/TypeScript; zero avisos |
| `npm run typecheck` | Geração de tipos das rotas e TypeScript estrito, inclusive em checkout limpo |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção após build |
| `npm test` | Playwright contra build de produção, iniciando/encerrando seu próprio servidor |
| `npm run test:ui` | Interface local do Playwright |
| `npm run check` | Lint, tipos, build e testes em sequência |
| `npm run build:static` | Exportação estática opt-in para `out/` |
| `npm run preview:static` | Servidor local de `out/` em http://127.0.0.1:3000 |
| `npm run test:static` | Testes contra `out/`, sem runtime Next.js |
| `npm run check:static` | Exportação e testes estáticos em sequência |

Deixe a porta 3000 livre ao executar os testes. Execute `npm run build` antes de `npm test` isoladamente. São 30 testes em Chromium no build normal e 32 na exportação estática, combinando projetos desktop/móvel. Cobrem todas as telas: identificação do produto e erros de execução, navegação por teclado, ausência de overflow entre 320 e 1280 pixels e análise axe WCAG A/AA. Automação não substitui avaliação humana com leitores de tela nem testes em Safari/Firefox.

## Estrutura e limites

- `src/app/`: layout, metadados, página e estilos Tailwind.
- `src/components/`: elementos visuais reutilizáveis.
- `src/modules/`: orientação para futuros módulos, sem regras antecipadas.
- `src/lib/server/`: fronteira documentada para persistência futura PostgreSQL/Supabase.
- `tests/`: testes de navegador; `playwright.config.ts` controla projetos e servidor.
- `.github/workflows/ci.yml`: verificações em PRs e na `main`, com permissões somente de leitura.

As [decisões técnicas](docs/TECHNICAL_FOUNDATION.md) detalham versões, justificativas, orçamento e pendências da fundação. Não há ORM, schema, migrações, SDK Supabase ou chamadas externas em execução. A preparação de visualização estática está descrita abaixo; autenticação, acesso a dados e infraestrutura dinâmica futura exigem suas próprias entregas. PWA permanece futura.

Se o download do navegador estiver bloqueado em um ambiente que já tenha Chromium, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run check`; detalhes e limites no registro técnico.

O CI usa runner Linux padrão gratuito em repositório público, com timeout e cancelamento de execuções obsoletas. Se a visibilidade ou as condições gratuitas mudarem, reavaliar antes de usar cotas pagas. Nenhum deploy, infraestrutura, serviço pago, cobrança automática ou credencial é configurado. Vercel Hobby e Supabase Free são apenas candidatos; o uso comercial do Hobby precisa de verificação própria antes de qualquer adoção.

## Visualização estática gratuita — preparação

A interface demonstrativa é compatível com Cloudflare Pages Free: todas as rotas de exemplo e o layout são pré-renderizáveis, com CSS Tailwind, SVG local e fontes do sistema. Não há APIs, cookies ou Server Actions; rotas parametrizadas enumeram os exemplos no build, sem imagens com otimização de servidor ou acesso a dados. Componentes de servidor podem executar durante o build e não exigem um servidor na hospedagem para estas telas.

`npm run build:static` define `NEXT_STATIC_EXPORT=1` somente no processo do build e ativa `output: "export"` em `next.config.ts`. O Next.js gera `out/index.html`, os diretórios das rotas com `index.html`, `out/404.html` e os assets de `out/_next/`. Não é necessário adaptador, Wrangler, Pages Functions nem dependência adicional. `out/` permanece ignorado pelo Git; somente esse diretório será publicado pelo Pages.

O build normal (`npm run build`) e `npm run start` continuam disponíveis para a arquitetura Next.js planejada. Os dois builds compartilham `.next/`: após uma exportação, refaça `npm run build` antes de usar `npm run start` ou os testes normais. Não execute os builds em paralelo. Não defina `NEXT_STATIC_EXPORT` globalmente no desenvolvimento.

Para validar a exportação localmente, após `npm ci` e a instalação do Chromium:

```sh
npm run check
npm run check:static
npm run preview:static
```

O último comando serve apenas os arquivos locais, sem publicar nada, e termina com Ctrl+C. O servidor de verificação usa Node.js, escuta somente no loopback e não substitui a infraestrutura do Pages. Todos os testes de interface também rodam contra a exportação, além de dois casos (desktop/móvel) que verificam HTML, carregamento de CSS/JavaScript e resposta 404. A CI executa as duas sequências. A compatibilidade verificada aqui é documental, de build e de navegação local; o build remoto e o acesso real pelo Pages só poderão ser confirmados após uma publicação humana autorizada.

### Conectar manualmente ao Cloudflare Pages Free

**Somente após autorização humana para conectar e publicar.** Criar/conectar o projeto pelo painel pode disparar imediatamente o primeiro deploy. Esta entrega não executa esses passos nem autoriza sua execução automática.

1. Revise e integre este PR manualmente em `main`, quando aprovado. Antes disso, a `main` ainda não contém o comando de exportação.
2. No painel Cloudflare, escolha **Workers & Pages → Create application → Pages → Connect to Git** (os rótulos podem variar). Use o plano **Free**, sem ativar Workers Paid, adicionar faturamento ou contratar recursos. Caso seja exigido pagamento, interrompa e reavalie.
3. Autorize a integração GitHub somente para `diegomagnos/caffeine-hunters` e selecione esse repositório. Escolha um nome de projeto disponível; o endereço padrão será `https://<projeto>.pages.dev`, com HTTPS, acessível em computador e celular. Não configure domínio próprio.
4. Configure o build conforme a tabela. O preset pode preencher valores diferentes: substitua o comando e o diretório explicitamente.

| Configuração | Valor |
| --- | --- |
| Framework preset | `Next.js (Static HTML Export)`; se indisponível, `None` com os valores abaixo |
| Root directory | Raiz do repositório (deixar vazio) |
| Production branch | `main` |
| Build command | `npx --yes --package=npm@11.9.0 -- npm ci && npm run build:static` |
| Build output directory | `out` (não `.next`) |
| Build system | v3 |
| `NODE_VERSION` | `24.19.0`, igual à `.nvmrc` |
| `SKIP_DEPENDENCY_INSTALL` | `1`, pois o comando executa `npm ci` com npm 11.9.0 |
| `NEXT_TELEMETRY_DISABLED` | `1` |

5. Aplique as mesmas variáveis não secretas aos ambientes **Production** e **Preview**. Nenhuma credencial ou variável de banco é necessária. Não copie `.env.example` para o painel. Não configure `NEXT_STATIC_EXPORT`: o script já o faz.
6. Em **Settings → Builds & deployments → Branch control**, confirme `main` para produção e habilite previews para branches de trabalho do próprio repositório (todas as branches não produtivas ou uma lista explícita). PRs originados de forks não recebem os mesmos previews automáticos. Depois da conexão, pushes em `main` atualizam produção e pushes nas branches habilitadas geram previews; restrinja/desative builds automáticos se cada publicação precisar de aprovação separada.
7. Quando a publicação estiver autorizada, conclua **Save and Deploy**. Confira no log Node/npm, instalação por lockfile, `next build` com exportação e upload de `out/`. A integração GitHub/Pages fornece os links dos previews; não invente URLs antes de o projeto existir.
8. Abra o endereço `pages.dev` e o preview em computador e celular. Confira identificação, mensagem de desenvolvimento, larguras de 320/360/768/1280 px, teclado, assets sem erros e uma URL inexistente retornando 404. Esses são passos manuais restantes, não resultados desta entrega.

Produção e previews são públicos por padrão; previews não são controle de acesso. Arquivos de build e HTML nunca devem conter dados privados, notas de grupos ou segredos. Deployments antigos podem continuar acessíveis por suas URLs; remover uma branch não garante retirar todas as cópias publicadas.

### Limites e próxima decisão de infraestrutura

Pages Free hospeda esta página sem serviço pago. Na documentação consultada, o plano permite 500 builds/mês, um build simultâneo, até 20.000 arquivos e 25 MiB por arquivo; previews também consomem builds. Verifique os limites vigentes antes de conectar. Ao atingir cotas, reduza os builds ou aguarde a renovação; não habilite upgrade automático. Nenhuma conta, integração externa, cobrança, domínio ou publicação foi configurada neste PR.

| Recurso futuro | Limite da exportação e decisão necessária |
| --- | --- |
| Autenticação, sessões e grupos privados | Sem cookies/sessões de servidor em execução. Exigem runtime seguro e autorização no servidor; esconder conteúdo no cliente não protege dados. |
| Grupos, contribuições, avaliações e PostgreSQL | Sem Server Actions, APIs por requisição ou gravação em banco. Escolher hospedagem dinâmica, persistência e isolamento antes de implementar. Nunca exportar dados privados para HTML ou payloads estáticos. |
| Encerramento automático, IA e recálculos | Sem jobs/agendador ou processamento contínuo. Exigem infraestrutura, limites, custos e segurança próprios. |
| Rotas de entidades e conteúdo atualizado | Rotas parametrizadas devem ser conhecidas no build (`generateStaticParams`); não há ISR ou SSR por requisição. Mudanças estáticas exigem novo build. |
| Imagens, proxy e regras HTTP | Otimização padrão de `next/image`, proxy/middleware, redirects, rewrites e headers do servidor Next.js não rodam no export. Avaliar assets locais/loader apropriado e configuração do host quando houver necessidade. |
| Médias públicas e revogação | Cache e arquivos publicados não implementam revogação segura nem as permissões das 21 decisões. Precisam de desenho próprio antes de qualquer dado real. |

A exportação é uma forma de visualizar a interface demonstrativa; preserva App Router, componentes, fronteiras de módulos e persistência futura. Não modifica as 21 decisões nem implementa PWA ou funcionalidades de negócio. Se uma futura mudança depender de runtime, deixe o build estático apontar a incompatibilidade e reavalie infraestrutura antes de adaptar: Cloudflare Workers Free com abordagem compatível com Next.js, ou hospedagem Node.js com cota gratuita, são alternativas a comparar quanto a compatibilidade, limites e uso comercial. São propostas, sem migração ou gratuidade ilimitada presumida. Não mover regras privadas para o navegador para contornar limites do Pages.

Referências oficiais consultadas em 10/11/2026: [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports), [Next.js estático no Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [build e versões](https://developers.cloudflare.com/pages/configuration/build-image/), [previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/) e [limites](https://developers.cloudflare.com/pages/platform/limits/).
