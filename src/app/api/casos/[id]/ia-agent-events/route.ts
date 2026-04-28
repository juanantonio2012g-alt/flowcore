import { NextResponse } from "next/server";
import { getEventosAgenteIAPorCaso } from "@/core/application/agentes-ia";
import {
  serializarErrorCasos,
  serializarEventosAgenteIAPorCaso,
} from "@/core/interfaces/api/casos";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function resolverLimit(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return undefined;
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit debe ser un entero positivo");
  }

  return limit;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(serializarErrorCasos("id es obligatorio"), {
        status: 400,
      });
    }

    const limit = resolverLimit(request);
    const readModel = await getEventosAgenteIAPorCaso(id, { limit });

    return NextResponse.json(serializarEventosAgenteIAPorCaso(readModel));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";

    if (message === "limit debe ser un entero positivo") {
      return NextResponse.json(serializarErrorCasos(message), {
        status: 400,
      });
    }

    return NextResponse.json(serializarErrorCasos(message), {
      status: 500,
    });
  }
}

