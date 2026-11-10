# Módulos

`auth/` contém a integração autorizada com o SDK Supabase e a guarda visual da área de conta; a autorização efetiva fica no PostgreSQL/RLS. Consulte [AUTH.md](../../docs/AUTH.md).

Criar módulos adicionais somente quando o respectivo escopo for autorizado. Cada módulo poderá separar domínio puro, casos de uso e adaptadores, com testes junto das regras implementadas. Rotas em `src/app` devem compor a interface e delegar operações aos módulos.

Não antecipar entidades, papéis ou contratos funcionais pendentes. As 21 decisões de `docs/BUSINESS_RULES.md` permanecem a referência.
