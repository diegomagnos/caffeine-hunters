# Caffeine Hunters

Plataforma Web responsiva, com experiência PWA, para clubes de degustação de cafés em grãos ou moídos. Cada clube poderá reunir participantes em um grupo privado, organizar ciclos, acompanhar contribuições, avaliar cafés e consultar rankings.

O projeto está na **fundação técnica (etapa 1)**: aplicação Next.js com página inicial responsiva, sem funcionalidades de negócio, autenticação ou banco conectado. Este repositório continua sendo a fonte principal de conhecimento. As próximas etapas exigem autorização própria e revisão humana.

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

Deixe a porta 3000 livre ao executar os testes. Execute `npm run build` antes de `npm test` isoladamente. São oito casos em Chromium, combinando projetos desktop/móvel: identificação do produto e erros de execução, navegação por teclado, ausência de overflow entre 320 e 1280 pixels e análise axe WCAG A/AA. Automação não substitui avaliação humana com leitores de tela nem testes em Safari/Firefox.

## Estrutura e limites

- `src/app/`: layout, metadados, página e estilos Tailwind.
- `src/components/`: elementos visuais reutilizáveis.
- `src/modules/`: orientação para futuros módulos, sem regras antecipadas.
- `src/lib/server/`: fronteira documentada para persistência futura PostgreSQL/Supabase.
- `tests/`: testes de navegador; `playwright.config.ts` controla projetos e servidor.
- `.github/workflows/ci.yml`: verificações em PRs e na `main`, com permissões somente de leitura.

As [decisões técnicas](docs/TECHNICAL_FOUNDATION.md) detalham versões, justificativas, orçamento e pendências. Não há ORM, schema, migrações, SDK Supabase ou chamadas externas em execução. Autenticação, acesso a dados e hospedagem serão definidos em suas próprias entregas. PWA permanece futura.

Se o download do navegador estiver bloqueado em um ambiente que já tenha Chromium, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run check`; detalhes e limites no registro técnico.

O CI usa runner Linux padrão gratuito em repositório público, com timeout e cancelamento de execuções obsoletas. Se a visibilidade ou as condições gratuitas mudarem, reavaliar antes de usar cotas pagas. Nenhum deploy, infraestrutura, serviço pago, cobrança automática ou credencial é configurado. Vercel Hobby e Supabase Free são apenas candidatos; o uso comercial do Hobby precisa de verificação própria antes de qualquer adoção.
