# Grupos reais

Criação, listagem e detalhes de grupos privados usando a autenticação existente. A entrega inicial de criação e listagem foi aprovada em 17/11/2026.

## Uso e configuração

Acesse **Conta → Meus grupos** (`/conta/grupos/`) e entre com a autenticação existente. Há também um link na demonstração `/grupos/`, que continua com dados sintéticos. Escolha **Novo grupo** para informar um nome de 1 a 80 caracteres e, se desejar, uma descrição de até 2000 caracteres. O banco valida os limites e armazena a ausência de descrição como texto vazio. Grupos diferentes podem ter o mesmo nome. A lista mostra os grupos dos quais a identidade autenticada participa, em ordem de criação decrescente, com o papel do usuário e um link para os detalhes.

Em um Supabase de teste, aplique as migrações em ordem. Em um ambiente com perfis e grupos já registrados, aplique [`20261123000100_group_details.sql`](../supabase/migrations/20261123000100_group_details.sql) e depois a [migração de convites](INVITATIONS.md#implantação-manual). O procedimento de implantação passa pelo workflow manual e aprovado. [Migrações Supabase](SUPABASE_MIGRATIONS.md)

Mantenha a API configurada com o schema `public`, a RLS ativa e a escrita em grupos e membros restrita às RPCs de criação e aceite.

As duas variáveis públicas de [AUTH.md](AUTH.md) atendem à interface no Cloudflare Pages. O envio usa a configuração de runtime da [Edge Function de convites](INVITATIONS.md#implantação-manual). O build exporta uma página fixa em `/conta/grupos/detalhes/`. A aplicação usa o parâmetro `id` da URL para consultar o grupo após a autenticação. As consultas e as RPCs usam o JWT do SDK no Supabase, com autorização no PostgreSQL. Dados privados não são gerados no HTML nem persistidos em armazenamento próprio da aplicação. Sem configuração, a tela informa indisponibilidade e não consulta grupos.

## Modelo e garantias

- `groups`: `founder_id` imutável, `owner_id` obrigatório e único por ser um campo escalar; `is_private` começa e permanece `true` nesta versão. Não existe rota de leitura pública.
- `group_members`: associação única por grupo/usuário; `is_admin` permite múltiplos administradores futuros. Uma FK composta diferida exige que o Dono seja membro e administrador. Não é possível confirmar uma transação com grupo sem Dono ou Dono sem administração.
- `group_admin_permissions`: uma linha criada com o grupo; capacidades reservadas `manage_group`, `manage_cycles`, `manage_members`, inicialmente negadas aos administradores comuns. Apenas o Dono pode atualizar essas flags, mediante grants por coluna e RLS. Sem interface nesta entrega. Isso não permite promover membros ou transferir propriedade.
- `private.has_group_admin_permission`: ponto de autorização preparado para futuras ações. Dono recebe todas as capacidades conhecidas, independentemente das flags; outros administradores recebem apenas as habilitadas. Participante e Fundador sem cargo não recebem privilégios. Novas capacidades exigirão migração e validação próprias.
- `group_audit_events`: criação e mudanças de configuração registram ator do JWT, instante e ação; configuração registra antes/depois. Não há grants ou políticas de leitura/escrita para clientes nesta etapa, nem função de inserção genérica exposta. Administradores comuns e Dono não podem forjar, editar ou apagar eventos pela API. O responsável privilegiado pelo banco continua tendo autoridade técnica sobre o banco; auditoria não pretende impedir intervenção desse operador.

`public.create_group(group_name, group_description)` recebe uma descrição opcional, usa `auth.uid()` e não aceita UUID de criador, Dono, papel ou privacidade. Uma transação grava grupo, associação administrativa, configuração e auditoria; qualquer erro desfaz todas as gravações. `SECURITY DEFINER` é restrito a funções específicas, com `search_path` vazio e nomes qualificados; A aplicação usa o papel `authenticated` para executar a RPC.

RLS filtra grupos, membros e configuração pela participação. O helper em schema privado consulta membros com privilégios do definidor, evitando políticas recursivas. Não aceita identidade arbitrária. Nenhuma escrita direta em grupos/membros é concedida ao cliente. Founder não é um papel de autorização. Transferência e promoção não têm API/interface; fixtures SQL exercitam apenas a capacidade futura do modelo.

Os detalhes apresentam o Dono, o Fundador e os membros atuais. A RPC `public.list_group_members(target_group_id)` verifica a participação do solicitante no banco e retorna identificador, papel administrativo e nome de exibição de membros atuais. O nome é compartilhado somente com participantes do mesmo grupo. Na ausência de nome, a tela usa o identificador abreviado ou “Você”. A política de leitura da tabela `profiles` continua limitada ao próprio perfil.

As FKs de fundador, Dono, membros e auditoria usam `RESTRICT`, preservando identidade/histórico. Exclusão de contas vinculadas exige futura política de retenção/anonimização; não há exclusão automática em cascata desses dados. O [ingresso por convite](INVITATIONS.md) usa o modelo de membros existente. Saída, transferência, administração de membros, ciclos, cafés e avaliações continuam previstos para outras entregas.

## Como testar

1. Aplicar as migrações em projeto Supabase de teste e configurar as variáveis públicas existentes. Abrir `/conta/grupos/` sem login: a aplicação solicita entrada, sem consultar dados privados.
2. Entrar com Google ou a conta existente. Sem grupos, conferir o estado vazio. Criar um grupo apenas com o nome e verificar o redirecionamento, o Dono, o Fundador e a lista de membros. Voltar para **Meus grupos** e reabrir o grupo pelo cartão.
3. Recarregar a página e conferir persistência. Criar outro grupo com descrição e verificar ambos. Nome vazio, somente com espaços ou acima do limite deve ser rejeitado. Em falha de rede, campos são preservados e a lista pode ser atualizada. Se a resposta da criação se perder, consultar a lista antes de reenviar: não há chave de idempotência entre tentativas nesta versão.
4. Entrar com um segundo usuário e colar a URL de detalhes do primeiro. Conferir a mensagem de grupo indisponível e a ausência do grupo na listagem. Com os JWTs dos usuários de teste, conferir que a leitura direta de `groups`, `group_members`, `group_admin_permissions` e a RPC `list_group_members` retornam lista vazia para o grupo alheio. Anônimo não deve ter acesso. Tentativas de inserir grupos/membros diretamente, trocar Dono/Fundador, alterar flags de outro grupo ou escrever auditoria devem falhar/não afetar linhas.
5. O Dono pode alterar somente flags de seu grupo pela API; conferir auditoria pelo SQL Editor do responsável. O cliente não pode alterar/apagar eventos. Fixtures com administrador comum/participante são cobertas no teste SQL local, sem fornecer APIs de ingresso.
6. Conferir Google, perfil, logout e páginas da demonstração. Validar o preview existente do Pages e revisar antes do merge.

Verificações automatizadas (sem credenciais reais):

```sh
npm ci
npm run test:rls
NEXT_PUBLIC_SUPABASE_URL=https://auth.example.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test AUTH_TEST_CONFIGURED=1 npm run check
NEXT_PUBLIC_SUPABASE_URL=https://auth.example.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test AUTH_TEST_CONFIGURED=1 npm run check:static
```

`test:rls` agora executa todos os arquivos `supabase/tests/*.sql`, além de todas as migrações em ordem. PostgreSQL 17 descartável verifica RLS entre usuários, grants, Dono administrador, fundador permanente sem privilégio vitalício, permissões por grupo, auditoria e rollback com falha na última escrita. Playwright testa a interface e o SDK com HTTP sintético, incluindo criação sem descrição, redirecionamento, recarga, papéis, URL direta, erros, sessão inválida e acessibilidade em desktop e móvel. Os testes SQL verificam que a projeção dos membros respeita o vínculo ao grupo e que os perfis completos continuam privados. OAuth real e deploy não são comprovados por mocks.

## Resultados da implementação inicial — 17/11/2026

- `npm ci --cache /tmp/caffeine-npm-cache`: aprovado, sem novas dependências ou alteração do lockfile.
- `npm run test:rls`: aprovado no PostgreSQL 17 descartável com as migrações e os testes finais de perfis/grupos.
- `npm run check`: lint, tipos, build normal e 74 testes aprovados. Após adicionar o cenário de logout e formatar os arquivos, lint/tipos passaram novamente e a suíte final `npm test -- tests/groups.spec.ts --workers=2` passou com 12 testes.
- `npm run check:static`: build estático e **78 testes aprovados** no código final, incluindo logout, autenticação/perfil, demonstração e acessibilidade. Variáveis sintéticas conforme os comandos acima, Chromium do ambiente via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
- Build estático sem variáveis: aprovado. Suíte de grupos nesse modo: 2 aprovados e 10 contratos pulados explicitamente por falta de configuração.
- `git diff --check` e inspeção dos arquivos exportados pela ausência dos dados privados das fixtures: aprovados.

Os testes novos tiveram seletores ambíguos de status/alerta e do link de grupos ajustados antes das execuções finais aprovadas. Nenhum teste de segurança foi removido ou afrouxado. Supabase remoto, Google OAuth real e publicação no Pages não foram executados nesta validação local; seguir o roteiro manual acima. Nenhuma configuração de produção ou migração remota foi alterada.

## Correção da CI do PR #7 — 17/11/2026

A [execução 44155507472](https://github.com/diegomagnos/caffeine-hunters/actions/runs/44155507472) falhou em `test:rls` antes das migrações, na primeira chamada ao `psql`. O `pg_isready` sem host podia responder pelo socket Unix do servidor temporário do entrypoint oficial PostgreSQL. Esse servidor é parado após a inicialização, antes da partida definitiva; a sondagem tinha uma janela de falso positivo que permitia ao `psql` encontrar o socket já removido. Lint/tipos/build/testes e exportação foram pulados por dependerem do sucesso desse passo.

O runner agora usa o mesmo destino TCP `127.0.0.1`, usuário e banco explícitos em `pg_isready` e `psql`. O servidor temporário inicia com `listen_addresses=''` e não aceita TCP; a sondagem aguarda o servidor definitivo. `psql -X` evita configuração local implícita e `ON_ERROR_STOP=1` continua obrigatório. Falhas imprimem os logs do container antes da remoção e preservam o erro original. O container continua descartável, sem rede externa ou portas publicadas. Migrações, assertions SQL e RLS não foram modificadas, puladas ou repetidas para esconder falhas.

O workflow mantém os comandos `test:rls`, `check` e `check:static`, sem `continue-on-error`. Após dependências/navegador instalados, `check` e `check:static` executam mesmo se um passo anterior de verificação falhar; a falha original continua reprovando o job. Builds normal e estático permanecem sequenciais para preservar `.next/`.

Validação da inicialização: um experimento com `pg_sleep(3)` em script de inicialização confirmou socket pronto enquanto TCP ainda recusava conexões, seguido de TCP disponível na partida definitiva. O runner corrigido passou com essa inicialização lenta e em três novas inicializações consecutivas. Uma falha SQL induzida confirmou exit code 1, captura de logs e remoção do container; a execução normal posterior também passou. Os experimentos usam apenas fixtures descartáveis em `work/` e não alteram os testes versionados.

Verificações desta correção: `npm run test:rls`, `npm run check` (lint, tipos, build normal e **76 testes**) e `npm run check:static` (exportação e **78 testes**) aprovados localmente, com as variáveis sintéticas já documentadas e Chromium do ambiente (`/usr/bin/chromium`). `git diff --check` aprovado. O resultado remoto deve ser conferido na execução do GitHub Actions associada ao commit enviado ao PR #7.
