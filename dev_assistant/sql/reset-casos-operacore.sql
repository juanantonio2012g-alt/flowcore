-- OpenCore: reset limpio de casos de prueba
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-03-31

-- =========================================================
-- 1) Diagnostico de dependencias FK hacia public.casos
-- =========================================================
SELECT
  n_child.nspname AS child_schema,
  child.relname AS child_table,
  a_child.attname AS child_column,
  n_parent.nspname AS parent_schema,
  parent.relname AS parent_table,
  a_parent.attname AS parent_column,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete_rule,
  c.conname AS fk_name
FROM pg_constraint c
JOIN pg_class child ON child.oid = c.conrelid
JOIN pg_namespace n_child ON n_child.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = c.confrelid
JOIN pg_namespace n_parent ON n_parent.oid = parent.relnamespace
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON TRUE
JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
JOIN pg_attribute a_child ON a_child.attrelid = child.oid AND a_child.attnum = ck.attnum
JOIN pg_attribute a_parent ON a_parent.attrelid = parent.oid AND a_parent.attnum = fk.attnum
WHERE c.contype = 'f'
  AND n_parent.nspname = 'public'
  AND parent.relname = 'casos'
ORDER BY child_schema, child_table, fk_name;

-- =========================================================
-- 2) Reset transaccional de casos y dependencias
-- =========================================================
BEGIN;

-- Tabla temporal con todos los casos a borrar
CREATE TEMP TABLE tmp_casos_ids ON COMMIT DROP AS
SELECT id::text AS id
FROM public.casos;

-- Conteo previo de casos
SELECT COUNT(*) AS casos_a_eliminar FROM tmp_casos_ids;

-- 2.1 Inventario de archivos en Storage (bucket evidencias)
-- Nota: Supabase bloquea DELETE directo en storage.objects desde SQL.
-- La limpieza de objetos debe hacerse via Storage API o Dashboard.
CREATE TEMP TABLE tmp_storage_delete_list ON COMMIT DROP AS
SELECT o.bucket_id, o.name
FROM storage.objects o
JOIN tmp_casos_ids c ON o.bucket_id = 'evidencias' AND o.name LIKE c.id || '/%';

SELECT
  COUNT(*) AS objetos_storage_pendientes,
  MIN(name) AS ejemplo_1,
  MAX(name) AS ejemplo_2
FROM tmp_storage_delete_list;

-- 2.2 Hijos directos / historial (por caso_id)
DELETE FROM public.bitacora_cambios_caso b
USING tmp_casos_ids c
WHERE b.caso_id::text = c.id;

DELETE FROM public.diagnosticos_agente da
USING tmp_casos_ids c
WHERE da.caso_id::text = c.id;

DELETE FROM public.seguimientos s
USING tmp_casos_ids c
WHERE s.caso_id::text = c.id;

DELETE FROM public.cotizaciones ct
USING tmp_casos_ids c
WHERE ct.caso_id::text = c.id;

DELETE FROM public.diagnosticos d
USING tmp_casos_ids c
WHERE d.caso_id::text = c.id;

-- 2.3 Evidencias ligadas por caso_id y/o informe_id
DELETE FROM public.evidencias_informe e
USING tmp_casos_ids c
WHERE e.caso_id::text = c.id;

DELETE FROM public.evidencias_informe e
USING public.informes_tecnicos i, tmp_casos_ids c
WHERE e.informe_id = i.id
  AND i.caso_id::text = c.id;

-- 2.4 Cualquier otra tabla en public con columna caso_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'caso_id'
      AND table_name NOT IN (
        'casos',
        'informes_tecnicos',
        'evidencias_informe',
        'diagnosticos',
        'cotizaciones',
        'seguimientos',
        'diagnosticos_agente',
        'bitacora_cambios_caso'
      )
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I t USING tmp_casos_ids c WHERE t.caso_id::text = c.id',
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;

-- 2.5 Informe tecnico (padre de evidencias)
DELETE FROM public.informes_tecnicos i
USING tmp_casos_ids c
WHERE i.caso_id::text = c.id;

-- 2.6 Finalmente, casos
DELETE FROM public.casos ca
USING tmp_casos_ids c
WHERE ca.id::text = c.id;

-- =========================================================
-- 3) Validacion posterior
-- =========================================================
SELECT 'casos' AS tabla, COUNT(*) AS total FROM public.casos
UNION ALL
SELECT 'informes_tecnicos', COUNT(*) FROM public.informes_tecnicos
UNION ALL
SELECT 'evidencias_informe', COUNT(*) FROM public.evidencias_informe
UNION ALL
SELECT 'diagnosticos', COUNT(*) FROM public.diagnosticos
UNION ALL
SELECT 'cotizaciones', COUNT(*) FROM public.cotizaciones
UNION ALL
SELECT 'seguimientos', COUNT(*) FROM public.seguimientos
UNION ALL
SELECT 'diagnosticos_agente', COUNT(*) FROM public.diagnosticos_agente
UNION ALL
SELECT 'bitacora_cambios_caso', COUNT(*) FROM public.bitacora_cambios_caso
ORDER BY tabla;

COMMIT;

-- Si quieres correr en modo "simulacion", cambia COMMIT por ROLLBACK.
