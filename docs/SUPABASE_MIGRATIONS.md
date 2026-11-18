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

O registro esperado em produção começa com `202611100001` (perfis) e `202611170001` (grupos), nessa ordem. O operador responsável deve reconciliar apenas as versões efetivamente aplicadas e ainda ausentes. Registre a autorização e a janela de manutenção e confirme a disponibilidade de recuperação ou de um backup. Suspenda outras operações de migração durante o procedimento.

1. Use um checkout limpo de `main` e a Supabase CLI **2.54.11**. No Supabase, confirme o projeto e examine o histórico com esta consulta de leitura no SQL Editor. Se a primeira consulta retornar `NULL`, a tabela ainda não existe. Se existir, execute a segunda consulta.

   ```sql
   select to_regclass('supabase_migrations.schema_migrations');

   select version, name
   from supabase_migrations.schema_migrations
   order by version collate "C";
   ```

2. Compare o SQL versionado com a instalação real, usando consultas de leitura aos catálogos e registros da execução manual. Para [perfis](../supabase/migrations/202611100001_profiles.sql), confira definições, constraints, grants, RLS, políticas, função/trigger de criação de perfil e se usuários existentes já têm perfil. Para [grupos](../supabase/migrations/202611170001_groups.sql), confira tabelas, índices, constraints, RLS, políticas, grants, funções/RPC e triggers, incluindo os de auditoria. Verifique as definições e o comportamento esperado. A existência das tabelas por si só é insuficiente. Se houver aplicação parcial, versão desconhecida, ordem incoerente ou dúvida sobre o estado real, pare e investigue antes de alterar o histórico.
3. Após autorização e verificação, use uma estação de trabalho confiável, com TLS e a credencial injetada na sessão temporariamente, sem imprimir a URI ou colá-la em um comando salvo no histórico. Se **ambas** as versões estiverem ausentes, registre as duas explicitamente. Se apenas grupos estiver ausente e perfis estiver registrado, informe apenas `202611170001`. Se ambas constarem no histórico, prossiga para a verificação. Se grupos constar e perfis estiver ausente, investigue o histórico antes de qualquer reparo.

   ```bash
   export PGSSLMODE=verify-full
   # Configure PGSSLROOTCERT com o caminho do bundle de CAs da estação.
   supabase migration repair --db-url "${SUPABASE_DB_URL:?}" --status applied \
     202611100001 202611170001
   supabase migration list --db-url "${SUPABASE_DB_URL:?}"
   unset SUPABASE_DB_URL
   ```

   O comando `repair` registra as versões informadas na tabela de histórico, deixando o SQL das migrações sem reexecução. Execute os comandos fora do GitHub Actions, com logs de depuração e rastreamento do shell desativados.
4. Confirme as duas versões nas colunas local e remota e repita a consulta ao histórico. Registre o projeto, o commit, as versões reconciliadas e a aprovação, omitindo credenciais. Se a reconciliação falhar, confira novamente o histórico antes de repetir.

## Próximas migrações

1. Adicione um arquivo SQL com versão única e posterior às existentes, usando o timestamp de 14 dígitos gerado por `supabase migration new nome_da_migracao`. Preserve os arquivos já aplicados. Teste com `npm run test:rls` e em ambiente descartável ou de teste. Prefira o controle transacional da CLI para alterações compatíveis e revise qualquer migração que precise de controle próprio de transação.
2. Abra o PR e aguarde aprovação, CI verde e merge humano. Em **Actions → Supabase production migrations → Run workflow**, selecione `main`. Confira o commit da execução e o PR correspondente. Outro responsável deve revisar e aprovar o deployment em **Review deployments → production**.
3. Acompanhe o job até o fim. Ele compara o histórico remoto com o início da sequência local, simula o envio, verifica novamente o histórico e aplica apenas as versões pendentes. O log informa as versões aplicadas após confirmar o histórico final. Quando tudo já estiver aplicado, o job encerra na primeira leitura. Mantenha outros operadores e automações de migração fora da mesma janela.
4. Confirme o resultado em **Actions** e no histórico do banco. Faça uma verificação funcional da mudança em produção, preservando os dados existentes. Se o job falhar, consulte a etapa e as versões registradas e verifique o schema antes de disparar outra execução. Uma execução com várias migrações pode ter aplicado parte delas. Os logs do workflow omitem a saída bruta da CLI e do PostgreSQL para evitar exposição de credenciais ou dados. Investigue com acesso restrito e reproduza o problema no ambiente de teste.

Para produção, preserve o histórico e corrija problemas com migrações novas e revisadas. Os comandos `db reset` e `db push --include-all` ficam fora do procedimento de implantação e reconciliação.

[Proteção de environments no GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) · [Conexões PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-migration-repair)
