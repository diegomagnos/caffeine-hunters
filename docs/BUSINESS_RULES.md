# Regras de negócio

## Status e terminologia

As 21 decisões numeradas abaixo foram aprovadas pelo responsável pelo produto e constituem a referência funcional desta consolidação. Os requisitos anteriores compatíveis permanecem válidos. Propostas técnicas e questões abertas aparecem em seções separadas; documentar uma proposta não autoriza implementá-la.

- **Produto:** identidade compartilhada no catálogo global.
- **Contribuição:** registro privado de um café trazido por um participante, vinculado ao grupo e ao ciclo; pode referenciar um Produto.
- **Avaliação:** avaliação contextual da contribuição degustada. Compartilhar um Produto não compartilha automaticamente avaliações entre contribuições ou grupos.
- **Média interna:** média das notas gerais válidas de uma contribuição no grupo, sujeita à regra de visibilidade da decisão 6.
- **Média global:** média das notas gerais válidas e autorizadas associadas a um Produto.
- **Pontuação ajustada:** resultado estatístico usado no ranking, separado da média real.

## Requisitos anteriores preservados — confirmados

Cada grupo é privado e configura frequência de contribuição, quantidade mínima, prazo de entrega, inadimplência e penalidades. Cada membro elegível deve contribuir com um café por ciclo segundo a regra aplicável. Cafés podem ser em grãos ou moídos. A sugestão de ciclo mensal com 250g por membro continua sendo sugestão, sem obrigatoriedade global.

Uma penalidade configurável por falta de contribuição pode bloquear novas avaliações até a regularização. A existência dessa opção não obriga todos os grupos a ativá-la. Penalidades posteriores não apagam nem invalidam retroativamente avaliações válidas anteriores. Ausência de avaliação não aciona penalidade automática (decisão 10). Os critérios completos de inadimplência permanecem pendentes.

Permanece na visão o compartilhamento público autorizado de médias e rankings dos grupos, somente com dados permitidos e sem notas individuais privadas. Seu recorte e formato ainda exigem especificação, respeitando a visibilidade da decisão 6; não se confunde com a autorização para compor agregados globais da decisão 16.

## As 21 decisões aprovadas

### Administração e participação

**1. Múltiplos administradores:** cada grupo pode ter vários administradores. O criador poderá promover outros membros. Preservar a identificação do criador original.

**2. Alteração das regras:** qualquer administrador pode alterar as regras do grupo. Registrar autor, data e alterações. Mudanças aplicam-se aos próximos ciclos, sem alterar retroativamente ciclos encerrados.

**3. Entrada de membros:** novos membros ingressam imediatamente no grupo, mas somente passam a contribuir e avaliar no próximo ciclo. Podem consultar informações e históricos do grupo conforme suas permissões.

**4. Saída de membros:** o participante pode solicitar sua saída. Um administrador decide se mantém ou dispensa obrigações pendentes. Registrar decisão e justificativa. Preservar avaliações históricas. Obrigações pendentes não impedem a saída.

### Avaliações

**5. Avaliação detalhada:** cada café recebe avaliações de aroma, sabor, acidez, corpo e finalização, além de uma nota geral de 1 a 5 estrelas. A nota geral é atribuída diretamente pelo participante e não precisa ser a média das características. Especificar a interface com estrelas.

**6. Visibilidade:** cada participante só poderá visualizar as avaliações dos colegas e a média do café depois de registrar sua própria avaliação daquele café. Administradores seguem a mesma regra.

**7. Edição:** participantes podem editar suas avaliações até o encerramento do período de avaliação. Registrar histórico das alterações. Após o encerramento, bloquear edições.

**8. Avaliação do próprio café:** participantes podem avaliar os cafés que eles próprios contribuíram. Essas avaliações entram normalmente no cálculo das médias.

**9. Encerramento:** avaliações encerram automaticamente no prazo configurado pelo grupo. Calcular a média com as notas válidas recebidas. Ausências não equivalem a nota zero. Sem avaliações, apresentar o estado "Sem avaliações".

**10. Ausências:** registrar quais participantes deixaram de avaliar os cafés, sem aplicar penalidades automáticas pela ausência de avaliação.

### Contribuições e catálogo

**11. Contribuições independentes:** cada contribuição de café é uma entidade independente, mesmo quando vários participantes trazem o mesmo produto. Preservar vínculo com participante, grupo e ciclo.

**12. Cadastro inteligente:** nome, marca e quantidade são obrigatórios no registro da contribuição; torra, origem, variedade, processo, moagem, notas sensoriais e foto são opcionais, conforme aplicabilidade ao produto ou à contribuição.

O fluxo começa com uma busca no catálogo existente. Se o produto não for encontrado, oferecer envio de foto e assistência por IA para analisar a embalagem, pesquisar informações na internet, sugerir um cadastro mais fiel e localizar uma imagem adequada. O usuário revisa e confirma as sugestões. Informações incertas devem ser identificadas, e fontes consultadas devem ser registradas quando disponíveis. Respeitar direitos de uso de imagens.

