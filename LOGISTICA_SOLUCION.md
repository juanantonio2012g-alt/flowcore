# Solución: Persistencia de datos en Módulo Logística/Entrega

## 🔴 Problema Identificado

La **tabla `logisticas_entrega` no existe en Supabase**, lo que impide guardar los datos del formulario de logística.

## ✅ Raíz del Problema

1. **La migración SQL existe** pero no ha sido aplicada a la base de datos
2. **El código frontend y backend está correcto** - formulario, endpoint y lógica funcionan
3. **Falta tabla en BD** - Supabase no tiene la tabla `logisticas_entrega`

## 🛠️ Soluciones (De más simple a más compleja)

### **SOLUCIÓN 1: Usar Supabase SQL Editor (RECOMENDADO)**

1. Abre: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql
2. Haz clic en **"New query"**
3. Copia y pega el siguiente SQL:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id text NOT NULL,
  fecha_programada date NULL,
  responsable text NULL,
  estado_logistico text NOT NULL DEFAULT 'pendiente',
  observacion_logistica text NULL,
  confirmacion_entrega boolean NOT NULL DEFAULT false,
  fecha_entrega timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
  ON public.logisticas_entrega (caso_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
  ON public.logisticas_entrega (estado_logistico, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_id
  ON public.logisticas_entrega (caso_id);

ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.logisticas_entrega TO anon, authenticated;

COMMIT;
```

4. Haz clic en **"Run"** (esquina superior derecha)
5. Espera hasta ver el mensaje de confirmación ✅

### **SOLUCIÓN 2: Usar Supabase CLI (Si está instalado)**

```bash
# 1. Instala CLI si no lo tienes
brew install supabase/tap/supabase

# 2. Verifica que esté instalado
supabase --version

# 3. Autentica con tu token
export SUPABASE_ACCESS_TOKEN="tu_token_de_supabase"
# Obtén el token en: https://app.supabase.com/account/tokens

# 4. Vincula el proyecto
supabase link --project-ref mddudcfqqfmpjsmplvww

# 5. Aplica las migraciones
supabase db push
```

### **SOLUCIÓN 3: Manual vía Endpoint Debug (Si estás en desarrollo)**

En terminal local:

```bash
curl "http://localhost:3000/api/debug/create-logistics-table?token=dev-only-token"
```

Esto ejecutará la migración directamente (solo funciona en desarrollo).

### **SOLUCIÓN 4: PostgreSQL directo (Avanzado)**

```bash
# Reemplaza PASSWORD con tu contraseña
PGPASSWORD="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHVkY2ZxcWZtcGpzbXBsdnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTEwNCwiZXhwIjoyMDkwMzk3MTA0fQ.3tsmbx7oCImPts4H42zX5UQIvTqr4KBO5wrSVr-NatI" psql \
  -h db.mddudcfqqfmpjsmplvww.supabase.co \
  -U postgres \
  -d postgres \
  -f dev_assistant/sql/create-logisticas-entrega-table.sql
```

## ✔️ Verificación Post-Creación

Después de crear la tabla, verifica que funciona:

### **1. Verificar en Supabase Console:**

Ve a: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/tables

Deberías ver:
- ✅ Tabla `logisticas_entrega` en la lista
- ✅ Columnas: `id`, `caso_id`, `fecha_programada`, `responsable`, `estado_logistico`, `observacion_logistica`, `confirmacion_entrega`, `fecha_entrega`, `created_at`, `updated_at`

### **2. Verificar en la aplicación:**

1. Ve a un caso existente: `http://localhost:3000/casos/ID_DEL_CASO`
2. Abre el módulo de **Nueva logística / entrega**
3. Completa el formulario con datos de prueba
4. Haz clic en **"Guardar"**
5. El sistema debería confirmar: **"Logística guardada correctamente"**

### **3. Verificar datos guardados:**

En Supabase Console:
- Tabla `logisticas_entrega` → verifica que tenga registros
- Debería haber una fila con el `caso_id` que acabas de guardar

## 📊 Esquema Esperado

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `caso_id` | Text | Referencia al caso |
| `fecha_programada` | Date | Fecha de programación |
| `responsable` | Text | Persona responsable |
| `estado_logistico` | Text | Estado (pendiente, programado, en_ejecucion, entregado, incidencia) |
| `observacion_logistica` | Text | Notas y observaciones |
| `confirmacion_entrega` | Boolean | ¿Entrega confirmada? |
| `fecha_entrega` | Timestamptz | Cuándo se entregó |
| `created_at` | Timestamptz | Fecha de creación |
| `updated_at` | Timestamptz | Última actualización |

## 🔄 Flujo de Persistencia (Ahora funcionará)

```
Usuario completa formulario
         ↓
POST /api/casos/logistica
         ↓
executeLogistica() valida y procesa
         ↓
INSERT INTO logisticas_entrega ✅ FUNCIONA
         ↓
UPDATE casos (sincroniza próxima_acción, etc)
         ↓
INSERT INTO bitacora_cambios_caso (auditoría)
         ↓
Respuesta: { ok: true, logistica_id: "..." }
         ↓
Redirecciona a caso con confirmación
```

## 🚨 Si Aún Hay Problemas

Si después de crear la tabla sigue habiendo errores:

1. **Revisa los errores en consola del navegador** (F12 → Console)
2. **Verifica permisos en Supabase:**
   - Ve a: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/auth/policies
   - Comprueba que los permisos de la tabla permita SELECT, INSERT, UPDATE
   
3. **Reinicia el servidor Next.js:**
   ```bash
   npm run dev
   ```

4. **Limpia caché del navegador:** 
   - Ctrl+Shift+Del (Windows) o Cmd+Shift+Del (Mac)

## 📝 Archivos Relacionados

- [Migración SQL](dev_assistant/sql/create-logisticas-entrega-table.sql)
- [Endpoint API](src/app/api/casos/logistica/route.ts)
- [Lógica de negocio](src/core/application/casos/expediente/logistica/executeLogistica.ts)
- [Página de formulario](src/app/casos/[id]/logistica/page.tsx)
- [Script de verificación](verify_and_create_logistics_table.mjs)

## ✨ Resultado Esperado

✅ La tabla se crea correctamente
✅ El formulario de logística permite guardar datos
✅ Los datos persisten en la base de datos
✅ Se puede ver el historial de logística en el detalle del caso
✅ El flujo de cotización → logística → ejecución funciona sin interrupciones
