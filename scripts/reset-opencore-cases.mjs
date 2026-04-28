import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable ${name}.`);
  }

  return value;
}

function chunk(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

function isMissingRelationError(error) {
  const message = `${error?.message ?? ""}`.toLowerCase();
  const code = `${error?.code ?? ""}`.toLowerCase();

  return (
    code === "pgrst205" ||
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

async function deleteInBatches({ supabase, table, column, values, label }) {
  if (values.length === 0) {
    return 0;
  }

  let deleted = 0;

  for (const batch of chunk(values, 100)) {
    const { error } = await supabase.from(table).delete().in(column, batch);

    if (error) {
      if (isMissingRelationError(error)) {
        return deleted;
      }

      throw new Error(`No se pudo borrar ${label}: ${error.message}`);
    }

    deleted += batch.length;
  }

  return deleted;
}

async function selectAllCaseIds(supabase) {
  const { data, error } = await supabase.from("casos").select("id");

  if (error) {
    throw new Error(`No se pudieron leer los casos: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
}

async function selectInformeIds(supabase, caseIds) {
  if (caseIds.length === 0) {
    return [];
  }

  const informeIds = [];

  for (const batch of chunk(caseIds, 100)) {
    const { data, error } = await supabase
      .from("informes_tecnicos")
      .select("id")
      .in("caso_id", batch);

    if (error) {
      throw new Error(`No se pudieron leer informes técnicos: ${error.message}`);
    }

    for (const row of data ?? []) {
      informeIds.push(row.id);
    }
  }

  return informeIds;
}

