# Migrações Supabase em produção

O workflow **Supabase production migrations** é acionado manualmente pela aba **Actions** e usa o commit selecionado de `main` após aprovação no environment `production`. A CI de PRs e da `main` continua executando as verificações da aplicação e os testes de migração/RLS com PostgreSQL descartável.

## Configuração inicial

1. No GitHub, proteja `main` em **Settings → Rules → Rulesets** ou **Branches**. Exija PR com aprovação e o check existente `CI / verify` antes do merge. Restrinja pushes diretos e bypass das regras, inclusive para administradores, e exija nova aprovação se houver mudanças após a revisão.
2. Em **Settings → Environments**, crie ou edite **production**. Em **Deployment branches and tags**, selecione apenas a branch `main`. Configure **Required reviewers**, habilite **Prevent self-review** e desabilite o bypass das regras do environment por administradores. Confirme que outra pessoa pode aprovar antes de cadastrar o secret.
3. No Dashboard do Supabase, abra o projeto de produção e confira o identificador do projeto. Em **Connect**, copie a URI do **Session pooler** (porta `5432`, compatível com IPv4). Substitua o marcador pela senha do banco, aplicando *percent-encoding* aos caracteres especiais da senha, sem codificar a URI inteira. Use o usuário e o host exibidos pelo painel. Confirme que as restrições de rede permitem o runner e que a conexão funciona com TLS e verificação de nome do servidor.
4. Após o merge humano deste workflow, dispare uma execução com o secret ainda ausente. Confirme que o job aguarda a aprovação de outro revisor e cancele a execução. Se a proteção estiver indisponível ou incompleta, mantenha o secret sem cadastro e suspenda a implantação.
5. Cadastre a URI como **Environment secret** `SUPABASE_DB_URL` somente em `production`. O fluxo usa a conexão PostgreSQL com privilégios de migração e TLS `verify-full`. Preserve a senha para esse fim em GitHub Secrets e mantenha a URI fora do Git, das variáveis públicas e dos logs. A conexão direta ao banco dispensa token da API de gerenciamento e chaves da aplicação.
6. Conclua a reconciliação abaixo com autorização explícita antes de aprovar a primeira implantação.

## Reconciliação única de perfis e grupos

Todo o procedimento pode ser feito no navegador, inclusive no Windows.

1. Após o merge humano deste PR, confira em **Settings → Environments → production** que apenas `main` pode implantar, que **Required reviewers** exige aprovação de outra pessoa, que **Prevent self-review** está ativo e que o bypass administrativo está desabilitado. O secret `SUPABASE_DB_URL` já está cadastrado. Se a proteção estiver indisponível, suspenda a execução.
2. Combine uma janela sem outras operações de migração. Confirme o projeto Supabase associado ao secret e revise os registros da aplicação manual de [perfis](../supabase/migrations/202611100001_profiles.sql) e [grupos](../supabase/migrations/202611170001_groups.sql). Confira a configuração de acesso do projeto, incluindo os papéis dos clientes e se `private` fica fora dos schemas expostos pela API.
3. Em **Actions → Supabase production migrations → Run workflow**, escolha `main` e a operação **reconcile**. Outra pessoa confere o commit, o projeto e a evidência de aplicação manual e aprova em **Review deployments → production**.
4. Aguarde **Histórico inicial verificado** ou **Histórico inicial já registrado** no log. Se houver divergência ou falha, revise a seção indicada e o estado do banco antes de repetir. Se um reparo anterior registrou só perfis, uma nova execução pode completar grupos após conferir novamente as definições.

O workflow compara definições, proprietários, permissões, RLS, políticas, funções, triggers, constraints e índices com os dois arquivos SQL aplicados a um PostgreSQL 17 descartável. Também confirma que todos os usuários têm perfil. A leitura em produção roda em transações somente leitura. Diferenças de definição, grants do projeto ou versão do PostgreSQL podem exigir análise antes de prosseguir. O workflow informa as seções divergentes sem publicar definições, dados ou credenciais.

A CLI **2.54.11** cria `supabase_migrations.schema_migrations` quando ela estiver ausente. O modo **reconcile** usa `migration repair --status applied` com apenas as versões iniciais faltantes, `202611100001` e `202611170001`, e confere o histórico resultante. O SQL dessas migrações só roda na referência descartável. A reconciliação não inicia o deploy de migrações novas. [Código do reparo na CLI 2.54.11](https://github.com/supabase/cli/blob/v2.54.11/internal/migration/repair/repair.go)

Para reproduzir o teste local da CI, use Docker, Python 3 e Supabase CLI 2.54.11 no PATH e execute `npm run test:rls -- --with-reconciliation`. O teste começa com a aplicação instalada e sem tabela de histórico.

## Próximas migrações

1. Adicione um arquivo SQL com versão única e posterior às existentes, usando o timestamp de 14 dígitos gerado por `supabase migration new nome_da_migracao`. Preserve os arquivos já aplicados. Teste com `npm run test:rls` e em ambiente descartável ou de teste. Prefira o controle transacional da CLI para alterações compatíveis e revise qualquer migração que precise de controle próprio de transação.
2. Abra o PR e aguarde aprovação, CI verde e merge humano. Em **Actions → Supabase production migrations → Run workflow**, selecione `main` e a operação **deploy**. Confira o commit da execução e o PR correspondente. Outro responsável deve revisar e aprovar o deployment em **Review deployments → production**.
3. Acompanhe o job até o fim. Ele compara o histórico remoto com o início da sequência local, simula o envio, verifica novamente o histórico e aplica apenas as versões pendentes. O log informa as versões aplicadas após confirmar o histórico final. Quando tudo já estiver aplicado, o job encerra na primeira leitura. Mantenha outros operadores e automações de migração fora da mesma janela.
4. Confirme o resultado em **Actions** e no histórico do banco. Faça uma verificação funcional da mudança em produção, preservando os dados existentes. Se o job falhar, consulte a etapa e as versões registradas e verifique o schema antes de disparar outra execução. Uma execução com várias migrações pode ter aplicado parte delas. Os logs do workflow omitem a saída bruta da CLI e do PostgreSQL para evitar exposição de credenciais ou dados. Investigue com acesso restrito e reproduza o problema no ambiente de teste.

Para produção, preserve o histórico e corrija problemas com migrações novas e revisadas. Os comandos `db reset` e `db push --include-all` ficam fora do procedimento de implantação e reconciliação.

[Proteção de environments no GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) · [Conexões PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-migration-repair)
