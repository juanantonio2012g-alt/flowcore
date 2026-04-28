import { createServerSupabaseClientWithAccessToken } from "./server";

export function extractBearerToken(authorization: string | null) {
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim() || null;
}

export function createRequestSupabaseClient(request: Request) {
  return createServerSupabaseClientWithAccessToken(
    extractBearerToken(request.headers.get("authorization"))
  );
}
