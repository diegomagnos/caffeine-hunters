-- Compare only the objects owned by the two baseline migrations. Stable names
-- and deparsed SQL allow comparison across databases without sharing OIDs.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '30s';

WITH app_tables AS (
    SELECT *
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('profiles', 'groups', 'group_members', 'group_admin_permissions', 'group_audit_events')
), app_functions AS (
    SELECT p.*, n.nspname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'public' AND p.proname IN ('create_user_profile', 'create_group'))
       OR (n.nspname = 'private' AND p.proname IN (
           'is_group_member', 'has_group_admin_permission', 'preserve_group_founder', 'audit_group_permissions'))
), permissions AS (
    SELECT 'table' AS object_type, relname::text AS object_name, relowner AS owner,
           coalesce(relacl, acldefault('r', relowner)) AS acl
    FROM app_tables
    UNION ALL
    SELECT 'column', relname || '.' || attname, relowner, attacl
    FROM app_tables JOIN pg_attribute ON attrelid = oid
    WHERE attnum > 0 AND NOT attisdropped AND attacl IS NOT NULL
    UNION ALL
    SELECT 'function', oid::regprocedure::text, proowner, coalesce(proacl, acldefault('f', proowner))
    FROM app_functions
    UNION ALL
    SELECT 'schema', nspname, nspowner, coalesce(nspacl, acldefault('n', nspowner))
    FROM pg_namespace WHERE nspname = 'private'
)
SELECT jsonb_build_object(
    'tabelas e RLS', (
        SELECT jsonb_agg(jsonb_build_array(relname, relkind, relrowsecurity, relforcerowsecurity,
            pg_get_userbyid(relowner), relpersistence, relispartition) ORDER BY relname)
        FROM app_tables
    ),
    'colunas e defaults', (
        SELECT jsonb_agg(jsonb_build_array(relname, attname, format_type(atttypid, atttypmod),
            attnotnull, pg_get_expr(adbin, adrelid), attidentity, attgenerated,
            nullif(attcollation, 0)::regcollation::text) ORDER BY relname, attnum)
        FROM app_tables
        JOIN pg_attribute ON attrelid = oid
        LEFT JOIN pg_attrdef ON adrelid = attrelid AND adnum = attnum
        WHERE attnum > 0 AND NOT attisdropped
    ),
    'constraints', (
        SELECT jsonb_agg(jsonb_build_array(relname, conname, pg_get_constraintdef(c.oid), convalidated)
            ORDER BY relname, conname)
        FROM app_tables t JOIN pg_constraint c ON conrelid = t.oid
    ),
    'índices', (
        SELECT jsonb_agg(jsonb_build_array(relname, pg_get_indexdef(indexrelid), indisvalid, indisready)
            ORDER BY relname, indexrelid::regclass::text COLLATE "C")
        FROM app_tables JOIN pg_index ON indrelid = oid
    ),
    'políticas', (
        SELECT jsonb_agg(jsonb_build_array(tablename, policyname, permissive, roles::text, cmd, qual, with_check)
            ORDER BY tablename, policyname)
        FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT relname FROM app_tables)
    ),
    'funções e proprietários', (
        SELECT jsonb_agg(jsonb_build_array(pg_get_functiondef(oid), pg_get_userbyid(proowner))
            ORDER BY nspname, proname, oid::regprocedure::text COLLATE "C")
        FROM app_functions
    ),
    'triggers', (
        SELECT jsonb_agg(jsonb_build_array(pg_get_triggerdef(oid), tgenabled)
            ORDER BY tgrelid::regclass::text COLLATE "C", tgname)
        FROM pg_trigger WHERE NOT tgisinternal AND (
            tgrelid IN (SELECT oid FROM app_tables) OR (
                tgrelid = 'auth.users'::regclass
                AND (tgname = 'on_auth_user_created' OR tgfoid IN (SELECT oid FROM app_functions))
            )
        )
    ),
    'permissões', (
        SELECT jsonb_agg(jsonb_build_array(object_type, object_name, pg_get_userbyid(owner),
            pg_get_userbyid(grantor), CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(grantee) END,
            privilege_type, is_grantable)
            ORDER BY object_type COLLATE "C", object_name COLLATE "C", grantor::regrole::text COLLATE "C",
                grantee::regrole::text COLLATE "C", privilege_type COLLATE "C", is_grantable)
        FROM permissions CROSS JOIN LATERAL aclexplode(acl)
    ),
    'backfill de perfis', NOT EXISTS (
        SELECT FROM auth.users u WHERE NOT EXISTS (SELECT FROM public.profiles p WHERE p.id = u.id)
    )
);
COMMIT;
