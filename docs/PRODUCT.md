# Visão do produto

## Objetivo e status

Ajudar clubes de degustação a organizar a troca de cafés em grãos ou moídos, acompanhar obrigações de contribuição e construir um histórico coletivo de avaliações e rankings. A experiência será Web responsiva e evoluirá para PWA.

O projeto permanece em planejamento, sem aplicação, banco ou infraestrutura implementados. As **21 decisões funcionais aprovadas** estão numeradas em [Regras de negócio](BUSINESS_RULES.md). Propostas técnicas e divisão em etapas dependem de revisão; a visão completa não implica que tudo pertença ao MVP ou esteja autorizado para implementação.

## Visão funcional aprovada

| Área | Comportamento | Decisões |
| --- | --- | --- |
| Administração e participação | Grupos privados com vários administradores e criador original preservado; qualquer administrador altera regras para próximos ciclos com auditoria; novos membros participam ativamente a partir do próximo ciclo; saída não depende de quitação, com decisão administrativa justificada sobre pendências | 1–4 |
| Avaliações | Aroma, sabor, acidez, corpo e finalização; nota geral direta de 1 a 5 estrelas; avaliações dos colegas e média do café somente após avaliação própria, inclusive para administradores; edição auditada até encerramento automático; avaliação do próprio café permitida; ausência registrada sem zero nem penalidade automática | 5–10 |
| Contribuições e catálogo | Cada contribuição é independente, privada e contextual; Produto é compartilhado; busca inicial no catálogo, cadastro obrigatório de nome/marca/quantidade e enriquecimento opcional assistido por IA com revisão humana; vínculos exatos verificáveis automáticos, duvidosos confirmados; correções colaborativas validadas por moderação global | 11–15 |
| Publicação e rankings | Autorização por administradores do grupo, desativada por padrão e reversível; média global aritmética com peso igual por avaliação válida autorizada; degustações repetidas contam; ranking usa ajuste bayesiano com `m` dinâmico; exibe média real, contagem e pontuação separadas; prevê filtros, categorias, popularidade e mais avaliados | 16–21 |

Permanecem confirmadas a configuração de frequência, quantidade mínima, prazo de entrega, inadimplência e penalidades por grupo; uma contribuição por membro elegível por ciclo; preservação de avaliações anteriores e regras históricas. Contribuição mensal de 250g continua sendo sugestão inicial configurável. Penalidade por falta de contribuição pode bloquear novas avaliações até regularização conforme a política aplicável; não se confunde com ausência de avaliação.

## Perfis e limites aprovados

Participantes consultam informações autorizadas do grupo, contribuem e avaliam conforme elegibilidade. O criador pode promover membros a administradores. Administradores do grupo alteram regras, decidem sobre obrigações na saída e autorizam/revogam participação nas médias globais; não recebem exceção à visibilidade das avaliações.

Qualquer usuário autenticado pode sugerir correções no catálogo. Moderadores globais têm perfil específico para validar essas correções, independente da administração dos grupos. Administradores da plataforma gerenciam os moderadores. Essa função de moderação não concede acesso automático aos grupos privados. Permissões restantes não devem ser presumidas.

## MVP e evolução — planejamento proposto

Priorizar fundação e autenticação, grupos privados e permissões, ciclos, contribuições com cadastro manual e avaliações com médias internas e encerramento automático. A entrada terá seu mecanismo definido antes da entrega de grupos; a regra aprovada de participação apenas no próximo ciclo permanece válida qualquer que seja esse mecanismo.

Planejar depois catálogo compartilhado e vinculação, assistência por IA com leitura de embalagem e pesquisa externa, moderação global, médias publicadas por autorização e rankings estatísticos completos. O cadastro manual inicial mantém nome e marca contextuais e quantidade na contribuição; a busca global passa a iniciar o fluxo quando a fase de catálogo estiver disponível. Isso é sequenciamento de entrega, preservando a decisão 12 na visão completa.

