type ErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function esErrorEsquemaPostventaFaltante(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as ErrorLike;
  const code = candidate.code ?? null;
  const message = (candidate.message ?? "").toLowerCase();

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("postventas")
  );
}
