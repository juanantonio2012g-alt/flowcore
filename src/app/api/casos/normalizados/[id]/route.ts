import { NextResponse } from "next/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import {
  serializarCasoNormalizado,
  serializarErrorCasos,
} from "@/core/interfaces/api/casos";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(serializarErrorCasos("id es obligatorio"), {
        status: 400,
      });
    }

    const caso = await getCasoNormalizadoById(id);

    if (!caso) {
      return NextResponse.json(serializarErrorCasos("Caso no encontrado"), {
        status: 404,
      });
    }

    return NextResponse.json(serializarCasoNormalizado(caso));
  } catch (error) {
    return NextResponse.json(
      serializarErrorCasos(
        error instanceof Error ? error.message : "Error inesperado"
      ),
      { status: 500 }
    );
  }
}
