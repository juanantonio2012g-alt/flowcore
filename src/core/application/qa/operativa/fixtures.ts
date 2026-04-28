export type ValorEsperado<T> = T | T[];

export type ValidacionOperativaFixture = {
  id: string;
  titulo: string;
  input: {
    cliente: string;
    proyecto: string;
    canal: string;
    prioridad: "urgente" | "alta" | "media" | "baja";
    descripcion: string;
  };
  expected: {
    detalle: {
      tipo_solicitud?: ValorEsperado<string | null>;
      accion_en_curso?: ValorEsperado<string | null>;
      accion_prioritaria?: ValorEsperado<string | null>;
      macroarea_actual?: ValorEsperado<string | null>;
      alineacion_operativa?: ValorEsperado<string | null>;
      priorizacion_agente_alineacion?: ValorEsperado<string | null>;
    };
    heuristico?: {
      categoria_probable?: ValorEsperado<string | null>;
      nivel_certeza?: ValorEsperado<string | null>;
      sintomas_incluye?: string[];
    };
  };
};

export const VALIDACION_OPERATIVA_FIXTURES: ValidacionOperativaFixture[] = [
  {
    id: "constructora-andina",
    titulo: "Constructora Andina",
    input: {
      cliente: "Constructora Andina",
      proyecto: "Torre Alameda - impermeabilizacion de cubiertas",
      canal: "WhatsApp",
      prioridad: "media",
      descripcion:
        "El cliente recibio la propuesta preliminar, pero dice que necesita revisarla con compras y definir si avanzan este mes. Pide que lo contactemos nuevamente la proxima semana.",
    },
    expected: {
      detalle: {
        tipo_solicitud: "seguimiento",
        accion_en_curso: "Dar seguimiento comercial",
        accion_prioritaria: "Dar seguimiento comercial",
        macroarea_actual: "comercial",
        alineacion_operativa: "alineada",
        priorizacion_agente_alineacion: "alineada",
      },
      heuristico: {
        categoria_probable: "otro",
        nivel_certeza: "muy_bajo",
      },
    },
  },
  {
    id: "operadora-logistica-norte",
    titulo: "Operadora Logistica Norte",
    input: {
      cliente: "Operadora Logistica Norte",
      proyecto: "Centro de distribucion Apodaca - entrega de material",
      canal: "WhatsApp",
      prioridad: "alta",
      descripcion:
        "Ya aprobaron el trabajo y nos piden confirmar fecha de programacion con el vendor para coordinar entrega en sitio durante la proxima ventana operativa.",
    },
    expected: {
      detalle: {
        tipo_solicitud: "servicio",
        accion_en_curso: "Confirmar programación",
        accion_prioritaria: "Confirmar programación",
        macroarea_actual: "operaciones",
        alineacion_operativa: "alineada",
        priorizacion_agente_alineacion: "alineada",
      },
      heuristico: {
        categoria_probable: "otro",
        nivel_certeza: "muy_bajo",
      },
    },
  },
  {
    id: "hotel-costa-azul",
    titulo: "Hotel Costa Azul",
    input: {
      cliente: "Hotel Costa Azul",
      proyecto: "Fachada torre sur",
      canal: "WhatsApp",
      prioridad: "alta",
      descripcion:
        "Reportan humedad persistente y filtraciones en muro exterior del nivel 4. Ya hubo una reparacion previa, pero volvieron a aparecer manchas y desprendimiento de acabado.",
    },
    expected: {
      detalle: {
        tipo_solicitud: "diagnostico",
        accion_en_curso: "Realizar diagnóstico",
        accion_prioritaria: "Realizar diagnóstico",
        macroarea_actual: "tecnico",
        alineacion_operativa: "alineada",
        priorizacion_agente_alineacion: "alineada",
      },
      heuristico: {
        categoria_probable: "humedad_filtracion",
        nivel_certeza: "muy_bajo",
        sintomas_incluye: [
          "humedad_visible",
          "filtracion",
          "manchas",
          "desprendimiento",
        ],
      },
    },
  },
  {
    id: "clinica-san-marcos",
    titulo: "Clinica San Marcos",
    input: {
      cliente: "Clinica San Marcos",
      proyecto: "Postventa sistema aplicado en quirofanos",
      canal: "WhatsApp",
      prioridad: "media",
      descripcion:
        "El cliente indica que la intervencion ya fue entregada, pero quiere confirmar comportamiento del acabado y revisar si hace falta una visita de postventa para cerrar tecnicamente el caso.",
    },
    expected: {
      detalle: {
        tipo_solicitud: "postventa",
        accion_en_curso: "Registrar seguimiento postventa",
        accion_prioritaria: "Registrar seguimiento postventa",
        macroarea_actual: "administracion",
        alineacion_operativa: "alineada",
        priorizacion_agente_alineacion: "alineada",
      },
      heuristico: {
        categoria_probable: ["otro", "falla_acabado"],
        nivel_certeza: "muy_bajo",
      },
    },
  },
  {
    id: "grupo-delta",
    titulo: "Grupo Delta",
    input: {
      cliente: "Grupo Delta",
      proyecto: "Planta Queretaro",
      canal: "WhatsApp",
      prioridad: "media",
      descripcion:
        "El cliente comenta que hay un problema en una zona intervenida y quiere que revisemos opciones. No esta claro si necesita diagnostico, reparacion, cotizacion o visita.",
    },
    expected: {
      detalle: {
        tipo_solicitud: "servicio",
        accion_en_curso: "Definir próxima acción y fecha",
        macroarea_actual: "administracion",
        alineacion_operativa: "alineada",
        priorizacion_agente_alineacion: "alineada",
      },
      heuristico: {
        categoria_probable: "otro",
        nivel_certeza: "muy_bajo",
      },
    },
  },
];
