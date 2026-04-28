import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { getCasoDetalleNormalizadoById } = await import(
  './src/core/application/casos/useCases/getCasoDetalleNormalizadoById.ts'
);

const casoId = 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c';

const detalle = await getCasoDetalleNormalizadoById(casoId);

console.log(JSON.stringify({
  workflow_etapa_actual: detalle.estadoGlobal.workflow.etapa_actual,
  workflow_auditoria: detalle.estadoGlobal.workflow.auditoria,
  workflow_continuidad: detalle.estadoGlobal.workflow.continuidad,
  recomendacion_operativa: detalle.estadoGlobal.recomendacion_operativa,
  proxima_accion: detalle.estadoGlobal.proxima_accion,
  proxima_fecha: detalle.estadoGlobal.proxima_fecha
}, null, 2));
