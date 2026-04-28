async function main() {
  const m = await import('./src/core/application/casos/expediente/logistica/index.ts');
  console.log(Object.keys(m));
}
main().catch(console.error);
