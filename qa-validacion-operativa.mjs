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
    includeHeuristico: false,
    caseIds: [],
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--heuristico") {
      args.includeHeuristico = true;
      continue;
    }

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--case") {
      const value = argv[index + 1];
      if (value) {
        args.caseIds.push(value);
        index += 1;
      }
    }
  }

  return args;
}

function printUsage() {
  console.log("OpenCore QA - Validacion operativa");
  console.log("");
  console.log("Uso:");
  console.log("  npm run qa:operativa");
  console.log("  npm run qa:operativa -- --heuristico");
  console.log("  npm run qa:operativa -- --case operadora-logistica-norte");
  console.log("  npm run qa:operativa -- --json");
  console.log("");
}

function printReport(report) {
  console.log("# OpenCore - Reporte de validacion operativa");
  console.log("");
  console.log(
    `Resumen: ${report.resumen.ok}/${report.resumen.total} casos alineados, ${report.resumen.con_hallazgos} con hallazgos`
  );
  console.log(
    `Heuristico: ${report.metadata.includeHeuristico ? "activado" : "omitido"}`
  );
  console.log("");

  for (const caso of report.casos) {
    console.log(`## ${caso.titulo} (${caso.id})`);
    console.log(`- Caso creado: ${caso.caso_id ?? "-"}`);
    console.log(`- Resultado: ${caso.ok ? "OK" : "CON HALLAZGOS"}`);
    console.log("- Esperado:");
    console.log("```json");
    console.log(JSON.stringify(caso.esperado, null, 2));
    console.log("```");
    console.log("- Observado:");
    console.log("```json");
    console.log(JSON.stringify(caso.observado, null, 2));
    console.log("```");
    console.log(`- Hallazgo: ${caso.hallazgo}`);
    console.log(`- Ajuste sugerido: ${caso.ajuste_sugerido}`);
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

      const candidate = pathToFileURL(resolvedPath).toString();
      return nextResolve(candidate, context);
    }

    const esImportRelativo =
      specifier.startsWith("./") || specifier.startsWith("../");
    const tieneExtension = /\.[a-z0-9]+$/i.test(specifier);

    if (esImportRelativo && !tieneExtension && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const basePath = path.resolve(parentDir, specifier);
      const resolvedPath = resolveTsCandidate(basePath);

      if (resolvedPath) {
        const candidate = pathToFileURL(resolvedPath).toString();
        return nextResolve(candidate, context);
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

const scoped = register({ namespace: "opencore-qa-validacion-operativa" });

try {
  const mod = await scoped.import(
    "./src/core/application/qa/operativa/executeValidacionOperativa.ts",
    import.meta.url
  );
  const runValidacionOperativa =
    mod.runValidacionOperativa ??
    mod.default?.runValidacionOperativa ??
    mod.default;

  if (typeof runValidacionOperativa !== "function") {
    throw new Error(
      `No se pudo resolver runValidacionOperativa en el modulo QA. Export keys: ${Object.keys(mod).join(", ")}`
    );
  }

  const report = await runValidacionOperativa({
    includeHeuristico: args.includeHeuristico,
    caseIds: args.caseIds,
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
