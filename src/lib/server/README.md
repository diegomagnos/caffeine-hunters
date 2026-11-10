# Integrações no servidor

Fronteira reservada para operações futuras que exijam runtime Next.js. Na hospedagem estática não existe servidor Next.js por requisição. Auth/perfis usam `src/modules/auth` e autorização PostgreSQL/RLS no Supabase, conforme [AUTH.md](../../../docs/AUTH.md). Não adicionar credenciais administrativas ao cliente ou ao build estático.

Operações futuras de grupos exigem políticas e validação próprias antes da implementação; não presumir que a guarda de interface concede autorização.
