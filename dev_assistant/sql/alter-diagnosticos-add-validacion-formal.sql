BEGIN;

ALTER TABLE public.diagnosticos
  ADD COLUMN IF NOT EXISTS validado_por text NULL,
  ADD COLUMN IF NOT EXISTS resultado_validacion text NULL,
  ADD COLUMN IF NOT EXISTS observacion_validacion text NULL;

CREATE INDEX IF NOT EXISTS idx_diagnosticos_resultado_validacion
  ON public.diagnosticos (resultado_validacion);

COMMIT;