Rankings privados continuam na visão do produto, com recorte e ordenação a definir antes de sua entrega. A política de inadimplência aplicável deve ser validada antes de liberar avaliações para usuários reais; a regularização poderá ser entregue junto ao fluxo principal conforme [Roadmap](ROADMAP.md).

A PWA começa com responsividade, manifesto e instalação quando suportada. Escrita offline, sincronização, notificações push e operação completa offline exigem escopo próprio. Recomendações de cafés por IA são distintas da assistência aprovada ao cadastro e não foram incluídas. Comércio, pagamentos, cobrança automática, logística e rede social aberta continuam fora do compromisso inicial.

## Critérios de sucesso propostos

- Um grupo conclui um ciclo com contribuições independentes, avaliações auditáveis e média interna verificável, sem vazamento antes da avaliação própria.
- Entradas, saídas e mudanças de regras respeitam vigência e preservam históricos.
- Usuários e moderadores não acessam grupos privados por identificadores ou permissões indevidas.
- Catálogo distingue Produto de Contribuição; sugestões automáticas têm incertezas e fontes indicadas e confirmação humana.
- Agregados globais refletem autorizações e revogações, com média real e pontuação ajustada compreensíveis e sem notas ou identidades privadas.
- O fluxo principal funciona por teclado, em dispositivos móveis e desktop.

## Questões abertas

Estas questões exigem decisão do responsável; alternativas técnicas não são aprovação funcional.

| Questão | Impacto e decisão necessária |
| --- | --- |
| Convites e aprovação de entrada; expiração, revogação e aceite | Definir mecanismo de ingresso e prevenção de abuso sem mudar elegibilidade apenas no próximo ciclo |
| Critérios completos de inadimplência por falta de contribuição | Definir gatilhos, tolerância, penalidades, recursos, regularização e autoridades; ausência de avaliação não gera penalidade automática |
| Remoção de administradores e transferência de titularidade | Definir autoridade, último administrador e sucessão, preservando criador original |
| Escala e obrigatoriedade das cinco características sensoriais | Completar formulário e validade; nota geral direta já está aprovada em 1 a 5 estrelas |
| Identificação de versões, lotes e torras no catálogo | Definir identidade e critérios de correspondência exata; evitar unir produtos distintos |
| Fluxo exato de validação e contestação de correções | Definir critérios de aceite/rejeição, revisores, recursos e conflitos de interesse |
| Critérios matemáticos definitivos de `m` | Aprovar fórmula operacional, distribuição, limites de estabilidade e frequência de atualização; nenhum valor ilustrativo é decisão |
| Referência `C` e elegibilidade para rankings | Definir cálculo da referência do catálogo, recortes, desempates, mínimos e ausência de amostra autorizada |
| Métrica de popularidade | Definir sinal, janela e critérios; popularidade não é automaticamente quantidade de avaliações |
| Retenção, exclusão e privacidade | Definir dados pessoais, prazos, exportação/exclusão, eventual anonimização e compatibilidade com histórico e auditoria |
| Custos e fornecedores de IA | Aprovar orçamento, limites, fornecedores, tratamento de fotos, fontes externas, licenças e uso de dados |
| Matriz de permissões restante | Definir confirmação de entrega, penalidades, regularização, consulta após saída e demais operações ainda sem autoridade aprovada |
| Publicação segura e regra de visibilidade | Definir campos públicos, limiar contra inferência, recortes temporais e tratamento de superfícies globais para quem ainda não avaliou |

Detalhes de prazos, entrega, avaliações, saída e publicação estão em [Regras de negócio](BUSINESS_RULES.md#questões-abertas-e-impacto). Decisões técnicas de autenticação, versões, acesso a dados, hospedagem e execução assíncrona estão em [Arquitetura](ARCHITECTURE.md). Resolver cada lacuna antes de implementar a parte dependente dela, mantendo os demais documentos consistentes.
