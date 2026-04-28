# Guía: Aplicar migración de logisticas_entrega

## Problema
La tabla `logisticas_entrega` no existe en la base de datos, lo que impide persistir datos de logística.

## Solución

### Opción 1: Usar Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (si no está instalado)
brew install supabase/tap/supabase

# 2. Autenticarse con tu token de acceso
# Obtén tu token en: https://app.supabase.com/account/tokens
export SUPABASE_ACCESS_TOKEN="your_access_token_here"

# 3. Vincular el proyecto
supabase link --project-ref mddudcfqqfmpjsmplvww

# 4. Ejecutar la migración
supabase db push
```

### Opción 2: Usar el SQL Editor de Supabase (Web)

1. Ve a https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql
2. Crea una nueva consulta SQL
3. Copia el contenido de:
   ```
   dev_assistant/sql/create-logisticas-entrega-table.sql
   ```
4. Ejecuta la consulta

O simplemente ejecuta el bloque SQL preparado directamente:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
  id uuid PRIMARY KEY,
  caso_id text NOT NULL,
  fecha_programada date NULL,
  responsable text NULL,
  estado_logistico text NOT NULL DEFAULT 'pendiente',
  observacion_logistica text NULL,
  confirmacion_entrega boolean NOT NULL DEFAULT false,
  fecha_entrega timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
  ON public.logisticas_entrega (caso_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
  ON public.logisticas_entrega (estado_logistico, created_at DESC);

ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;

COMMIT;
```

### Opción 3: Usar psql directamente

```bash
# Obtén las credenciales en: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/settings/database
PGPASSWORD="your_postgres_password" psql \\
  -h db.mddudcfqqfmpjsmplvww.supabase.co \\
  -U postgres \\
  -d postgres \\
  -f dev_assistant/sql/create-logisticas-entrega-table.sql
```

## Verificar que la tabla se creó

Después de aplicar la migración, verifica:

```bash
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mddudcfqqfmpjsmplvww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHVkY2ZxcWZtcGpzbXBsdnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTEwNCwiZXhwIjoyMDkwMzk3MTA0fQ.3tsmbx7oCImPts4H42zX5UQIvTqr4KBO5wrSVr-NatI'
);
supabase.from('logisticas_entrega').select('*').limit(1).then(r => console.log(r));
"
```

## Archivo de migración

La migración está preparada en:
- `supabase/migrations/20260406221246_create_logisticas_entrega_table.sql`

Con `supabase link` y `supabase db push`, se aplica automáticamente.
