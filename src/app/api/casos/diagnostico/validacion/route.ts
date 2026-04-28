import { NextResponse } from "next/server";
import { executeDiagnosticoValidacion } from "@/core/application/casos/expediente/diagnostico";
import {
  serializarDiagnosticoValidacionResult,
  serializarErrorCasos,
} from "@/core/interfaces/api/casos";
import {
  createRequestSupabaseClient,
  extractBearerToken,
} from "@/lib/supabase/request";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";

type ErrorLike = {
  message?: string;
  stack?: string;
  cause?: unknown;
  error?: string;
};

function isErrorLike(value: unknown): value is ErrorLike {
  return Boolean(value) && typeof value === "object";
}

function normalizarError(error: unknown): {
  error: string;
  message: string;
  stack?: string;
  cause?: {
    message?: string;
    stack?: string;
    error?: string;
  };
} {
  if (error instanceof Error) {
    const cause = isErrorLike(error.cause)
      ? {
          error:
            typeof error.cause.error === "string" ? error.cause.error : undefined,
          message:
            typeof error.cause.message === "string"
              ? error.cause.message
              : undefined,
          stack:
            typeof error.cause.stack === "string" ? error.cause.stack : undefined,
        }
      : undefined;

    return {
      error: error.message,
      message: error.message,
      stack: error.stack,
      cause,
    };
  }

  if (isErrorLike(error)) {
    const message =
      typeof error.message === "string"
        ? error.message
        : typeof error.error === "string"
          ? error.error
          : "Error inesperado";

    const cause = isErrorLike(error.cause)
      ? {
          error:
            typeof error.cause.error === "string" ? error.cause.error : undefined,
          message:
            typeof error.cause.message === "string"
              ? error.cause.message
              : undefined,
          stack:
            typeof error.cause.stack === "string" ? error.cause.stack : undefined,
        }
      : undefined;

    return {
      error: message,
      message,
      stack: typeof error.stack === "string" ? error.stack : undefined,
      cause,
    };
  }

  const message = typeof error === "string" ? error : "Error inesperado";
  return {
    error: message,
    message,
  };
}

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!accessToken && !isDevelopment) {
      return NextResponse.json(
        serializarErrorCasos(
          "La validacion formal del diagnostico requiere una sesion autenticada."
        ),
        { status: 401 }
      );
    }

    const command = await request.json();
    const commandWithDevActor =
      isDevelopment && !accessToken && !command.actor
        ? {
            ...command,
            actor: "dev_bypass",
          }
        : command;
    const supabase = accessToken
      ? createRequestSupabaseClient(request)
      : createServerSupabaseServiceRoleClient();

    // DEV-only bypass: until the app has real login/logout, local development can
    // execute this action with a controlled server-side client. Production keeps
    // requiring a real authenticated session from the browser.
    const result = await executeDiagnosticoValidacion(commandWithDevActor, {
      supabase,
    });

    return NextResponse.json(
      serializarDiagnosticoValidacionResult(result),
      {
        status: result.ok ? 200 : 400,
      }
    );
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV === "development";
    const detalleError = normalizarError(error);

    console.error("POST /api/casos/diagnostico/validacion failed", error);
    if (detalleError.stack) {
      console.error(detalleError.stack);
    }
    if (detalleError.cause) {
      console.error("POST /api/casos/diagnostico/validacion cause", detalleError.cause);
      if (detalleError.cause.stack) {
        console.error(detalleError.cause.stack);
      }
    }

    if (isDevelopment) {
      return NextResponse.json(
        {
          ...serializarErrorCasos(detalleError.error),
          message: detalleError.message,
          stack: detalleError.stack,
          cause: detalleError.cause,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(serializarErrorCasos("Error inesperado"), {
      status: 500,
    });
  }
}
