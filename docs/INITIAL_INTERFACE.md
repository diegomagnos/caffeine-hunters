# Primeira interface navegável

Este registro descreve o escopo do PR #5. A evolução de autenticação em `/conta/` está em [AUTH.md](AUTH.md); as rotas demonstrativas abaixo continuam sintéticas e independentes.

## Escopo e limites

Demonstração pública com dados exclusivamente sintéticos, sem autenticação, banco, APIs, serviços externos, persistência, cookies ou armazenamento Web. A autorização desta entrega abrange somente a interface. As 21 decisões em BUSINESS_RULES.md permanecem inalteradas; páginas de grupo não implementam privacidade real.

Rotas: `/`, `/grupos/`, `/grupos/mesa-do-cafe/`, `/grupos/primeira-xicara/`, `/ciclos/novembro/`, `/avaliacoes/serra-do-sol/`, `/avaliacoes/vale-sereno/` e `/perfil/`. O segundo grupo demonstra ausência de ciclos; ciclo e perfil demonstram ausência de avaliações/histórico.

## Decisões técnicas

- App Router e componentes de servidor para páginas; somente navegação ativa e campos de avaliação exigem componentes de cliente.
- `src/demo/data.ts` contém tipos, exemplos e construtores de URLs, separados dos componentes. Não contém notas de colegas ou médias, nem payload oculto desses resultados.
- `generateStaticParams` enumera todos os exemplos; `dynamicParams = false` mantém entidades desconhecidas indisponíveis. `trailingSlash: true` gera `rota/index.html`, servido diretamente por Pages e pelo servidor estático local, inclusive após atualização. O build normal permanece disponível.
- Identidade preservada com tokens café/creme/areia, CoffeeMark local e fontes do sistema; nenhum asset remoto ou dependência nova.
- Observações sensoriais livres para explorar aroma, sabor, acidez, corpo e finalização. Não definem escala nem obrigatoriedade de produção. A nota geral tem uma amostra de seletor nativo com cinco opções inteiras, independente dos atributos; precisão final continua pendente.
- Não existe envio ou confirmação de gravação. O botão de registro é explicitamente indisponível. Seleção local não satisfaz avaliação própria e não libera resultados. Recarregar ou navegar para outra contribuição descarta os campos.
- Datas e regras são exemplos fixos, identificados como ilustrativos; não há relógio, transição automática, confirmação de entrega, elegibilidade ou penalidade implementados.

## Arquivos por responsabilidade

