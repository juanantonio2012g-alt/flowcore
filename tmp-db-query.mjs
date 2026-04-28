import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('auditorias')
  .select('estado_auditoria, fecha_auditoria, fecha_cierre_tecnico, requiere_correccion, conformidad_cliente')
  .eq('caso_id', 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c')
  .order('created_at', { ascending: false })
  .limit(1);

if (error) {
  console.error(error);
} else {
  console.log(JSON.stringify(data[0], null, 2));
}