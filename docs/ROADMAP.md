# Roadmap incremental

As etapas são propostas, sem datas ou autorização automática para implementação. Cada tarefa exige escopo aprovado, branch própria e Pull Request com revisão humana; nenhum merge automático. Uma etapa pode ser dividida em entregas menores.

| Etapa | Entrega proposta | Critério para revisão e conclusão |
| --- | --- | --- |
| 0 — Planejamento atual | README, instruções para agentes, produto, regras, arquitetura e roadmap | Documentos consistentes, dúvidas explícitas e revisão humana; nenhuma implementação ou instalação |
| 1 — Decisões e fundação | Resolver decisões bloqueadoras, aprovar stack/versões, criar base técnica, configuração documentada e CI | Escopo aprovado; instalação reproduzível com lockfile; build, tipos e verificações iniciais executados; nenhum segredo no Git |
| 2 — Identidade e grupos privados | Autenticação, participações, permissões e convites | Políticas de autenticação e papéis aprovadas; testes de autorização, revogação de convite e isolamento entre grupos |
| 3 — Regras, ciclos e contribuições | Configuração por grupo, histórico de regras, ciclos, obrigações e registro/entrega de café | Políticas de prazos, elegibilidade e confirmação aprovadas; testes de transição e preservação histórica, inclusive mudanças concorrentes |
| 4 — Avaliações e rankings privados | Elegibilidade, notas, média aritmética e ranking no escopo aprovado | Escala, validade, edição e ranking definidos; testes de cálculo, ausência de notas, isolamento e jornada de degustação |
| 5 — Inadimplência e regularização | Aplicação das penalidades aprovadas e liberação após regularização | Gatilhos, autoridade e alcance definidos; testes comprovam bloqueio no servidor e preservação das avaliações anteriores |
| 6 — Publicação autorizada | Consentimento explícito, projeção pública e revogação | Campos, autorização e risco de inferência aprovados; testes de ausência de dados privados e invalidação dos caches controlados pela plataforma |
| 7 — PWA e preparação operacional | Manifesto, instalação compatível, política de cache, acessibilidade e operação | HTTPS e comportamento PWA verificados; nenhum cache privado indevido; fluxo responsivo acessível; backups/restauração e observabilidade validados |

Responsividade, segurança, testes e manutenção acompanham todas as etapas, não apenas a etapa final. Até a etapa 5, o fluxo de avaliações não deve ser liberado a usuários reais sem a política de penalidades aplicável validada; etapas 4 e 5 podem ser entregues juntas se necessário.

## Decisões antes de desenvolver

- Antes da fundação: aprovar arquitetura, versões, autenticação, estratégia de dados e ambiente de desenvolvimento/teste.
- Antes dos grupos: definir papéis, permissões, convites e tratamento de dados pessoais.
- Antes dos ciclos: definir quando regras são fixadas, prazos/fuso, entradas e saídas, entrega e correções históricas.
- Antes das avaliações: definir escala, validade, autoria, edição, elegibilidade, desempates e agregação.
- Antes das penalidades: definir detecção, tolerância, regularização e alcance do bloqueio.
- Antes de publicar: definir autorizadores, campos, amostras mínimas, revogação e retenção.

As perguntas estão detalhadas em [Produto](PRODUCT.md) e [Regras de negócio](BUSINESS_RULES.md). Quando respondidas, atualizar os documentos e os critérios de aceitação da etapa correspondente.

## Fora do compromisso inicial

Pagamentos, logística, recomendações, notificações push e escrita offline/sincronização não têm compromisso de entrega. Devem receber análise e aprovação próprias caso sejam solicitados.

## Evidência por Pull Request

Descrever o escopo aprovado, comportamento ou documentos resultantes, decisões e dúvidas remanescentes, validações executadas e limitações. Mudanças documentais podem ser verificadas por revisão de conteúdo, links e diff; mudanças de software exigem verificações proporcionais ao comportamento implementado.