| Arquivos | Responsabilidade |
| --- | --- |
| `src/app/layout.tsx`, `globals.css`, `components/navigation.tsx` | Cabeçalho, navegação, aviso demonstrativo, rodapé, foco e responsividade |
| `src/app/page.tsx`, `grupos/**`, `ciclos/**`, `avaliacoes/**`, `perfil/**` | Painel e telas navegáveis |
| `src/components/demo-ui.tsx`, `demo-review.tsx` | Cartões, estados vazios, bloqueio de resultados e campos locais |
| `src/demo/data.ts` | Dados fictícios tipados |
| `next.config.ts` | URLs com barra final para exportação em diretórios |
| `tests/home.spec.ts`, `navigation.spec.ts`, `static/export.spec.ts` | Regressão, jornada, teclado, axe, acesso direto, atualização, assets e 404 |
| `README.md`, `docs/PRODUCT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, este registro | Estado atual, decisões e limitações |

## Pendências preservadas

Escala/obrigatoriedade sensorial, precisão das estrelas, calendário/fuso, elegibilidade, penalidades, ingresso, permissões, rankings e privacidade de publicação seguem pendentes. A interface não resolve essas decisões nem habilita funções dependentes delas. Registro, edição auditada, encerramento automático, catálogo, IA e operações de perfil/grupo permanecem indisponíveis.

## Compatibilidade e revisão

Exportação somente de exemplos públicos para `out/`, sem Functions, Workers, adaptadores, conta nova ou alteração na configuração do Cloudflare. Nenhum serviço contratado, segredo ou publicação automática de dados privados. O PR não deve ser integrado automaticamente. A validação local não confirma o deploy remoto; revisar o preview gerado pela integração existente antes da aprovação humana.

Automação em Chromium desktop/móvel cobre rotas diretas e atualização, jornada entre telas, larguras 320/360/768/1280, ausência de overflow, erros de página/assets, skip link, axe WCAG A/AA, estrelas por teclado, independência dos atributos e descarte local. Não substitui revisão humana com leitor de tela ou testes Safari/Firefox. Estes testes validam a demonstração, não autorização ou regras de produção.

## Validação executada — 10/11/2026

Node 24.19.0, npm 11.9.0 e Chromium do ambiente (`/usr/bin/chromium`).

| Comando / verificação | Resultado |
| --- | --- |
| `npm ci --cache /tmp/caffeine-npm-cache` | Aprovado; 382 pacotes, lockfile preservado |
| `npm run lint` | Aprovado, zero avisos |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; todas as rotas de exemplo pré-renderizadas |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=2` | 30 testes aprovados |
| `npm run build:static` | Aprovado; saída `out/` |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:static -- --workers=2` | 32 testes aprovados, incluindo a suíte de interface e os testes estáticos existentes |
| Inspeção visual | Painel desktop e avaliação móvel; captura final em 320 px sem transbordamento |
| Inspeção de `out/` | HTML das oito rotas presente; 60 arquivos, maior arquivo 229.288 bytes, abaixo dos limites documentados do Pages Free |
| `git diff --check` | Aprovado |

A primeira instalação falhou porque o cache padrão do npm não era gravável neste ambiente; a repetição com cache em `/tmp` passou sem alterar dependências. Testes iniciais detectaram cancelamentos de prefetch como falhas de rede. Os observadores agora ignoram apenas `net::ERR_ABORTED`, mantendo detecção de falhas reais e respostas HTTP de erro; as suítes foram repetidas e aprovadas. Formatação usou Prettier temporariamente, sem adicioná-lo ao projeto.

Build remoto/preview do Cloudflare, CI remoto, Safari/Firefox e revisão humana com leitor de tela não foram validados nesta execução local. Não houve merge nem alteração da configuração de hospedagem.


## Ajuste de breadcrumbs no PR #5 — 10/11/2026

`src/components/breadcrumbs.tsx` compartilha a navegação das páginas de grupo, ciclo e avaliação, substituindo os links isolados de retorno. Os ancestrais são links para as rotas existentes; o último item usa `aria-current="page"` e não é link. A navegação possui `aria-label="Caminho de navegação"`, lista ordenada e separadores ocultos de leitores de tela.

Os nomes vêm dos dados fictícios existentes, sem modificá-los. Os estilos discretos usam os tokens atuais e permitem quebra de linha. Os estilos do menu foram limitados ao cabeçalho para não afetar os breadcrumbs; o destaque de Meus grupos permanece nas três áreas. Nenhuma alteração em regras, dependências ou infraestrutura.

`tests/breadcrumbs.spec.ts` cobre as cinco rotas internas em desktop e móvel, caminhos completos, links por teclado, item atual sem link, destaque do menu e apresentação em 320/1280 px. Os testes de jornada existentes foram adaptados para distinguir as duas navegações e retornar pelo breadcrumb do ciclo. Inspeção visual local realizada nas duas larguras.

Validação deste ajuste: `npm run lint`, `npm run typecheck`, `npm run build` e `npm run build:static` aprovados. `npm test -- --workers=2`: **40 aprovados**; `npm run test:static -- --workers=2`: **42 aprovados**, ambos com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Incluem axe, rotas diretas, atualização e regressão da interface. `git diff --check` aprovado.

O acesso HTTP direto ao preview do Cloudflare foi impedido pelo proxy do ambiente (403 ao estabelecer a conexão). A confirmação do deploy do novo commit pela integração existente será registrada no próprio PR, distinguindo o resultado de publicação da inspeção funcional local. Nenhuma configuração de rede ou hospedagem foi alterada.
