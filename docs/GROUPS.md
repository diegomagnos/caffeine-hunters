# Grupos reais — criação e listagem

Escopo aprovado em 17/11/2026: criação e listagem de grupos privados usando a autenticação existente. Branch `feat/real-groups`, partindo de `main` em `d0e58e2`. Revisão e merge exclusivamente humanos.

## Uso e configuração

Acesse **Conta → Meus grupos** (`/conta/grupos/`) e entre com a autenticação existente. Há também um link na demonstração `/grupos/`, que continua com dados sintéticos. O formulário exige nome (1–80 caracteres) e descrição (1–2000), sem somente espaços. O banco repete a validação e remove espaços nas extremidades. Nomes não são únicos: grupos diferentes podem ter o mesmo nome. A lista consulta os grupos dos quais a identidade autenticada participa, em ordem de criação decrescente.

Aplicar **`supabase/migrations/202611170001_groups.sql`** pelo SQL Editor ou pelo processo versionado do responsável, após `202611100001_profiles.sql` (não reaplicar a migração de perfis se já instalada). Testar primeiro em ambiente de teste. A migração contém `BEGIN/COMMIT`; executar integralmente como responsável do banco. Não foi aplicada a projeto remoto nesta entrega. Manter o schema `private` fora dos schemas expostos pela API; expor somente o `public` habitual. Não desabilitar RLS nem conceder escrita direta nas tabelas de grupos.

Não há variáveis novas, segredos ou alteração de Google, perfil ou configuração do Cloudflare. As duas variáveis públicas existentes de [AUTH.md](AUTH.md) continuam suficientes. O build estático publica apenas a casca; consultas autenticadas e a RPC usam o JWT do SDK no Supabase, com autorização no PostgreSQL. Dados privados não são gerados no HTML nem persistidos em armazenamento próprio da aplicação. Sem configuração, a tela informa indisponibilidade e não consulta grupos.

## Modelo e garantias

- `groups`: `founder_id` imutável, `owner_id` obrigatório e único por ser um campo escalar; `is_private` começa e permanece `true` nesta versão. Não existe rota de leitura pública.
- `group_members`: associação única por grupo/usuário; `is_admin` permite múltiplos administradores futuros. Uma FK composta diferida exige que o Dono seja membro e administrador. Não é possível confirmar uma transação com grupo sem Dono ou Dono sem administração.
- `group_admin_permissions`: uma linha criada com o grupo; capacidades reservadas `manage_group`, `manage_cycles`, `manage_members`, inicialmente negadas aos administradores comuns. Apenas o Dono pode atualizar essas flags, mediante grants por coluna e RLS. Sem interface nesta entrega. Isso não permite promover membros ou transferir propriedade.
- `private.has_group_admin_permission`: ponto de autorização preparado para futuras ações. Dono recebe todas as capacidades conhecidas, independentemente das flags; outros administradores recebem apenas as habilitadas. Participante e Fundador sem cargo não recebem privilégios. Novas capacidades exigirão migração e validação próprias.
- `group_audit_events`: criação e mudanças de configuração registram ator do JWT, instante e ação; configuração registra antes/depois. Não há grants ou políticas de leitura/escrita para clientes nesta etapa, nem função de inserção genérica exposta. Administradores comuns e Dono não podem forjar, editar ou apagar eventos pela API. O responsável privilegiado pelo banco continua tendo autoridade técnica sobre o banco; auditoria não pretende impedir intervenção desse operador.

`public.create_group(group_name, group_description)` usa `auth.uid()` e não aceita UUID de criador, Dono, papel ou privacidade. Uma transação grava grupo, associação administrativa, configuração e auditoria; qualquer erro desfaz todas as gravações. `SECURITY DEFINER` é restrito a funções específicas, com `search_path` vazio e nomes qualificados; só `authenticated` executa a RPC. Não há service role no cliente.

RLS filtra grupos, membros e configuração pela participação. O helper em schema privado consulta membros com privilégios do definidor, evitando políticas recursivas. Não aceita identidade arbitrária. Nenhuma escrita direta em grupos/membros é concedida ao cliente. Founder não é um papel de autorização. Transferência e promoção não têm API/interface; fixtures SQL exercitam apenas a capacidade futura do modelo.

