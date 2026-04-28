import type { ClienteRelacionado } from "./types";

export function normalizarClienteRelacionado(
  clientes: ClienteRelacionado | ClienteRelacionado[] | null | undefined
): ClienteRelacionado | null {
  if (!clientes) return null;
  if (Array.isArray(clientes)) return clientes[0] ?? null;
  return clientes;
}
