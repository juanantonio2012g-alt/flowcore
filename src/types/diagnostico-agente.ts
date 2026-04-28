export type CategoriaDiagnosticaAgente =
  | 'patologia_superficie'
  | 'humedad_filtracion'
  | 'grietas_fisuras'
  | 'desprendimiento_delaminacion'
  | 'falla_acabado'
  | 'falla_aplicacion'
  | 'compatibilidad_materiales'
  | 'preparacion_superficie'
  | 'mantenimiento_reparacion'
  | 'otro'

export type NivelCertezaAgente =
  | 'muy_bajo'
  | 'bajo'
  | 'medio'
  | 'alto'
  | 'muy_alto'
  | 'confirmado'

export type DiagnosticoAgenteInput = {
  caso_id: string
  resumen_del_caso: string
  sintomas_clave?: string[]
  categoria_probable: CategoriaDiagnosticaAgente
  causa_probable?: string | null
  causas_alternativas?: string[]
  nivel_certeza?: NivelCertezaAgente | null
  solucion_recomendada?: string | null
  producto_recomendado?: string | null
  proceso_sugerido?: string | null
  observaciones_tecnicas?: string | null
  riesgos_o_advertencias?: string[]
  requiere_validacion?: boolean
  requiere_escalamiento?: boolean
  estado_caso?: string | null
  caso_listo_para_cotizacion?: boolean
  estado_comercial?: string | null
  proximo_paso?: string | null
  suficiencia_de_evidencia?: string | null
  riesgo_de_error?: string | null
  coincidencia_con_patron?: string | null
  necesidad_de_revision_humana?: string | null
  fuente_agente?: string | null
  version_prompt?: string | null
  version_modelo?: string | null
}