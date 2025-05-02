const path = require('path');

try {
  // Ajusta la ruta según tu estructura de carpetas:
  const bundlePath = path.resolve('dist/vendor/rollup.cjs');

  // Intentamos hacer require() del bundle
  // @ts-ignore
  const { rollup } = require(bundlePath);

  if (typeof rollup !== 'function') {
    throw new Error(`"rollup" no es una función (tipo = ${typeof rollup})`);
  }

  console.log('✅ Rollup bundle cargado correctamente desde:', bundlePath);
  process.exit(0);
} catch (err) {
  console.error('❌ Error al cargar Rollup bundle:', err);
  process.exit(1);
}