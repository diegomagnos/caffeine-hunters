# Migrações Supabase em produção

O workflow **Supabase production migrations** é acionado manualmente pela aba **Actions** e usa o commit selecionado de `main` após aprovação manual obrigatória no environment `production`. A CI de PRs e da `main` continua executando as verificações da aplicação e os testes de migração/RLS com PostgreSQL descartável.

## Configuração inicial

1. No GitHub, proteja `main` em **Settings → Rules → Rulesets** ou **Branches**. Exija PR com aprovação e o check existente `CI / verify` antes do merge. Restrinja pushes diretos e bypass das regras, inclusive para administradores, e exija nova aprovação se houver mudanças após a revisão.
2. Em **Settings → Environments → production**, mantenha `diegomagnos` em **Required reviewers**, **Prevent self-review** desativado, bypass administrativo desativado e apenas `main` em **Deployment branches and tags**. Nesta fase de desenvolvimento, o proprietário pode aprovar manualmente uma execução que ele mesmo iniciou. Essa configuração oferece menos independência do que exigir aprovação de uma segunda pessoa. As regras de revisão e merge de PR em `main` são separadas da aprovação de deploy.
3. No Dashboard do Supabase, abra o projeto de produção e confira o identificador do projeto. Em **Connect**, copie a URI do **Session pooler** (porta `5432`, compatível com IPv4). Substitua o marcador pela senha do banco, aplicando *percent-encoding* aos caracteres especiais da senha, sem codificar a URI inteira. Use o usuário e o host exibidos pelo painel. Confirme que as restrições de rede permitem o runner e que a conexão funciona com TLS e verificação de nome do servidor.
4. Ao configurar um environment novo, com o workflow já em `main` e antes de cadastrar o secret, dispare uma execução para confirmar que o job fica aguardando a aprovação manual de `diegomagnos`. Cancele a execução enquanto ela aguarda aprovação. Se a proteção estiver indisponível ou incompleta, suspenda a implantação e deixe o secret sem cadastro.
5. Cadastre a URI como **Environment secret** `SUPABASE_DB_URL` somente em `production`. Use o hostname do **Session pooler** exibido no painel e mantenha as opções de TLS no workflow. Remova da URI parâmetros como `sslmode=require` e `sslrootcert`. Preserve a URI e a senha em GitHub Secrets.
6. No Supabase, abra **Database Settings → SSL Configuration → Download Certificate**. No GitHub, em **Settings → Environments → production → Environment secrets**, crie `SUPABASE_DB_SSL_ROOT_CERT` e cole todo o conteúdo PEM baixado, incluindo as linhas `BEGIN CERTIFICATE` e `END CERTIFICATE`. O workflow usa essa CA e `verify-full` com `psql` e com a Supabase CLI. A validação exige cadeia confiável e hostname correspondente. [Configuração TLS do Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement#a-note-about-postgres-ssl-modes)
7. Conclua a reconciliação abaixo com autorização explícita antes de aprovar a primeira implantação.

## Reconciliação única de perfis e grupos

Todo o procedimento pode ser feito no navegador, inclusive no Windows.

1. Com o workflow atualizado em `main`, confira as proteções de **production**, a URI do Session pooler em `SUPABASE_DB_URL` e a CA do Supabase em `SUPABASE_DB_SSL_ROOT_CERT`. Se a aprovação manual obrigatória ou outra proteção estiver indisponível, suspenda a execução.
2. Combine uma janela sem outras operações de migração. Confirme o projeto Supabase associado ao secret e revise os registros da aplicação manual de [perfis](../supabase/migrations/202611100001_profiles.sql) e [grupos](../supabase/migrations/202611170001_groups.sql). Confira a configuração de acesso do projeto, incluindo os papéis dos clientes e se `private` fica fora dos schemas expostos pela API.
3. Em **Actions → Supabase production migrations → Run workflow**, escolha `main` e a operação **reconcile**. `diegomagnos` confere o commit, o projeto e a evidência de aplicação manual antes de aprovar em **Review deployments → production**, inclusive se tiver iniciado a execução.
4. Aguarde **Histórico inicial verificado** ou **Histórico inicial já registrado** no log. Se houver divergência ou falha, revise a seção indicada e o estado do banco antes de repetir. Se um reparo anterior registrou só perfis, uma nova execução pode completar grupos após conferir novamente as definições.

O workflow compara definições, proprietários, permissões, RLS, políticas, funções, triggers, constraints e índices com os dois arquivos SQL aplicados a um PostgreSQL 17 descartável. Também confirma que todos os usuários têm perfil. A leitura em produção roda em transações somente leitura. Diferenças de definição, grants do projeto ou versão do PostgreSQL podem exigir análise antes de prosseguir. O workflow informa as seções divergentes sem publicar definições, dados ou credenciais.

A CLI **2.54.11** cria `supabase_migrations.schema_migrations` quando ela estiver ausente. O modo **reconcile** usa `migration repair --status applied` com apenas as versões iniciais faltantes, `202611100001` e `202611170001`, e confere o histórico resultante. O SQL dessas migrações só roda na referência descartável. A reconciliação não inicia o deploy de migrações novas. [Código do reparo na CLI 2.54.11](https://github.com/supabase/cli/blob/v2.54.11/internal/migration/repair/repair.go)

Para reproduzir o teste local da CI, use Docker, Python 3, OpenSSL e Supabase CLI 2.54.11 no PATH e execute `npm run test:rls -- --with-reconciliation`. O teste usa PostgreSQL descartável e verifica a conexão TLS com uma CA de teste.

### Se aparecerem divergências em permissões, funções ou proprietários

Com este diagnóstico em `main`, execute **Actions → Supabase production migrations → Run workflow → main → inspect** e aprove em **Review deployments → production**. A inspeção usa as mesmas consultas somente leitura da reconciliação e informa quais assinaturas, proprietários e grants diferem. Ela termina com erro se encontrar divergências e não chama a CLI de migrações. Se a base já estiver registrada, a inspeção informa esse estado sem comparar com uma referência anterior às possíveis migrações subsequentes.

- **Permissões.** A comparação usa as ACLs das cinco tabelas da aplicação, de suas colunas com grants, das funções examinadas e do schema `private`. O log indica privilégios ausentes ou adicionais, proprietário, concedente, beneficiário e opção de repasse. A ordem das entradas da ACL é irrelevante. A referência reproduz os grants padrão de `public` usados na fixture, incluindo `service_role`. A versão principal do PostgreSQL e as configurações do projeto podem explicar diferenças. Por exemplo, o PostgreSQL 17 acrescentou o privilégio de tabela `MAINTAIN`. Mesmo um grant plausível do ambiente exige revisão. [Inicialização do PostgreSQL no Supabase](https://github.com/supabase/postgres/blob/develop/migrations/db/init-scripts/00000000000000-initial-schema.sql) · [PostgreSQL 17](https://www.postgresql.org/docs/17/release-17.html)
- **Funções e proprietários.** O log caracteriza diferenças de corpo, configuração, `SECURITY DEFINER`, declaração, proprietário e assinaturas. A referência instala as migrações como `postgres`. Uma instalação por outro papel pode explicar um proprietário diferente. A troca é relevante para funções `SECURITY DEFINER`, que executam com os privilégios do proprietário. O deparser do PostgreSQL e a formatação de origem também podem mudar o texto comparado. Revise a definição em um canal restrito antes de considerar equivalência.
- **Escopo.** A consulta examina as funções com nomes das duas migrações, incluindo sobrecargas, e verifica o trigger da aplicação em `auth.users`, além do backfill. Funções gerenciadas como `auth.uid()` e ACLs dos schemas de Auth e Storage ficam fora da comparação. Nomes de papéis não padronizados, corpos SQL, configurações completas e valores do banco ficam fora dos logs.

Use o relatório para confirmar a causa antes de executar `reconcile` novamente. A inspeção e o reparo continuam bloqueando diferenças de grants, proprietários e definições. O relatório anterior que listava apenas as seções não identifica quais objetos divergiram.

### Se a leitura inicial falhar

O log mostra uma categoria fixa para a falha e omite a saída bruta do PostgreSQL. A ausência do schema `supabase_migrations` ou da tabela `schema_migrations` é um estado esperado para a reconciliação inicial. O workflow ainda exige a comparação completa com a referência antes de registrar versões.

- Para erro de formato, DNS, conexão ou autenticação, confira no painel do Supabase o projeto, a URI do **Session pooler**, a porta `5432`, o percent-encoding da senha e as restrições de rede. Atualize `SUPABASE_DB_URL` no GitHub Environment somente se precisar corrigir a URI.
- Para erro de cadeia TLS, confira se `SUPABASE_DB_SSL_ROOT_CERT` contém a CA vigente baixada do painel. Para erro de hostname, confira se a URI usa o DNS do Session pooler exibido em **Connect**. Mantenha `verify-full` e as configurações TLS do Supabase.
- Para erro de permissão ou de consulta, confirme o papel usado e examine o histórico e a estrutura do banco em modo somente leitura antes de prosseguir. Uma falha de leitura interrompe a execução.

Quando a correção estiver em `main`, inicie uma **nova execução** com **Run workflow → main → reconcile** e aprove manualmente em `production`. **Re-run jobs** usa o commit original da execução anterior. [Sobre reexecuções do GitHub Actions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)

## Próximas migrações

1. Adicione um arquivo SQL com versão única e posterior às existentes, usando o timestamp de 14 dígitos gerado por `supabase migration new nome_da_migracao`. Preserve os arquivos já aplicados. Teste com `npm run test:rls` e em ambiente descartável ou de teste. Prefira o controle transacional da CLI para alterações compatíveis e revise qualquer migração que precise de controle próprio de transação.
2. Abra o PR e aguarde aprovação, CI verde e merge humano. Em **Actions → Supabase production migrations → Run workflow**, selecione `main` e a operação **deploy**. `diegomagnos` confere o commit da execução e o PR correspondente antes de aprovar em **Review deployments → production**.
3. Acompanhe o job até o fim. Ele compara o histórico remoto com o início da sequência local, simula o envio, verifica novamente o histórico e aplica apenas as versões pendentes. O log informa as versões aplicadas após confirmar o histórico final. Quando tudo já estiver aplicado, o job encerra na primeira leitura. Mantenha outros operadores e automações de migração fora da mesma janela.
4. Confirme o resultado em **Actions** e no histórico do banco. Faça uma verificação funcional da mudança em produção, preservando os dados existentes. Se o job falhar, consulte a etapa e as versões registradas e verifique o schema antes de disparar outra execução. Uma execução com várias migrações pode ter aplicado parte delas. Os logs do workflow omitem a saída bruta da CLI e do PostgreSQL para evitar exposição de credenciais ou dados. Investigue com acesso restrito e reproduza o problema no ambiente de teste.

Para produção, preserve o histórico e corrija problemas com migrações novas e revisadas. Os comandos `db reset` e `db push --include-all` ficam fora do procedimento de implantação e reconciliação.

[Proteção de environments no GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) · [Conexões PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-migration-repair)
