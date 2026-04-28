#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { register } from "tsx/esm/api";

function parseArgs(argv) {
  const args = {
    scenarioIds: [],
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--scenario") {
      const value = argv[index + 1];
      if (value) {
        args.scenarioIds.push(value);
        index += 1;
      }
    }
  }

  return args;
}

function printUsage() {
  console.log("OpenCore QA - Validacion de progresion");
  console.log("");
  console.log("Uso:");
  console.log("  npm run qa:progresion");
  console.log("  npm run qa:progresion -- --scenario diagnostico-cotizacion-a");
  console.log("  npm run qa:progresion -- --json");
  console.log("");
}

function printStep(step) {
  console.log(`- ${step.label}: ${step.ok ? "OK" : "CON HALLAZGOS"}`);
  console.log("```json");
  console.log(
    JSON.stringify(
      {
        expected: step.expected,
        observed: step.observed,
        hallazgo: step.hallazgo,
        ajuste_sugerido: step.ajuste_sugerido,
      },
      null,
      2
    )
  );
  console.log("```");
}

function printReport(report) {
  console.log("# OpenCore - Reporte de validacion de progresion");
  console.log("");
  console.log(
    `Resumen: ${report.resumen.ok}/${report.resumen.total} escenarios alineados, ${report.resumen.con_hallazgos} con hallazgos`
  );
  console.log("");

  for (const escenario of report.escenarios) {
    console.log(`## ${escenario.titulo} (${escenario.id})`);
    console.log(`- Caso creado: ${escenario.caso_id ?? "-"}`);
    console.log(`- Resultado: ${escenario.ok ? "OK" : "CON HALLAZGOS"}`);
    printStep(escenario.initial);

    for (const step of escenario.steps) {
      printStep(step);
    }

    console.log("");
  }
}

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

function resolveTsCandidate(basePath) {
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ].find((candidate) => {
    if (!existsSync(candidate)) {
      return false;
    }

    return !statSync(candidate).isDirectory();
  });
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const basePath = path.resolve(process.cwd(), "src", specifier.slice(2));
      const resolvedPath = resolveTsCandidate(basePath);

      if (!resolvedPath) {
        throw new Error(`No se pudo resolver el alias ${specifier}`);
      }

      return nextResolve(pathToFileURL(resolvedPath).toString(), context);
    }

    const esRelativo =
      specifier.startsWith("./") || specifier.startsWith("../");
    const tieneExtension = /\.[a-z0-9]+$/i.test(specifier);

    if (esRelativo && !tieneExtension && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const basePath = path.resolve(parentDir, specifier);
      const resolvedPath = resolveTsCandidate(basePath);

      if (resolvedPath) {
        return nextResolve(pathToFileURL(resolvedPath).toString(), context);
      }
    }

    return nextResolve(specifier, context);
  },
});

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const scoped = register({ namespace: "opencore-qa-validacion-progresion" });

try {
  const mod = await scoped.import(
    "./src/core/application/qa/progresion/executeValidacionProgresion.ts",
    import.meta.url
  );
  const runValidacionProgresion =
    mod.runValidacionProgresion ??
    mod.default?.runValidacionProgresion ??
    mod.default;

  if (typeof runValidacionProgresion !== "function") {
    throw new Error(
      `No se pudo resolver runValidacionProgresion en el modulo QA. Export keys: ${Object.keys(mod).join(", ")}`
    );
  }

  const report = await runValidacionProgresion({
    scenarioIds: args.scenarioIds,
  });

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  process.exit(report.ok ? 0 : 1);
} finally {
  await scoped.unregister();
}