Separar claramente a entidade compartilhada **Produto** da entidade privada/contextual **Contribuição**. Várias contribuições podem referenciar o mesmo produto, sem compartilhar automaticamente seus registros de avaliação.

**13. Vinculação híbrida:** produtos podem ser vinculados automaticamente quando a correspondência for exata e verificável. Correspondências duvidosas exigem confirmação humana. Permitir correção de vínculos incorretos, com auditoria.

**14. Correções colaborativas:** qualquer usuário autenticado pode sugerir correções no catálogo global. Alterações precisam ser validadas antes de serem publicadas. Preservar justificativas, fontes e histórico.

**15. Moderadores globais:** criar um perfil de permissão específico para validar correções do catálogo global, independente das funções administrativas dos grupos. Administradores da plataforma gerenciam esses moderadores. A moderação não concede acesso automático aos dados privados dos grupos.

### Médias e rankings globais

**16. Autorização por grupo:** administradores de cada grupo decidem se suas avaliações podem contribuir para as médias globais. A opção começa desativada. A autorização é reversível, e sua revogação remove os dados correspondentes dos cálculos globais publicados. Não expor notas individuais ou identidades dos avaliadores publicamente.

**17. Média global:** utilizar a média aritmética das notas gerais válidas autorizadas, atribuindo o mesmo peso a cada avaliação, independentemente do grupo.

**18. Avaliações repetidas:** todas as avaliações válidas do mesmo produto podem contar na média global, mesmo quando realizadas pelo mesmo usuário em degustações diferentes.

**19. Ranking estatístico:** utilizar pontuação ajustada pela quantidade de avaliações, baseada em média bayesiana ponderada. Preservar e exibir separadamente a média real, a quantidade de avaliações e a pontuação ajustada.

Fórmula conceitual:

`pontuacao = (v * R + m * C) / (v + m)`

Onde:
- `v`: número de avaliações válidas do produto;
- `R`: média real do produto;
- `C`: referência média do catálogo;
- `m`: intensidade do ajuste estatístico.

**20. Parâmetro dinâmico:** o parâmetro `m` deve ser calculado dinamicamente a partir da distribuição de avaliações do catálogo, utilizando critérios documentados, limites de estabilidade e atualização periódica. A fórmula operacional, os limites e a frequência ainda precisam de especificação; não apresentar valores ilustrativos como decisões definitivas.

**21. Rankings completos:** prever ranking geral, filtros por características dos produtos, rankings por categorias, produtos mais populares e produtos mais avaliados. A métrica de popularidade ainda precisa ser definida. Os rankings devem respeitar as autorizações de publicação.

## Interpretação dos cálculos e da visibilidade

Para uma contribuição com `n > 0` notas gerais válidas `x₁ … xₙ`, a média interna é `(x₁ + … + xₙ) / n`, com o mesmo peso por avaliação. Exemplo exclusivamente aritmético dentro da escala aprovada: notas 3 e 5 resultam em média 4. Ausência de avaliação não entra no denominador. Com `n = 0`, mostrar **Sem avaliações**.

A regra de visibilidade é por contribuição avaliada: avaliar outra contribuição do mesmo Produto não libera avaliações dos colegas daquela que ainda não foi avaliada. Administradores não têm exceção. A conclusão do prazo não concede automaticamente acesso a quem não avaliou. A aplicação dessa restrição às superfícies globais que possam permitir inferência deve ser especificada antes da publicação, preservando as decisões 6 e 16.

Na média global, cada avaliação válida e autorizada pesa igualmente; não calcular média de médias dos grupos. Uma edição substitui o valor atual da mesma avaliação; seu histórico não cria novas avaliações globais. Degustações diferentes podem produzir novas avaliações contabilizáveis do mesmo usuário e Produto (decisão 18). Contribuições distintas mantêm seus próprios registros.

`R` e `v` da pontuação ajustada devem considerar somente avaliações válidas autorizadas. A referência `C` e a distribuição usada para `m` também devem respeitar as autorizações, sem incorporar dados privados não autorizados. Sem avaliações autorizadas, não inventar média real nem apresentar apenas o valor de referência como avaliação do Produto. A política de inclusão no ranking ainda precisa ser definida.

## Interface de avaliação — requisito e proposta

**Aprovado:** nota geral atribuída diretamente pelo participante em uma interface de 1 a 5 estrelas, independente das cinco características. A edição fica disponível apenas até o encerramento.

**Proposta de interface acessível:** seletor de estrelas com rótulo textual da nota, navegação por teclado, foco visível e anúncio da seleção para leitores de tela; cinco campos identificados como aroma, sabor, acidez, corpo e finalização; informar prazo e bloqueio após encerramento. Não preencher a nota geral como média automática. Precisão da nota geral (estrelas inteiras ou frações), escala e obrigatoriedade das características ainda exigem decisão.

## Propostas operacionais, sujeitas a revisão

