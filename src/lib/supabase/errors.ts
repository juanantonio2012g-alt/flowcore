function obtenerHostSupabaseConfigurado() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return supabaseUrl;
  }
}

export function obtenerMensajeErrorSupabase(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error);
}

export function esErrorConectividadSupabase(error: unknown) {
  const mensaje = obtenerMensajeErrorSupabase(error).toLowerCase();

  return (
    mensaje.includes("fetch failed") ||
    mensaje.includes("network") ||
    mensaje.includes("econnreset") ||
    mensaje.includes("etimedout") ||
    mensaje.includes("timeout") ||
    mensaje.includes("enotfound") ||
    mensaje.includes("getaddrinfo") ||
    mensaje.includes("dns") ||
    mensaje.includes("could not resolve host") ||
    mensaje.includes("failed to connect")
  );
}

export function construirMensajeErrorConectividadSupabase(
  operacion: string,
  error?: unknown
) {
  const host = obtenerHostSupabaseConfigurado();
  const base = host
    ? `No se pudo conectar con Supabase (${host}) durante ${operacion}. Verifica DNS, acceso de red y NEXT_PUBLIC_SUPABASE_URL.`
    : `No se pudo conectar con Supabase durante ${operacion}. Verifica DNS, acceso de red y NEXT_PUBLIC_SUPABASE_URL.`;
  const detalle = obtenerMensajeErrorSupabase(error);

  if (!detalle) {
    return base;
  }

  return `${base} Detalle técnico: ${detalle}`;
}