As FKs de fundador, Dono, membros e auditoria usam `RESTRICT`, preservando identidade/histórico. Exclusão de contas vinculadas exige futura política de retenção/anonimização; não há exclusão automática em cascata desses dados. Convites, ingresso, saída, transferência, administração de membros, ciclos, cafés e avaliações continuam fora do escopo.

## Como testar

1. Aplicar as migrações em projeto Supabase de teste e configurar as variáveis públicas existentes. Abrir `/conta/grupos/` sem login: a aplicação solicita entrada, sem consultar dados privados.
2. Entrar com Google ou a conta existente. Sem grupos, conferir o estado vazio. Criar um grupo com nome e descrição; conferir carregamento, confirmação e cartões com Privado, Fundador e Dono/Administrador.
3. Recarregar a página e conferir persistência. Criar outro grupo e verificar ambos. Campos vazios/somente espaços e limites devem ser rejeitados. Em falha de rede, campos são preservados e a lista pode ser atualizada. Se a resposta da criação se perder, consultar a lista antes de reenviar: não há chave de idempotência entre tentativas nesta versão.
4. Entrar com um segundo usuário: não deve ver os grupos do primeiro. Por REST com os JWTs reais dos dois usuários, tentar ler `groups`, `group_members` e `group_admin_permissions` do outro grupo; deve retornar lista vazia. Anônimo não deve ter acesso. Tentativas de inserir grupos/membros diretamente, trocar Dono/Fundador, alterar flags de outro grupo ou escrever auditoria devem falhar/não afetar linhas.
5. O Dono pode alterar somente flags de seu grupo pela API; conferir auditoria pelo SQL Editor do responsável. O cliente não pode alterar/apagar eventos. Fixtures com administrador comum/participante são cobertas no teste SQL local, sem fornecer APIs de ingresso.
6. Conferir Google, perfil, logout e páginas da demonstração. Validar o preview existente do Pages e revisar antes do merge.

Verificações automatizadas (sem credenciais reais):

```sh
npm ci
npm run test:rls
NEXT_PUBLIC_SUPABASE_URL=https://auth.example.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test AUTH_TEST_CONFIGURED=1 npm run check
NEXT_PUBLIC_SUPABASE_URL=https://auth.example.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test AUTH_TEST_CONFIGURED=1 npm run check:static
```

`test:rls` agora executa todos os arquivos `supabase/tests/*.sql`, além de todas as migrações em ordem. PostgreSQL 17 descartável verifica RLS entre usuários, grants, Dono administrador, fundador permanente sem privilégio vitalício, permissões por grupo, auditoria e rollback com falha na última escrita. O contrato de Auth é simulado; não valida JWT/PostgREST remoto. Playwright testa a interface/SDK com HTTP sintético, incluindo sucesso, recarga, estados vazios, erros, validação, sessão inválida e acessibilidade em desktop/móvel. OAuth real e deploy não são comprovados por mocks.

## Resultados locais — 17/11/2026

- `npm ci --cache /tmp/caffeine-npm-cache`: aprovado, sem novas dependências ou alteração do lockfile.
- `npm run test:rls`: aprovado no PostgreSQL 17 descartável com as migrações e os testes finais de perfis/grupos.
- `npm run check`: lint, tipos, build normal e 74 testes aprovados. Após adicionar o cenário de logout e formatar os arquivos, lint/tipos passaram novamente e a suíte final `npm test -- tests/groups.spec.ts --workers=2` passou com 12 testes.
- `npm run check:static`: build estático e **78 testes aprovados** no código final, incluindo logout, autenticação/perfil, demonstração e acessibilidade. Variáveis sintéticas conforme os comandos acima, Chromium do ambiente via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
- Build estático sem variáveis: aprovado. Suíte de grupos nesse modo: 2 aprovados e 10 contratos pulados explicitamente por falta de configuração.
- `git diff --check` e inspeção dos arquivos exportados pela ausência dos dados privados das fixtures: aprovados.

Os testes novos tiveram seletores ambíguos de status/alerta e do link de grupos ajustados antes das execuções finais aprovadas. Nenhum teste de segurança foi removido ou afrouxado. Supabase remoto, Google OAuth real e publicação no Pages não foram executados nesta validação local; seguir o roteiro manual acima. Nenhuma configuração de produção ou migração remota foi alterada.
