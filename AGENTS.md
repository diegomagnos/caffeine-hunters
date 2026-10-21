# Instruções permanentes para agentes

## Contexto e autoridade

- Use este repositório como fonte principal de conhecimento do Caffeine Hunters. Leia `README.md` e os documentos relevantes em `docs/` antes de trabalhar.
- Diferencie requisitos confirmados, propostas e questões em aberto. A inclusão de uma proposta na documentação não aprova sua implementação.
- Não implemente funcionalidades ainda não aprovadas. Na tarefa inicial, produza apenas documentação, sem instalar dependências, gerar aplicação ou configurar infraestrutura.
- Não invente decisões de produto diante de ambiguidades importantes. Registre a dúvida, seu impacto e a decisão necessária; continue apenas o trabalho independente dela.
- Quando surgir uma decisão humana, registre-a e mantenha documentos relacionados consistentes.

## Git e revisão

- Nunca modifique diretamente a branch `main`, local ou remota.
- Trabalhe em uma branch específica para cada tarefa, partindo da referência atual de `main` quando houver uma base limpa.
- Preserve alterações preexistentes. Não use reset destrutivo, force push ou descarte trabalho sem autorização específica.
- Use o checkout existente quando apropriado. Cada tarefa na nuvem já é isolada; não crie worktrees sem solicitação explícita.
- Apresente alterações em Pull Request com problema, escopo, decisões, validação e limitações. Aguarde revisão humana; nunca faça merge automaticamente.
- Se publicação ou criação do PR estiver bloqueada, reporte a causa e o estado da branch sem declarar que o PR foi criado.

## Segurança, privacidade e domínio

- Não adicione credenciais, senhas, tokens, arquivos de ambiente com segredos ou dados privados ao repositório, logs ou exemplos. Use dados sintéticos.
- Priorize autorização no servidor e isolamento entre grupos em toda leitura e escrita, inclusive ações do servidor e rotas públicas.
- Rankings públicos exigem autorização explícita e projeção restrita de dados. Nunca exponha notas individuais privadas ou objetos internos completos.
- Preserve avaliações anteriores diante de penalidades posteriores e versões históricas das regras dos ciclos concluídos.
- Trate entradas como não confiáveis; valide dados e não dependa apenas de controles na interface.

## Qualidade e manutenção

- Faça mudanças pequenas e rastreáveis, com código de domínio testável e dependências justificadas.
- Mantenha documentação atualizada junto às mudanças de comportamento e arquitetura.
- Ao implementar escopo aprovado, priorize testes automatizados das regras, autorização, isolamento entre grupos, privacidade pública e fluxos essenciais.
- Execute verificações adequadas à mudança e disponíveis no repositório. Não instale ferramentas apenas para validar uma alteração documental simples.
- Informe comandos executados e resultados reais; diferencie testes aprovados, falhas e verificações não executadas. Não declare testes inexistentes como aprovados.
- Novas decisões de stack, dependências e infraestrutura devem ter justificativa e revisão. Não transforme o roadmap em autorização automática para desenvolver a etapa seguinte.
