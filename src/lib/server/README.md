# Integrações no servidor

Fronteira reservada para adaptadores de persistência PostgreSQL/Supabase, ainda sem implementação, dependências ou conexão. A página inicial não importa este diretório nem lê variáveis de banco.

Na futura entrega de persistência, escolher ORM/SQL, migrações e estratégia de conexão em registro técnico revisável. Módulos de conexão deverão importar `server-only`, manter credenciais fora do cliente e validar autorização por operação. Se Supabase for escolhido, definir políticas de isolamento/RLS e tratamento de sessão antes de expor dados.

Não assumir schema, autenticação, projeto Supabase ou plano contratado. `DATABASE_URL` e `SUPABASE_URL` em `.env.example` são reservas vazias, não requisitos de execução. Criar e testar migrações apenas na etapa autorizada, com dados sintéticos e sem exigir serviços externos para testes básicos.
