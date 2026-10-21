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

Requisitos funcionais aprovados: [decisões 1–21](BUSINESS_RULES.md#as-21-decisões-aprovadas). Os mecanismos desta arquitetura são **propostas para revisão**, sem schema, migração, integração ou serviço implementado. A stack sugerida acima é preservada, sem novas escolhas de fornecedor ou infraestrutura.

Fluxo principal: navegador → interface/rotas Next.js → serviços de aplicação e domínio → persistência PostgreSQL. O monólito separaria módulos de identidade/permissões, grupos/ciclos, contribuições/avaliações, catálogo/moderação, enriquecimento e publicação/rankings. ORM ou biblioteca SQL permanece pendente.

Operações interativas ficam no servidor autenticado. Encerramento por prazo, integrações de IA e reprocessamento de agregados exigem processamento assíncrono planejado. Agendador, fila ou mecanismo equivalente e execução de trabalhadores serão escolhidos posteriormente, sem presumir microserviços. Inadimplência automática continua dependente de decisão própria.

## Modelo conceitual e relacionamentos propostos

As separações Produto/Contribuição, múltiplos administradores e avaliações contextuais são requisitos aprovados; nomes físicos de tabelas, estados e restrições específicas ainda são proposta.

| Conceito | Responsabilidade e relações |
| --- | --- |
| Usuário | Identidade autenticada e dados pessoais mínimos; participa de vários grupos e pode ter papéis globais independentes |
| Grupo | Privado; referencia criador original de forma durável e possui membros, versões de regras e ciclos |
| Participação e papel no grupo | Relação usuário/grupo com ingresso, elegibilidade a partir do próximo ciclo e saída; vários administradores por grupo; promoção não substitui criador |
| Convite ou solicitação | Mecanismo de ingresso a definir; não antecipar aprovação, expiração ou aceite |
| Versão de regras | Configuração, autor, data, diferenças e vigência para próximos ciclos; cada ciclo referencia a versão aplicável |
| Ciclo | Pertence a um grupo, tem prazos e contribuições; proposta de registrar elegibilidade contextual e estado de encerramento |
| Obrigação, saída e decisão administrativa | Obrigação ligada à participação/ciclo; solicitação e saída preservadas; decisão de manter/dispensar obrigações com administrador e justificativa, sem bloquear saída |
| Contribuição | Entidade privada independente ligada a participante, grupo e ciclo; nome, marca, quantidade e dados contextuais; referência opcional ao Produto durante evolução do cadastro manual |
| Produto | Identidade compartilhada no catálogo, atributos descritivos e fontes; um Produto pode ter muitas contribuições em vários grupos/ciclos |
| Vínculo de produto | Associação da contribuição ao Produto com origem automática exata ou confirmação humana, evidência e histórico de correções |
| Avaliação e revisão | Avaliação do autor para a contribuição degustada; nota geral direta, características e validade; revisões auditadas, sem multiplicar avaliações nos cálculos |
| Penalidade e regularização | Restrição conforme regra de contribuição, motivo, vigência e regularização; preserva avaliações anteriores |
| Sugestão de correção e validação | Proposta autenticada sobre Produto com justificativa/fontes, decisão de moderação e histórico; somente versão validada é publicada |
| Papel global | Moderador de catálogo ou administrador de plataforma, separado da participação em grupos |
| Enriquecimento e fonte | Trabalho assíncrono, imagem de entrada, sugestões por campo, incertezas, fontes, uso/custo, falhas e confirmação humana |
| Autorização de publicação | Por grupo, desativada inicialmente, com responsável, data, versão de autorização e revogação |
| Projeção global e versão de cálculo | Produto, média real, contagem, pontuação ajustada e parâmetros vigentes; somente dados permitidos para publicação |
| Evento de auditoria | Ator, instante, recurso, ação, diferenças e motivo quando exigido, com acesso restrito; não transformar auditoria privada em conteúdo global |

Restrições relacionais e transações devem impedir referências cruzadas: contribuição, ciclo e participação pertencem ao mesmo grupo; avaliação aponta para a contribuição correta e autor elegível. A identidade do Produto não substitui a identidade da contribuição. A regra de unicidade dentro da mesma degustação depende de decisão; a modelagem não pode impedir avaliações do mesmo usuário em degustações distintas nem contar revisões como avaliações adicionais.

## Permissões e fronteiras de dados

| Perfil | Autoridade aprovada | Limite |
| --- | --- | --- |
| Participante | Consultar informações permitidas; contribuir/avaliar a partir do próximo ciclo ao ingresso; editar avaliação até prazo; solicitar saída | Notas alheias e média interna apenas após avaliação própria daquela contribuição |
| Criador | Promover outros membros a administradores; identificação original preservada | Transferência de titularidade e remoção de administradores pendentes |
| Administrador de grupo | Alterar regras para próximos ciclos, decidir obrigações na saída e autorizar/revogar médias globais | Mesmo bloqueio de visibilidade de avaliações; não recebe moderação global automaticamente |
| Usuário autenticado | Sugerir correção no catálogo global | Não publica correção sem validação |
| Moderador global | Validar correções de catálogo | Não ganha acesso a dados privados dos grupos |
| Administrador da plataforma | Gerenciar moderadores globais | Outras permissões, inclusive acesso privado excepcional, não estão aprovadas |
| Consulta pública | Acessar somente projeção global permitida e segura | Sem notas individuais, identidades ou objetos privados internos |

Aplicar autorização no servidor em leitura, gravação, ações do servidor, rotas, tarefas e consultas de histórico. A lista de campos liberados para publicação deve ser explícita. Antes de liberar notas de colegas ou médias internas, verificar a avaliação do solicitante para aquela contribuição; não enviar valores ocultos na resposta HTML, dados de hidratação, APIs, exportações ou cache.

Catálogo global e dados privados devem ter modelos e serviços separados, mesmo no mesmo banco proposto. Nome, marca e atributos públicos do Produto não autorizam acesso a quantidade, participante, ciclo, avaliações ou fotografias contextuais da contribuição. A confirmação de sugestões de IA não equivale à aprovação de uma correção de Produto global já existente; essa alteração segue moderação. O fluxo de publicação de produtos inéditos ainda requer detalhamento.

## Busca, duplicatas e vinculação híbrida

Proposta de fluxo: buscar no catálogo → apresentar candidatos → selecionar Produto existente ou registrar contribuição com novo cadastro → vincular com proveniência. Nome e marca podem ajudar na busca, mas sozinhos não garantem correspondência exata; versões, lotes e torras precisam de critérios aprovados. Quantidade permanece contextual à contribuição, sem ser deduzida obrigatoriamente de uma embalagem padrão do Produto.

Somente identidade exata verificável permite vínculo automático. Candidatos ambíguos exigem confirmação humana, sem mesclar avaliações. Registrar evidências, autor/confirmador e alterações do vínculo; permitir correção auditada. Se a correção mudar o Produto atribuído a avaliações já publicadas, reprocessar agregados dos produtos afetados, sem expor contexto privado. Algoritmo de similaridade, critérios de duplicata e eventual fusão de Produtos são especificações futuras.

## Enriquecimento por IA e pesquisa externa

Proposta de fluxo, preservando a decisão 12:

1. Após busca sem resultado, oferecer foto opcional e assistência; cadastro manual continua disponível e exige nome, marca e quantidade.
2. Validar tipo/tamanho e acesso à imagem no servidor; propor remoção de metadados desnecessários e armazenamento privado da entrada. Limites concretos dependem de decisão de custos e privacidade.
3. Criar trabalho assíncrono para leitura da embalagem, extração de campos, pesquisa externa e localização de imagem candidata adequada. Enviar aos provedores somente dados necessários; nunca incluir histórico ou avaliações privadas do grupo como contexto automático.
4. Tratar texto da embalagem e páginas externas como dados não confiáveis. Conteúdo externo não pode alterar instruções, permissões ou iniciar operações arbitrárias; restringir ferramentas, destinos de pesquisa e formatos de resposta para evitar injeção de instruções e requisições a recursos internos.
5. Apresentar sugestões por campo, incertezas, divergências, fontes e data de consulta quando disponíveis. Não inventar fonte ou certeza para informação não confirmada.
6. O usuário revisa e confirma; sugestões não sobrescrevem silenciosamente o cadastro. Imagem candidata exige verificação de origem e direitos de uso; disponibilidade pública não implica licença. Sem imagem utilizável, seguir sem foto.
7. Preservar proveniência do que foi aceito e encaminhar correções de catálogo existente à moderação; fluxo exato de validação, contestação e novos Produtos permanece a especificar.

Processamento proposto com estados rastreáveis, cancelamento, limites por usuário/grupo e globais, deduplicação de trabalhos, tempo máximo, tentativas limitadas com espera progressiva e proteção contra falhas repetidas. Idempotência evita duplicar cadastro e consumo por reenvios. Falha de OCR, busca, provedor ou licença deve deixar o usuário revisar dados parciais ou concluir manualmente, sem bloquear o fluxo principal. Monitorar latência, uso, custo e falhas sem registrar imagens ou dados privados indiscriminadamente. Fornecedores, preços, orçamento, cotas, retenção e contratos de uso de dados não estão escolhidos.

## Encerramento automático e consistência

Proposta: prazo configurado do ciclo convertido para instante inequívoco, com fuso e interpretação documentados antes da implementação. Um trabalho agendado encerra avaliações, calcula resultados com notas válidas e registra ausências dos participantes elegíveis, sem nota zero ou penalidade automática.

O servidor deve validar prazo e estado em cada inclusão/edição, mesmo se o agendador atrasar. Gravação concorrente com encerramento requer transação e ordenação consistente: aceitar somente operações dentro do prazo conforme política a definir, impedir escrita posterior e não perder revisão aceita. Encerramento idempotente e recuperação após falha devem produzir o mesmo conjunto final. Média interna usa nota geral atual por avaliação válida; revisões ficam no histórico. Sem notas, estado Sem avaliações.

Versionar regras por ciclo, sem aplicar mudanças atuais ao ciclo vigente ou concluído. Consultas pós-encerramento continuam sujeitas à decisão 6; administrador não obtém exceção. Exceções de reabertura/correção histórica dependem de decisão e não integram a edição normal aprovada.

## Autorização global, agregação e revogação

Proposta: manter uma projeção pública restrita por Produto e uma proveniência interna que permita identificar quais avaliações autorizadas compõem cada agregado. Para o conjunto elegível `A` de um Produto, `v = |A|` e `R = soma(notas gerais atuais de A) / v`, se `v > 0`. Não calcular média de médias por grupo. Avaliações repetidas em degustações diferentes contam, revisões não. Sem avaliações autorizadas, não fabricar média.

Eventos de autorização/revogação, edição válida, correção de vínculo e mudanças de validade disparam atualização dos produtos afetados. O escopo temporal da autorização e o momento de inclusão de avaliações de ciclos abertos permanecem pendentes. A revogação remove a contribuição do grupo dos cálculos publicados, não apaga a avaliação privada.

Para impedir republicação de dados revogados por trabalhos antigos, propor versões de autorização e de projeção, revalidação antes da publicação e descarte/reexecução de resultados obsoletos. Invalidar projeções, caches, resultados filtrados e contagens afetados; enquanto o recálculo não estiver consistente, suspender a projeção afetada em vez de servir números antigos. O mecanismo de propagação durável pode usar registro transacional de eventos a selecionar; não há infraestrutura escolhida.

Definir proteção contra inferência antes da exposição: limiar de agregação, filtros e diferenças entre consultas não podem revelar nota ou identidade individual, nem contornar o bloqueio de visibilidade para quem não avaliou. Essas proteções e sua interação com as superfícies globais exigem especificação; não inventar limiar ou anonimato garantido. Cópias externas não são controláveis pela revogação da plataforma.

## Pontuação estatística dinâmica e rankings

A fórmula conceitual aprovada é `pontuacao = (v * R + m * C) / (v + m)`. Publicar média real `R`, quantidade `v` e pontuação ajustada em campos distintos; o ranking estatístico usa a última. Referência `C`, distribuição para `m` e todos os recortes devem usar apenas o universo válido autorizado. Dados de grupos sem autorização não podem influenciar nem mesmo os parâmetros públicos.

Proposta de processamento: formar retrato consistente do catálogo elegível → calcular referência e distribuição de contagens → obter `m` pela política aprovada → recalcular pontuações → publicar versão de ranking de forma consistente. Registrar internamente versão do algoritmo, universo, instante, parâmetros e fontes dos agregados para auditoria/reprodução sem expor participantes.

**Pendente:** fórmula operacional de `m`, critérios matemáticos, referência exata de `C`, limites de estabilidade, frequência periódica e comportamento com catálogo vazio ou pequeno. Alternativas para discussão incluem quantis das contagens ou medidas robustas da distribuição, com limites inferiores/superiores e suavização temporal; nenhuma alternativa ou valor está aprovado. Mudanças de autorização podem afetar `C` e `m` e, portanto, exigir recálculo do catálogo inteiro, além dos produtos diretamente atingidos. O desenho deve prever invalidação segura nesse caso, reprocessamento periódico e recuperação idempotente de falhas.

Prever consultas para ranking geral, filtros por atributos, categorias, mais avaliados e popularidade, usando projeção autorizada e versão consistente dos parâmetros. Recortes por categoria, desempates, mínimos e política de inclusão precisam ser definidos. Popularidade exige métrica própria a aprovar; não usar automaticamente contagem de avaliações ou pontuação como substituto. Índices, materialização e estratégia incremental só devem ser escolhidos com necessidades medidas.

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

## Plano de testes para implementação futura

Nenhum teste de aplicação existe ou foi executado nesta entrega documental. Planejar:

| Camada | Evidências necessárias |
| --- | --- |
| Domínio | Decisões 1–21; promoção/criador, vigência, entrada/saída, obrigações, avaliação própria, escala, edição e preservação histórica |
| Cálculos | Média interna sem zeros por ausência; Sem avaliações; média global ponderada por avaliação; repetições versus revisões; fórmula bayesiana e recálculo após revogação; propriedades/limites de `m` quando aprovados |
| Persistência e concorrência | Integridade entre grupo/ciclo/contribuição/autor; gravação versus encerramento; dupla execução de trabalhos; revisão e auditoria atômicas; recuperação de falha |
| Permissões e privacidade | Acesso cruzado negado; bloqueio de notas e médias antes da avaliação própria para participante/administrador em todas as respostas; moderador sem acesso privado; campos públicos restritos; proteção contra inferência após especificação |
| Catálogo e moderação | Contribuições independentes do mesmo Produto; vínculos ambíguos confirmados; correção auditada/reprocessada; correções não publicadas antes da validação |
| IA e integrações | Falhas/limites/tempo máximo, entradas maliciosas, fontes e incertezas, confirmação humana, direitos de imagem, repetição idempotente, conclusão manual sem provedor; testes com respostas simuladas sem custo externo obrigatório |
| Publicação e rankings | Opção inicial desativada; autorizações/revogações concorrentes com trabalhos e caches; parâmetros sem dados não autorizados; ranking geral, categorias, filtros e mais avaliados; popularidade somente após métrica aprovada |
| Jornada e acessibilidade | Ciclo completo, bloqueio/regularização, saída com pendências, formulário de estrelas por teclado/leitor de tela, dispositivos móveis/desktop e instalação PWA quando entregue |

Antes de automatizar critérios pendentes, aprovar resultados esperados. As verificações atuais são somente documentais; não instalar ferramentas ou criar aplicação para satisfazer esse plano.

## Decisões pendentes

Autenticação, permissões restantes, ORM/biblioteca SQL, versões, infraestrutura, fila/agendador, fornecedores/custos de IA, política de cache, retenção, proteção contra inferência e detalhes offline dependem de revisão. O encerramento automático é requisito aprovado; seu mecanismo técnico ainda será escolhido. `m` dinâmico é requisito aprovado; sua fórmula operacional, estabilidade e periodicidade permanecem pendentes. Registrar futuras decisões com contexto, alternativas, consequência e status, mantendo este documento e as regras de negócio atualizados.
