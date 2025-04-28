/** Devuelve true si el código contiene import o export a nivel de módulo */
export const isEsmSyntax = (code: string) =>
  /\bimport\s|^\s*export\s/m.test(code);



