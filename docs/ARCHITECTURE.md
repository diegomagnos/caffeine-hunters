# Proposta de arquitetura

Status: proposta para revisão humana. Nenhuma dependência instalada ou funcionalidade implementada. Versões, biblioteca de autenticação, acesso a dados e hospedagem não estão decididos.

## Avaliação da stack sugerida

| Tecnologia | Avaliação e motivo | Limitações e cuidados |
| --- | --- | --- |
| Next.js | Adequado para reunir interface React, rotas e operações no servidor em uma aplicação inicial. Propõe-se App Router e TypeScript. | Cache, renderização e ações do servidor exigem autorização explícita; uma ação do servidor não é privada por definição. Hospedagem e versão devem ser verificadas antes da adoção. |
| React | Adequado para formulários, estados de ciclos e interfaces responsivas reutilizáveis. | Controlar complexidade de estado e JavaScript enviado ao navegador; regras críticas permanecem no servidor. |
| TypeScript | Recomendado com verificação estrita para explicitar contratos e estados do domínio. | Tipos não validam requisições em execução; entradas e permissões precisam de validação própria. |
| Tailwind CSS | Adequado para layout responsivo e consistência visual com componentes reutilizáveis. | Exige disciplina de componentes e tokens; não garante acessibilidade. Avaliar contraste, foco e teclado. |
| PostgreSQL | Recomendado pela integridade relacional e transações necessárias a grupos, ciclos, contribuições e avaliações. | Requer migrações, backups, índices e planejamento de conexões; não substitui autorização da aplicação. |
| PWA | Adequada como evolução da Web responsiva, com manifesto e instalação em plataformas compatíveis. | É uma capacidade da aplicação, não um framework separado. Service worker e cache podem expor dados privados; offline e push ficam sujeitos a escopo próprio. |

A combinação é coerente para o produto. A proposta é um **monólito modular**, evitando serviços distribuídos antes de haver necessidade demonstrada. A aprovação desta documentação não dispensa a aprovação do escopo de implementação.

## Organização lógica proposta

Fluxo: navegador → interface/rotas Next.js → serviços de aplicação e regras de domínio → persistência PostgreSQL.

- Interface: navegação, formulários, acessibilidade e apresentação de rankings.
- Aplicação/domínio: permissões, ciclos, obrigações, elegibilidade, penalidades e cálculo de médias, sem depender da interface para garantir regras.
- Persistência: acesso a dados, transações e migrações. ORM ou biblioteca SQL será escolhido em decisão posterior, com avaliação de migrações, tipagem e manutenção.
- Publicação: consultas/projeções restritas para dados autorizados; autorização pública não concede acesso ao restante do grupo.

Não há necessidade inicial demonstrada de uma API independente ou de microserviços. Tarefas agendadas só serão planejadas após decidir se a inadimplência e outros eventos serão automáticos.

## Modelo conceitual candidato

| Conceito | Responsabilidade |
| --- | --- |
| Usuário | Identidade autenticada; dados pessoais mínimos |
| Grupo e participação | Associação privada e permissões por grupo |
| Convite | Entrada controlada no grupo; validade e revogação a definir |
| Versão de regras | Parâmetros e histórico das regras do grupo |
| Ciclo | Período de degustação e regras aplicáveis |
| Obrigação e contribuição | Acompanhamento do dever do membro e do café entregue |
| Avaliação | Nota, autor, café degustado e contexto de ciclo |
| Penalidade e regularização | Restrição vigente, motivo e histórico |
| Autorização de publicação | Escopo de dados públicos, responsável e revogação |

Este modelo não é um schema aprovado. A identidade de café versus contribuição, cardinalidades, unicidade de avaliação e estados dependem das dúvidas de negócio. Restrições relacionais e operações transacionais devem impedir referências cruzadas entre grupos e inconsistências entre elegibilidade, penalidades e gravação de avaliações, inclusive sob concorrência.

## Segurança e privacidade propostas

- Autenticação e sessões por solução mantida, a selecionar; não desenvolver armazenamento próprio de senhas sem justificativa e revisão.
- Autorizar cada operação no servidor com identidade, participação e recurso do grupo. Não confiar em um `groupId` fornecido pelo cliente.
- Validar entradas em execução, usar consultas parametrizadas e controlar abuso de convites e autenticação. Avaliar proteção contra CSRF conforme a estratégia de sessão.
- Usar TLS, segredos fora do Git e privilégios mínimos no banco. Logs não devem conter tokens, notas privadas ou dados pessoais desnecessários.
- Guardar alterações relevantes de regras, penalidades e publicação com trilha de auditoria mínima; retenção e acesso a essa trilha dependem de política aprovada.
- Evitar cache compartilhado de respostas autenticadas e armazenamento de dados privados no service worker. A política de cache público deve permitir revogação e evitar inferência de notas individuais.
- Definir retenção, exportação, exclusão e eventual anonimização antes de coletar dados reais, conciliando privacidade com o histórico exigido.

## Operação e qualidade propostas

Após aprovação, selecionar versões suportadas e compatíveis de Node.js, Next.js, React, TypeScript, Tailwind e PostgreSQL; registrar versões, gerenciador e lockfile. Não fixar versões presumidas nesta etapa.

Documentar configuração local e variáveis sem segredos, migrações e dados sintéticos. Separar ambientes de desenvolvimento, teste e produção. Escolher hospedagem considerando HTTPS, conexões PostgreSQL, backups e restauração testada. Observabilidade deverá cobrir erros e saúde do serviço sem expor informações privadas.

Testes propostos: unitários para regras e médias; integração com PostgreSQL para isolamento, autorização, transações e migrações; testes de ponta a ponta para ciclo completo, bloqueio/regularização e publicação/revogação; verificações de acessibilidade e instalação PWA quando disponíveis. CI deverá executar checks de tipos, lint, testes relevantes e build conforme os scripts aprovados. Não há esses comandos ou testes no repositório neste momento.

## Decisões pendentes

Autenticação, matriz de permissões, ORM/biblioteca SQL, versões, infraestrutura, política de cache, automações de prazo e detalhes offline dependem de revisão. Registrar futuras decisões com contexto, alternativas, consequência e status, mantendo este documento e as regras de negócio atualizados.