async function countTable(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw new Error(`No se pudo contar ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function deleteAllRows(supabase, table, label) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);

  if (error) {
    if (isMissingRelationError(error)) {
      return;
    }

    throw new Error(`No se pudo vaciar ${label}: ${error.message}`);
  }
}

async function removeEvidenceObjects(supabase, caseIds) {
  let removed = 0;

  for (const caseId of caseIds) {
    const { data, error } = await supabase.storage
      .from("evidencias")
      .list(caseId, { limit: 1000 });

    if (error) {
      // If the bucket does not exist or cannot be listed, continue with DB cleanup.
      continue;
    }

    const objectPaths = (data ?? [])
      .filter((item) => item.name)
      .map((item) => `${caseId}/${item.name}`);

    if (objectPaths.length === 0) {
      continue;
    }

    const { error: removeError } = await supabase.storage
      .from("evidencias")
      .remove(objectPaths);

    if (!removeError) {
      removed += objectPaths.length;
    }
  }

  return removed;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_KEY para vaciar casos."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const beforeCounts = {
    casos: await countTable(supabase, "casos"),
    informes_tecnicos: await countTable(supabase, "informes_tecnicos"),
    evidencias_informe: await countTable(supabase, "evidencias_informe"),
    diagnosticos: await countTable(supabase, "diagnosticos"),
    cotizaciones: await countTable(supabase, "cotizaciones"),
    seguimientos: await countTable(supabase, "seguimientos"),
    diagnosticos_agente: await countTable(supabase, "diagnosticos_agente"),
    bitacora_cambios_caso: await countTable(supabase, "bitacora_cambios_caso"),
    logisticas_entrega: await countTable(supabase, "logisticas_entrega"),
    auditorias: await countTable(supabase, "auditorias"),
    postventas: await countTable(supabase, "postventas"),
    cierres_tecnicos: await countTable(supabase, "cierres_tecnicos"),
    workflow_transitions: await countTable(supabase, "workflow_transitions"),
    ia_agent_events: await countTable(supabase, "ia_agent_events"),
    automation_domain_events: await countTable(supabase, "automation_domain_events"),
    automation_execution_results: await countTable(
      supabase,
      "automation_execution_results"
    ),
  };

  console.log("Conteo previo:");
  console.table(beforeCounts);

  const caseIds = await selectAllCaseIds(supabase);

  let informeIds = [];
  let removedStorageObjects = 0;

  if (caseIds.length > 0) {
    informeIds = await selectInformeIds(supabase, caseIds);
    removedStorageObjects = await removeEvidenceObjects(supabase, caseIds);

    await deleteInBatches({
      supabase,
      table: "bitacora_cambios_caso",
      column: "caso_id",
      values: caseIds,
      label: "bitácora de cambios",
    });
    await deleteInBatches({
      supabase,
      table: "diagnosticos_agente",
      column: "caso_id",
      values: caseIds,
      label: "diagnósticos agente",
    });
    await deleteInBatches({
      supabase,
      table: "seguimientos",
      column: "caso_id",
      values: caseIds,
      label: "seguimientos",
    });
    await deleteInBatches({
      supabase,
      table: "cotizaciones",
      column: "caso_id",
      values: caseIds,
      label: "cotizaciones",
    });
    await deleteInBatches({
      supabase,
      table: "diagnosticos",
      column: "caso_id",
      values: caseIds,
      label: "diagnósticos",
    });
    await deleteInBatches({
      supabase,
      table: "evidencias_informe",
      column: "caso_id",
      values: caseIds,
      label: "evidencias por caso",
    });

    if (informeIds.length > 0) {
      await deleteInBatches({
        supabase,
        table: "evidencias_informe",
        column: "informe_id",
        values: informeIds,
        label: "evidencias por informe",
      });
    }

    await deleteInBatches({
      supabase,
      table: "workflow_transitions",
      column: "caso_id",
      values: caseIds,
      label: "workflow transitions",
    });
    await deleteInBatches({
      supabase,
      table: "logisticas_entrega",
      column: "caso_id",
      values: caseIds,
      label: "logísticas",
    });
    await deleteInBatches({
      supabase,
      table: "automation_domain_events",
      column: "caso_id",
      values: caseIds,
      label: "eventos de automatización",
    });

    if (informeIds.length > 0) {
      await deleteInBatches({
        supabase,
        table: "informes_tecnicos",
        column: "id",
        values: informeIds,
        label: "informes técnicos",
      });
    }

    await deleteInBatches({
      supabase,
      table: "casos",
      column: "id",
      values: caseIds,
      label: "casos",
    });
  }

  await deleteAllRows(supabase, "workflow_transitions", "workflow transitions");
  await deleteAllRows(
    supabase,
    "automation_domain_events",
    "eventos de automatización"
  );

  const afterCounts = {
    casos: await countTable(supabase, "casos"),
    informes_tecnicos: await countTable(supabase, "informes_tecnicos"),
    evidencias_informe: await countTable(supabase, "evidencias_informe"),
    diagnosticos: await countTable(supabase, "diagnosticos"),
    cotizaciones: await countTable(supabase, "cotizaciones"),
    seguimientos: await countTable(supabase, "seguimientos"),
    diagnosticos_agente: await countTable(supabase, "diagnosticos_agente"),
    bitacora_cambios_caso: await countTable(supabase, "bitacora_cambios_caso"),
    logisticas_entrega: await countTable(supabase, "logisticas_entrega"),
    auditorias: await countTable(supabase, "auditorias"),
    postventas: await countTable(supabase, "postventas"),
    cierres_tecnicos: await countTable(supabase, "cierres_tecnicos"),
    workflow_transitions: await countTable(supabase, "workflow_transitions"),
    ia_agent_events: await countTable(supabase, "ia_agent_events"),
    automation_domain_events: await countTable(supabase, "automation_domain_events"),
    automation_execution_results: await countTable(
      supabase,
      "automation_execution_results"
    ),
  };

  console.log("Conteo posterior:");
  console.table(afterCounts);
  console.log(`Casos eliminados: ${caseIds.length}`);
  console.log(`Informes eliminados: ${informeIds.length}`);
  console.log(`Objetos de storage eliminados: ${removedStorageObjects}`);
  console.log(
    "Clientes y usuarios de autenticación se mantuvieron intactos por diseño."
  );

  if (caseIds.length === 0) {
    console.log("No había casos, pero sí se limpió el historial operativo residual.");
  }
}

main().catch((error) => {
  console.error("No se pudo vaciar OpenCore.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
