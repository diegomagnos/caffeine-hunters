# Caffeine Hunters

Plataforma Web responsiva, com experiência PWA, para clubes de degustação de cafés em grãos ou moídos. Cada clube poderá reunir participantes em um grupo privado, organizar ciclos, acompanhar contribuições, avaliar cafés e consultar rankings.

O projeto está em **planejamento**. Este repositório é a fonte principal de conhecimento; ainda não há aplicação, dependências, banco configurado ou comandos de execução e testes. Esta entrega não autoriza a implementação das funcionalidades propostas.

## Visão inicial

- Grupos privados com participantes convidados e regras próprias.
- Contribuição de um café por membro a cada ciclo; sugestão inicial de frequência mensal e quantidade de 250g por membro.
- Avaliações por membros elegíveis e média aritmética das avaliações válidas.
- Penalidades configuráveis, preservando avaliações anteriores e o histórico das regras.
- Rankings públicos somente com autorização explícita e dados permitidos, sem notas individuais privadas.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Produto](docs/PRODUCT.md) | Objetivo, funcionalidades, escopo e dúvidas de produto |
| [Regras de negócio](docs/BUSINESS_RULES.md) | Ciclos, contribuições, avaliações, penalidades e histórico |
| [Arquitetura](docs/ARCHITECTURE.md) | Avaliação da stack sugerida e decisões técnicas propostas |
| [Roadmap](docs/ROADMAP.md) | Etapas incrementais e critérios de revisão |
| [Instruções para agentes](AGENTS.md) | Limites, segurança e fluxo de contribuição |

## Como começar

1. Leia esta documentação e registre dúvidas antes de propor mudanças de comportamento.
2. Confirme o escopo aprovado para a tarefa. Propostas nestes documentos dependem de revisão humana.
3. Atualize sua referência de `main` e crie uma branch específica, por exemplo `docs/tema` ou `feat/escopo-aprovado`. Nunca altere `main` diretamente.
4. Faça apenas as alterações autorizadas, valide-as e atualize a documentação afetada.
5. Abra um Pull Request para revisão humana. Não realize merge automaticamente.

Não há instalação a executar nesta fase. Versões, gerenciador de pacotes, autenticação, migrações e hospedagem serão definidos antes da implementação. Quando aprovados e implementados, os comandos reais de preparação, execução e testes deverão ser documentados aqui, sem credenciais ou dados privados.