- Versionar regras e associar ao ciclo uma referência ou cópia imutável da versão aplicável. Estados candidatos do ciclo: planejamento → aberto → concluído. A transição exata e o momento de fixação da versão exigem especificação; alterações de regras valem para próximos ciclos, conforme decisão 2.
- Registrar quantidade em gramas, apresentação e evidências temporais de registro/entrega. Distinguir cadastro da contribuição de confirmação de entrega física.
- Registrar obrigação, regra, motivo, início da penalidade e regularização; verificar elegibilidade e bloqueios no servidor, inclusive em requisições feitas por interfaces desatualizadas.
- Calcular sem arredondar entradas ou médias intermediárias e arredondar apenas na apresentação, conforme política a aprovar.
- Publicar por projeção explícita de campos permitidos e invalidar caches controlados pela plataforma após revogação. A revogação remove as avaliações do grupo dos cálculos globais publicados; cópias feitas por terceiros não podem ser prometidas como recuperáveis.

## Questões abertas e impacto

A lista central está em [Produto](PRODUCT.md#questões-abertas). Permanecem também os seguintes detalhes de domínio, sem alterar decisões já aprovadas:

| Questão | Impacto / decisão necessária |
| --- | --- |
| Momento exato de fixação da versão do ciclo; fuso e interpretação dos prazos | Especificar calendário e vigência, mantendo alterações apenas para próximos ciclos |
| Extensão de prazo, cancelamento, reabertura e correção de ciclos concluídos | Definir exceções sem permitir edição normal após encerramento ou reescrita retroativa das regras |
| Confirmação de entrega e responsável; contribuições parciais, extras, substitutas e múltiplas embalagens | Definir cumprimento da obrigação; contribuição adicional não elimina automaticamente obrigação futura |
| Saída: prazo da decisão administrativa, efeito sobre avaliação em andamento e consulta posterior | Detalhar execução da saída sem condicioná-la à quitação; preservar históricos e registrar obrigações mantidas/dispensadas |
| Quantidade de avaliações por participante/contribuição em uma mesma degustação; presença, retirada e contestação | Completar validade e prevenção de duplicatas; não restringir repetições em degustações diferentes aprovadas na decisão 18 |
| Precisão da nota geral, arredondamento e médias sensoriais | Definir apresentação e validação sem substituir a nota geral direta |
| Inadimplência por contribuição: gatilhos, tolerância, recursos, perdão, regularização e autoridade | Definir aplicação e alcance; efeito sobre edição continua pendente; não presumir penalidade entre grupos ou multas |
| Rankings privados por ciclo/acumulados, desempate, mínimo de avaliações e inclusão de produtos sem avaliações | Definir ordenação e elegibilidade sem confundir média real com pontuação ajustada |
| Escopo temporal da autorização global e publicação durante avaliações abertas ou apenas após encerramento | Detalhar seleção sem liberar avaliações privadas ou contornar a regra de visibilidade |
| Campos públicos, limiar de agregação e proteção contra inferência com amostras pequenas | Impedir exposição indireta de notas/identidades, inclusive por filtros e diferenças entre consultas |
| Publicação de nome do grupo ou autoria de contribuições | Exige decisão própria; autorização para médias não autoriza esses dados automaticamente |

## Cenários de aceitação para implementação futura

- Vários administradores coexistem; promoção preserva criador original; regra alterada tem autor, data e diferenças e não muda ciclo vigente/concluído.
- Entrada imediata permite consulta autorizada, mas contribuição e avaliação somente no próximo ciclo.
- Saída ocorre com pendência mantida ou dispensada, com justificativa administrativa e avaliações históricas preservadas.
- Nota geral de 1 a 5 é direta e independente das características; avaliação do próprio café conta normalmente.
- Participante e administrador sem avaliação própria não recebem notas dos colegas nem média interna, inclusive em respostas do servidor e após encerramento.
- Edição até o prazo gera histórico e substitui a nota atual; após o prazo, novas gravações e edições são bloqueadas, mesmo se o trabalho agendado atrasar.
- Encerramento automático usa somente notas válidas, registra ausentes sem penalidade automática e mostra Sem avaliações quando aplicável.
- Duas contribuições do mesmo Produto preservam vínculos, avaliações e visibilidade independentes.
- Cadastro exige nome, marca e quantidade; campos opcionais não impedem registro manual; IA não publica sugestões sem revisão e confirmação.
- Correspondência duvidosa exige confirmação; correção de vínculo gera auditoria; sugestão de catálogo não altera conteúdo público antes da validação.
- Administrador de grupo não se torna moderador global; moderador não ganha acesso privado; administrador da plataforma gerencia moderadores.
- Publicação começa desativada; autorizações/revogações mudam também cálculos, parâmetros e caches globais, sem expor dados privados.
- Média global não é média de médias: um grupo com uma nota 5 e outro com três notas 1 resulta em média global 2 para o Produto, antes de qualquer ajuste estatístico.
- Avaliações do mesmo usuário em degustações diferentes contam; revisões de uma avaliação não multiplicam contagem.
- Ranking exibe média real, quantidade e pontuação ajustada separadamente; filtros, categorias e contagens respeitam autorização.
- Regras e dados não atravessam grupos; penalidade posterior preserva avaliações anteriores.

Os testes futuros de critérios pendentes só devem ser escritos depois da decisão correspondente, sem cristalizar suposições. A proposta técnica de testes está em [Arquitetura](ARCHITECTURE.md).
