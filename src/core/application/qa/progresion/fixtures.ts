import type { ProgresionScenarioFixture } from "./contracts";

export const VALIDACION_PROGRESION_FIXTURES: ProgresionScenarioFixture[] = [
  {
    id: "diagnostico-cotizacion-a",
    titulo: "Diagnostico a cotizacion - hotel costa azul",
    alta: {
      cliente: "Hotel Costa Azul",
      proyecto: "Fachada torre sur",
      canal: "WhatsApp",
      prioridad: "alta",
      descripcion:
        "Reportan humedad persistente y filtraciones en muro exterior del nivel 4. Ya hubo una reparacion previa, pero volvieron a aparecer manchas y desprendimiento de acabado.",
    },
    expected_after_alta: {
      workflow_etapa_actual: "solicitud",
      workflow_continuidad_estado: "pendiente",
      recomendacion_operativa_accion: "Realizar diagnóstico",
      proxima_accion: "Realizar diagnóstico",
      macroarea_actual: "tecnico",
      alineacion_operativa_estado: "alineada",
      priorizacion_agente_alineacion: "alineada",
    },
    steps: [
      {
        id: "diagnostico-registrado",
        label: "Registrar diagnostico tecnico",
        command: {
          kind: "diagnostico",
          accion: "registrar_diagnostico",
          actor: "qa-progresion",
          payload: {
            problematica_identificada:
              "Humedad persistente y filtraciones en fachada sur.",
            causa_probable: "Posible falla de sellado y absorcion de humedad.",
            nivel_certeza: "alto",
            categoria_caso: "humedad_filtracion",
            solucion_recomendada:
              "Preparar propuesta correctiva para control de humedad y reparacion del acabado.",
            producto_recomendado: "Sistema impermeable elastomerico",
            proceso_sugerido: "Correccion de sellado y reparacion puntual",
            observaciones_tecnicas:
              "La patologia ya fue identificada y requiere propuesta correctiva.",
            requiere_validacion: false,
          },
        },
        expected: {
          workflow_etapa_actual: "diagnostico",
          workflow_continuidad_estado: "pendiente",
          recomendacion_operativa_accion: "Preparar cotización",
          proxima_accion: "Preparar cotización",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "parcial",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "cotizacion-registrada",
        label: "Registrar cotizacion formal",
        command: {
          kind: "cotizacion",
          accion: "registrar_cotizacion",
          actor: "qa-progresion",
          payload: {
            fecha_cotizacion: "2026-04-15",
            solucion_asociada:
              "Reparacion correctiva para control de humedad y recuperacion de acabado.",
            productos_incluidos:
              "Sistema impermeable elastomerico, sellador y acabado compatible",
            cantidades: "Sistema completo para 120 m2",
            condiciones: "Programacion sujeta a aprobacion del cliente",
            observaciones:
              "Cotizacion emitida para abrir seguimiento comercial.",
            monto: 18500,
            estado: "enviada",
            proxima_accion: "Dar seguimiento comercial",
            proxima_fecha: "2026-04-17",
          },
        },
        expected: {
          workflow_etapa_actual: "cotizacion",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Dar seguimiento comercial",
          proxima_accion: "Dar seguimiento comercial",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
    ],
  },
  {
    id: "cotizacion-logistica-c",
    titulo: "Cotizacion a logistica - constructora del bajio",
    alta: {
      cliente: "Constructora del Bajio",
      proyecto: "Nave industrial Celaya",
      canal: "WhatsApp",
      prioridad: "media",
      descripcion:
        "El cliente necesita diagnostico y posible propuesta correctiva para una zona con falla de acabado y humedad intermitente.",
    },
    expected_after_alta: {
      workflow_etapa_actual: "solicitud",
      workflow_continuidad_estado: "pendiente",
      recomendacion_operativa_accion: "Realizar diagnóstico",
      proxima_accion: "Realizar diagnóstico",
      macroarea_actual: "tecnico",
      alineacion_operativa_estado: "alineada",
      priorizacion_agente_alineacion: "alineada",
    },
    steps: [
      {
        id: "diagnostico-registrado",
        label: "Registrar diagnostico base",
        command: {
          kind: "diagnostico",
          accion: "registrar_diagnostico",
          actor: "qa-progresion",
          payload: {
            problematica_identificada:
              "Falla de acabado y humedad intermitente en zona intervenida.",
            causa_probable:
              "Posible ingreso de humedad y deterioro del acabado existente.",
            nivel_certeza: "medio",
            categoria_caso: "falla_acabado",
            solucion_recomendada:
              "Emitir propuesta correctiva y programar reparacion.",
            producto_recomendado: "Acabado elastomerico compatible",
            proceso_sugerido: "Reparacion localizada y reaplicacion",
            observaciones_tecnicas:
              "El caso ya cuenta con base suficiente para cotizacion.",
            requiere_validacion: false,
          },
        },
        expected: {
          workflow_etapa_actual: "diagnostico",
          workflow_continuidad_estado: "pendiente",
          recomendacion_operativa_accion: "Preparar cotización",
          proxima_accion: "Preparar cotización",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "parcial",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "cotizacion-registrada",
        label: "Registrar cotizacion emitida",
        command: {
          kind: "cotizacion",
          accion: "registrar_cotizacion",
          actor: "qa-progresion",
          payload: {
            fecha_cotizacion: "2026-04-15",
            solucion_asociada:
              "Reparacion correctiva localizada con reaplicacion de acabado.",
            productos_incluidos:
              "Sellador, acabado elastomerico y materiales de reparacion",
            cantidades: "80 m2 de intervencion",
            condiciones: "Sujeto a aprobacion y programacion de obra",
            observaciones:
              "Cotizacion lista para gestion comercial y seguimiento.",
            monto: 12400,
            estado: "enviada",
            proxima_accion: "Dar seguimiento comercial",
            proxima_fecha: "2026-04-17",
          },
        },
        expected: {
          workflow_etapa_actual: "cotizacion",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Dar seguimiento comercial",
          proxima_accion: "Dar seguimiento comercial",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "seguimiento-aprobado",
        label: "Registrar seguimiento con aprobacion",
        command: {
          kind: "seguimiento",
          accion: "registrar_seguimiento",
          actor: "qa-progresion",
          payload: {
            tipo_seguimiento: "llamada",
            resultado: "El cliente aprueba la propuesta y solicita programacion.",
            proximo_paso: "Confirmar programación",
            proxima_fecha: "2026-04-18",
            estado_comercial: "aprobado",
            observaciones_cliente:
              "Solicita coordinar ejecucion en la proxima ventana operativa.",
          },
        },
        expected: {
          workflow_etapa_actual: "logistica_entrega",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Confirmar programación",
          proxima_accion: "Confirmar programación",
          macroarea_actual: "operaciones",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "logistica-programada",
        label: "Registrar logistica programada",
        command: {
          kind: "logistica",
          accion: "registrar_logistica",
          actor: "qa-progresion",
          payload: {
            fecha_programada: "2026-04-20",
            responsable: "Coordinacion Operativa",
            estado_logistico: "programado",
            observacion_logistica:
              "Programacion confirmada con cuadrilla y materiales.",
            confirmacion_entrega: false,
            proxima_accion: "Ejecutar entrega",
            proxima_fecha: "2026-04-20",
          },
        },
        expected: {
          workflow_etapa_actual: "logistica_entrega",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Ejecutar entrega",
          proxima_accion: "Ejecutar entrega",
          macroarea_actual: "operaciones",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
    ],
  },
  {
    id: "logistica-auditoria-postventa",
    titulo: "Logistica a auditoria - operadora logistica norte",
    alta: {
      cliente: "Operadora Logística Norte",
      proyecto: "Centro de distribución Apodaca",
      canal: "WhatsApp",
      prioridad: "alta",
      descripcion:
        "El cliente requiere reparación aprobada y coordinación de ejecución en sitio.",
    },
    expected_after_alta: {
      workflow_etapa_actual: "solicitud",
      workflow_continuidad_estado: "pendiente",
      recomendacion_operativa_accion: "Confirmar programación",
      proxima_accion: "Confirmar programación",
      macroarea_actual: "operaciones",
      alineacion_operativa_estado: "alineada",
      priorizacion_agente_alineacion: "alineada",
    },
    steps: [
      {
        id: "diagnostico-registrado",
        label: "Registrar diagnostico base",
        command: {
          kind: "diagnostico",
          accion: "registrar_diagnostico",
          actor: "qa-progresion",
          payload: {
            problematica_identificada:
              "Zona intervenida con falla localizada y necesidad de ejecución correctiva.",
            causa_probable:
              "Deterioro del sistema aplicado y requerimiento de intervención puntual.",
            nivel_certeza: "alto",
            categoria_caso: "falla_acabado",
            solucion_recomendada:
              "Emitir propuesta correctiva y coordinar la ejecución posterior.",
            producto_recomendado: "Sistema elastomerico compatible",
            proceso_sugerido: "Reparacion localizada y reaplicacion",
            observaciones_tecnicas:
              "El caso cuenta con base suficiente para emitir propuesta.",
            requiere_validacion: false,
          },
        },
        expected: {
          workflow_etapa_actual: "diagnostico",
          workflow_continuidad_estado: "pendiente",
          recomendacion_operativa_accion: "Preparar cotización",
          proxima_accion: "Preparar cotización",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "parcial",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "cotizacion-registrada",
        label: "Registrar cotizacion formal",
        command: {
          kind: "cotizacion",
          accion: "registrar_cotizacion",
          actor: "qa-progresion",
          payload: {
            fecha_cotizacion: "2026-04-15",
            solucion_asociada:
              "Reparacion correctiva localizada con reaplicacion de acabado.",
            productos_incluidos:
              "Sistema elastomerico, sellador y materiales de reparacion",
            cantidades: "90 m2 de intervencion",
            condiciones: "Sujeto a aprobacion y programacion de obra",
            observaciones:
              "Cotizacion formal para avanzar a coordinación operativa.",
            monto: 14800,
            estado: "enviada",
            proxima_accion: "Dar seguimiento comercial",
            proxima_fecha: "2026-04-17",
          },
        },
        expected: {
          workflow_etapa_actual: "cotizacion",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Dar seguimiento comercial",
          proxima_accion: "Dar seguimiento comercial",
          macroarea_actual: "comercial",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "seguimiento-aprobado",
        label: "Registrar seguimiento aprobado",
        command: {
          kind: "seguimiento",
          accion: "registrar_seguimiento",
          actor: "qa-progresion",
          payload: {
            tipo_seguimiento: "llamada",
            resultado: "El cliente aprueba la propuesta y solicita ejecución.",
            proximo_paso: "Confirmar programación",
            proxima_fecha: "2026-04-18",
            estado_comercial: "aprobado",
            observaciones_cliente:
              "Solicita coordinar materiales y cuadrilla en la siguiente ventana operativa.",
          },
        },
        expected: {
          workflow_etapa_actual: "logistica_entrega",
          workflow_continuidad_estado: "al_dia",
          recomendacion_operativa_accion: "Confirmar programación",
          proxima_accion: "Confirmar programación",
          macroarea_actual: "operaciones",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "logistica-entregada",
        label: "Registrar logistica con entrega confirmada",
        command: {
          kind: "logistica",
          accion: "registrar_logistica",
          actor: "qa-progresion",
          payload: {
            fecha_programada: "2026-04-20",
            responsable: "Coordinacion Operativa",
            estado_logistico: "entregado",
            observacion_logistica:
              "Entrega y ejecución confirmadas en sitio sin incidentes mayores.",
            confirmacion_entrega: true,
            fecha_entrega: "2026-04-20",
            proxima_accion: "Registrar resultado de auditoría",
            proxima_fecha: "2026-04-21",
          },
        },
        expected: {
          workflow_etapa_actual: "auditoria",
          workflow_continuidad_estado: "pendiente",
          recomendacion_operativa_accion: "Registrar resultado de auditoría",
          proxima_accion: "Registrar resultado de auditoría",
          macroarea_actual: ["administracion", "operaciones"],
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
      {
        id: "auditoria-con-correccion",
        label: "Registrar auditoria con correccion requerida",
        command: {
          kind: "auditoria",
          accion: "registrar_auditoria",
          actor: "qa-progresion",
          payload: {
            fecha_auditoria: "2026-04-21",
            responsable_auditoria: "Auditoria Operativa",
            estado_auditoria: "requiere_correccion",
            observaciones_auditoria:
              "Se detectaron remates pendientes y correcciones menores antes de abrir postventa.",
            conformidad_cliente: false,
            requiere_correccion: true,
            proxima_accion: "Gestionar corrección pendiente",
            proxima_fecha: "2026-04-22",
          },
        },
        expected: {
          workflow_etapa_actual: "auditoria",
          workflow_continuidad_estado: "pendiente",
          recomendacion_operativa_accion: "Gestionar corrección pendiente",
          proxima_accion: "Gestionar corrección pendiente",
          macroarea_actual: "administracion",
          alineacion_operativa_estado: "alineada",
          priorizacion_agente_alineacion: "alineada",
        },
      },
    ],
  },
];
