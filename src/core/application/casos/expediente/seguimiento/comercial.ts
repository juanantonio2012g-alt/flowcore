import { normalizarTextoNullable } from "@/core/domain/casos/rules";

export const ESTADOS_COMERCIALES_PRINCIPALES = [
  "en_proceso",
  "aprobado",
  "rechazado",
  "pausado",
] as const;

export const SENALES_COMERCIALES_COMPLEMENTARIAS = [
  "negociacion",
  "esperando_cliente",
  "esperando_revision_interna",
  "requiere_ajuste",
  "cliente_pidio_tiempo",
  "cliente_solicito_llamada",
] as const;

export type EstadoComercialPrincipal =
  (typeof ESTADOS_COMERCIALES_PRINCIPALES)[number];

export type SenalComercialComplementaria =
  (typeof SENALES_COMERCIALES_COMPLEMENTARIAS)[number];

const ESTADOS_PRINCIPALES_SET = new Set<string>(ESTADOS_COMERCIALES_PRINCIPALES);
const SENALES_SET = new Set<string>(SENALES_COMERCIALES_COMPLEMENTARIAS);
const SENALES_HEREDADAS_SET = new Set<string>([
  "negociacion",
  "esperando_cliente",
]);

const ESTADO_LABELS: Record<EstadoComercialPrincipal, string> = {
  en_proceso: "En proceso",
  aprobado: "Aprobado",
  rechazado: "Rechazado / sin conversion",
  pausado: "Pausado",
};

const SENAL_LABELS: Record<SenalComercialComplementaria, string> = {
  negociacion: "Negociacion activa",
  esperando_cliente: "Esperando respuesta del cliente",
  esperando_revision_interna: "Esperando revision interna",
  requiere_ajuste: "Requiere ajuste",
  cliente_pidio_tiempo: "El cliente pidio tiempo",
  cliente_solicito_llamada: "El cliente solicito llamada",
};

function deduplicar<T extends string>(valores: T[]) {
  return Array.from(new Set(valores));
}

export function esEstadoComercialPrincipal(
  valor: string | null | undefined
): valor is EstadoComercialPrincipal {
  return ESTADOS_PRINCIPALES_SET.has((valor ?? "").trim());
}

export function esSenalComercialComplementaria(
  valor: string | null | undefined
): valor is SenalComercialComplementaria {
  return SENALES_SET.has((valor ?? "").trim());
}

export function esEstadoComercialSeguimientoAdmitido(
  valor: string | null | undefined
) {
  const normalizado = normalizarTextoNullable(valor);
  return (
    normalizado !== null &&
    (esEstadoComercialPrincipal(normalizado) ||
      SENALES_HEREDADAS_SET.has(normalizado))
  );
}

export function normalizarSenalesComerciales(
  valores: Array<string | null | undefined> | null | undefined
): SenalComercialComplementaria[] {
  return deduplicar(
    (valores ?? [])
      .map((valor) => normalizarTextoNullable(valor))
      .filter((valor): valor is SenalComercialComplementaria =>
        esSenalComercialComplementaria(valor)
      )
  );
}

export function derivarSeguimientoComercial(args: {
  estadoComercial?: string | null;
  senalesComerciales?: Array<string | null | undefined> | null;
}) {
  const estado = normalizarTextoNullable(args.estadoComercial);
  const senales = normalizarSenalesComerciales(args.senalesComerciales);

  if (estado === "negociacion" || estado === "esperando_cliente") {
    return {
      estado_principal: "en_proceso" as const,
      senales_comerciales: deduplicar([
        estado,
        ...senales,
      ]) as SenalComercialComplementaria[],
    };
  }

  if (estado && esEstadoComercialPrincipal(estado)) {
    return {
      estado_principal: estado,
      senales_comerciales: senales,
    };
  }

  return {
    estado_principal: null,
    senales_comerciales: senales,
  };
}

export function labelEstadoComercialPrincipal(
  valor: string | null | undefined
) {
  const normalizado = normalizarTextoNullable(valor);
  if (!normalizado) return "-";
  const derivado = derivarSeguimientoComercial({
    estadoComercial: normalizado,
  }).estado_principal;
  return derivado ? ESTADO_LABELS[derivado] : normalizado;
}

export function labelSenalComercial(valor: string | null | undefined) {
  const normalizado = normalizarTextoNullable(valor);
  if (!normalizado) return "-";
  return esSenalComercialComplementaria(normalizado)
    ? SENAL_LABELS[normalizado]
    : normalizado;
}
