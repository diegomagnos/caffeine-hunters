# Visão do produto

## Objetivo

Ajudar clubes de degustação a organizar a troca e a degustação de cafés em grãos ou moídos, acompanhar obrigações de contribuição e construir um histórico coletivo de avaliações e rankings. A experiência deverá funcionar em telas pequenas e grandes e evoluir para uma PWA.

## Usuários e contexto

Os usuários poderão criar grupos privados e convidar participantes. Cada grupo terá regras próprias. A existência de funções de administração e participação é uma proposta operacional; permissões detalhadas e transferência de responsabilidade dependem de aprovação.

## Requisitos confirmados

- Criar grupos privados e convidar participantes.
- Organizar ciclos de degustação e registrar contribuições de cafés.
- Configurar frequência, quantidade mínima, prazo de entrega, inadimplência e penalidades por grupo.
- Sugerir contribuição mensal de 250g por membro; cada membro deve contribuir com um café por ciclo conforme a regra vigente.
- Permitir avaliações por todos os membros elegíveis e calcular a média aritmética das avaliações válidas.
- Preservar avaliações anteriores e regras históricas de ciclos concluídos.
- Consultar rankings e médias; compartilhar dados públicos apenas com autorização explícita e sem notas individuais privadas.

## Escopo inicial proposto, sujeito a aprovação

Um fluxo completo de grupo privado: criação, convite e aceite, configuração de regras, abertura de ciclo, contribuição, avaliação, acompanhamento de pendências, regularização e encerramento. Rankings privados acompanham o fluxo. A publicação de rankings será uma etapa própria, com revisão de privacidade antes de disponibilizá-la.

A PWA deve começar pela experiência responsiva, manifesto e instalação quando suportada. Edição offline, sincronização de avaliações, notificações push e uso completo offline exigem decisões adicionais e não integram automaticamente o escopo inicial.

Não estão propostos para o primeiro escopo: comércio de café, pagamentos e cobrança financeira automática, logística de entregas, rede social aberta ou recomendações por inteligência artificial. Qualquer inclusão exige aprovação.

## Critérios de sucesso propostos

- Um grupo consegue concluir um ciclo com contribuições e avaliações registradas e média verificável.
- Participantes de um grupo não conseguem acessar dados privados de outro grupo.
- Regras históricas e avaliações anteriores permanecem consultáveis após mudanças e penalidades.
- A publicação expõe somente os dados expressamente autorizados; a revogação interrompe o acesso público na plataforma.
- O fluxo principal é utilizável por teclado, em dispositivos móveis e desktop.

## Perguntas que exigem decisão

| Questão | Impacto |
| --- | --- |
| Quem pode criar/alterar regras, confirmar entregas, penalizar e autorizar publicações? | Matriz de permissões e auditoria |
| Como definir membros elegíveis, inclusive entradas/saídas durante um ciclo e avaliação do próprio café? | Obrigações e validade das avaliações |
| Qual escala de notas e quais critérios de degustação serão usados? | Formulário, validação e cálculo |
| Cada registro representa um café físico, uma contribuição ou um produto que pode se repetir? | Identidade dos cafés e comparação histórica |
| Como convites expiram e são revogados? Qual mecanismo de autenticação? | Segurança e acesso |
| Quais informações e períodos podem ser publicados e quem autoriza/revoga? | Consentimento, conteúdo público e retenção |
| Quais dados pessoais serão coletados, por quanto tempo e como atender exclusão? | Privacidade e compatibilidade com histórico |

Dúvidas específicas de ciclos, avaliações e penalidades estão em [Regras de negócio](BUSINESS_RULES.md). Não resolver essas perguntas por suposição em código.
