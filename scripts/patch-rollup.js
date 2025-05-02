#!/usr/bin/env node
/**
 * scripts/patch-rollup.js
 *
 * Lee dist/vendor/rollup.cjs, quita las funciones que
 * llamaban a binarios opcionales y las reemplaza por stubs.
 */

import fs from 'fs'
import path from 'path'

const target = path.resolve('dist/vendor/rollup.cjs')
let code = fs.readFileSync(target, 'utf8')

// 1) Stub de requireWithFriendlyError → pasa cualquier require al require normal,
//    y si falla, devuelve un objeto vacío.
code = code.replace(
  /function requireWithFriendlyError[\s\S]*?}\);?/,
  `function requireWithFriendlyError(request) {
    try {
      return require(request);
    } catch {
      return {};
    }
  };`
)

// 2) Stub de requireNative → siempre devuelve un objeto vacío.
code = code.replace(
  /function requireNative[\s\S]*?}\);?/,
  `function requireNative() { return {}; };`
)

fs.writeFileSync(target, code, 'utf8')
console.log('✅ rollup.cjs parcheado correctamente')
