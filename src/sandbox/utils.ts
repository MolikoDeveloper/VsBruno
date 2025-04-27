// src/sandbox/utils.ts
import ts from "typescript";
import * as vsc from "vscode"

export function transpileToCjs(src: string, fileName = "anon.ts") {
  const res = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName,
  });
  return res.outputText;
}

/** Devuelve true si el código contiene import o export a nivel de módulo */
export const isEsmSyntax = (code: string) =>
  /\bimport\s|^\s*export\s/m.test(code);



