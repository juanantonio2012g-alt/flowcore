import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const mod = await import('./src/core/application/casos/useCases/getCasoDetalleNormalizadoById.ts');
console.log('EXPORTS', Object.keys(mod));
