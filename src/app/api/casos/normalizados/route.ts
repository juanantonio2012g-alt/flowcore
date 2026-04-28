import { NextResponse } from "next/server";
import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import {
  serializarCasosNormalizados,
  serializarErrorCasos,
} from "@/core/interfaces/api/casos";

export async function GET() {
  try {
    const casos = await getCasosNormalizados();

    return NextResponse.json(serializarCasosNormalizados(casos));
  } catch (error) {
    return NextResponse.json(
      serializarErrorCasos(
        error instanceof Error ? error.message : "Error inesperado"
      ),
      { status: 500 }
    );
  }
}
