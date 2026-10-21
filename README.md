# Caffeine Hunters

Plataforma Web responsiva, com experiência PWA, para clubes de degustação de cafés em grãos ou moídos. Cada clube poderá reunir participantes em um grupo privado, organizar ciclos, acompanhar contribuições, avaliar cafés e consultar rankings.

O projeto está em **planejamento**. Este repositório é a fonte principal de conhecimento; ainda não há aplicação, dependências, banco configurado ou comandos de execução e testes. Esta entrega não autoriza a implementação das funcionalidades propostas.

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

Não há instalação a executar nesta fase. Versões, gerenciador de pacotes, autenticação, migrações e hospedagem serão definidos antes da implementação. Quando aprovados e implementados, os comandos reais de preparação, execução e testes deverão ser documentados aqui, sem credenciais ou dados privados.
