# Regras de negócio

As regras abaixo marcadas como confirmadas vêm do objetivo inicial do produto. Modelos de estados, mecanismos e critérios ainda não definidos são propostas ou dúvidas, sem autorização de implementação.

## Grupos e regras — confirmado

Cada grupo é privado e possui regras configuráveis de frequência de contribuição, quantidade mínima de café, prazo de entrega, inadimplência e penalidades. A sugestão inicial é um ciclo mensal com 250g por membro; não é uma regra global obrigatória nem um valor imutável.

Cada membro deve contribuir com um café por ciclo conforme as regras aplicáveis. Os cafés podem ser em grãos ou moídos. Não há autorização para impor um tipo único de café a todos os grupos.

## Ciclos e histórico

**Confirmado:** as regras aplicáveis a ciclos concluídos devem permanecer registradas historicamente.

**Proposta:** regras versionadas e uma referência ou cópia imutável da versão aplicável em cada ciclo, com responsável e data da alteração. Estados candidatos: planejamento → aberto → concluído. O encerramento deve preservar regras e dados necessários para explicar o resultado.

**Em aberto:** momento em que a regra fica vinculada ao ciclo; mudanças durante ciclos abertos; fuso horário e interpretação de prazos; extensão de prazo, cancelamento, reabertura e correção de ciclos concluídos. Não presumir que uma alteração atual recalcula ciclos antigos.

## Contribuições

**Confirmado:** cada membro tem obrigação de contribuir com um café por ciclo conforme a regra vigente do grupo, incluindo quantidade e prazo.

**Proposta:** registrar grupo, ciclo, membro responsável, identificação do café, apresentação (grãos/moído), quantidade em gramas e evidência temporal de registro/entrega. Diferenciar cadastro de confirmação de entrega para não tratar um formulário preenchido como cumprimento físico automático.

**Em aberto:** confirmação de entrega e seu responsável; contribuições parciais, adicionais ou substitutas; múltiplas embalagens; cafés repetidos; exceções e dispensas; elegibilidade de membros que entram ou saem durante o ciclo. Não presumir que contribuições adicionais eliminam obrigações futuras.

## Avaliações e média — confirmado

Todos os membros elegíveis podem avaliar os cafés degustados no ciclo. Para um café com `n` avaliações válidas e notas `x₁ … xₙ`, a média é:

`média = (x₁ + … + xₙ) / n`, para `n > 0`.

Cada avaliação válida tem o mesmo peso. Exemplo exclusivamente aritmético, sem definir escala: notas 6 e 8 produzem média 7. Na ausência de avaliações válidas, a média é indefinida, não zero.

Penalidades posteriores não apagam avaliações anteriores. A aplicação de uma penalidade não deve retroativamente invalidar uma avaliação válida apenas por causa dessa penalidade.

**Em aberto:** escala e precisão das notas; critérios de validade; uma ou mais avaliações por membro/café/ciclo; edição, retirada, contestação e prazo; avaliação do próprio café; necessidade de presença na degustação; se notas de outros membros ficam visíveis antes de avaliar. Não assumir critérios de elegibilidade não aprovados.

**Proposta:** guardar precisão suficiente para calcular a média sem arredondar cada entrada; arredondar somente na apresentação conforme política a aprovar.

## Inadimplência e penalidades — confirmado

O grupo define inadimplência e penalidades. Uma penalidade configurável pode bloquear novas avaliações até a regularização. Avaliações anteriores são preservadas. A existência dessa opção não significa que todos os grupos devam ativá-la.

**Proposta:** registrar obrigação, regra utilizada, motivo, início da penalidade e regularização para permitir auditoria; verificar bloqueios no servidor ao receber uma avaliação, inclusive quando enviada por uma interface desatualizada.

**Em aberto:** gatilho automático ou manual; tolerância e aplicação após o prazo; tipos de penalidade além do bloqueio; recursos e perdão; autoridade para regularizar; prazo de efeito da regularização; efeito sobre edição de avaliações existentes e sobre outros ciclos ou grupos. Não presumir penalidade entre grupos nem inventar multas financeiras.

## Rankings e compartilhamento — confirmado

Rankings derivam das médias de avaliações válidas. Cada grupo pode compartilhar rankings e médias publicamente mediante autorização explícita. O conteúdo público deve conter apenas informações autorizadas e nunca notas individuais privadas.

**Proposta:** publicação desativada por padrão, autorização registrada com escopo e responsável, projeção pública com lista explícita de campos permitidos e mecanismo de revogação. Não reutilizar uma resposta privada inteira em uma rota pública.

**Em aberto:** ranking por ciclo ou acumulado; agregação de contribuições do mesmo café em ciclos distintos; desempate, mínimo de avaliações e exibição de contagem; publicação do nome do grupo ou autores das contribuições; pessoa autorizadora; atualização ao vivo ou retrato do encerramento. Médias de amostras pequenas podem revelar notas individuais por inferência: definir política de publicação e limiar de agregação antes da funcionalidade pública.

A revogação deverá impedir novas consultas públicas na plataforma e invalidar caches controlados por ela, conforme desenho a aprovar. Cópias feitas por terceiros não podem ser prometidas como recuperáveis.

## Cenários de aceitação a automatizar após aprovação

- Regras de grupos distintos não se misturam; a sugestão de 250g mensais pode ser configurada.
- Média considera somente avaliações válidas e não converte ausência de notas em zero.
- Membro elegível pode avaliar; bloqueio ativo impede nova avaliação no servidor.
- Penalidade posterior preserva avaliações anteriores e sua participação válida na média.
- Regularização remove o bloqueio de acordo com a política aprovada.
- Alteração de regras não muda o histórico de um ciclo concluído.
- Usuário de outro grupo não acessa dados privados, mesmo alterando identificadores da requisição.
- Publicação exige autorização e omite notas individuais; revogação impede novas consultas públicas.

Os cenários dependentes de decisões pendentes devem receber critérios completos antes da implementação, sem testes que cristalizem suposições.
