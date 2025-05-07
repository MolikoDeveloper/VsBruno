# scripting.

|Estado | tema | sugerencia |
|:-:|-|-|
| 🔴 | **Rendimiento** | Cachear la instancia de Rollup y el SourceMapConsumer. <br> Evitar recrear sandbox‑tsconfig.json y el directorio dist/node_modules en cada ejecución. |
| 🔴 | **Seguridad / Aislamiento** | Implementar un require filtrado (lista blanca) o ejecutar con vm.NodeVM de vm2 si necesitas aislar. <br>  Limitar acceso al disco fuera de collectionRoot.
| 🔴 | **Manejo de errores** | Error.prepareStackTrace debería guardarse y restaurarse para no impactar a otros componentes. <br> Agregar map.destroy() tras usar SourceMapConsumer para liberar memoria nativa.
| 🔴 | **Logs** | Serializar valores con una librería que maneje ciclos (p.ej. safe-stable-stringify) y truncar objetos grandes para no saturar el panel.
| 🔴 | **Extensibilidad de plugins** | Exponer una forma de que otros proveedores añadan rutas extra a moduleDirectories sin modificar el código fuente. <br> En fsPlugin.resolveId podrías permitir alias (@/utils → ${collectionRoot}/src/utils).
| 🔴 | **Corrección de línea inicial** | Compilas con ts.transpileModule pero no compensas scriptStartLine. Si el archivo original se inyecta más abajo, la pila quedará desfasada; considera añadir //@lineoffset o desplazar las líneas vacías.

# Bruno Provider.
 
| Estado | seccion | riesgos / comentarios |
|:-:|:-:|-|
| 🔴 |`resolveCustomTextEditor`|  watcher global sólo a collection.bru; si hay varios, refresca todo, pero el filtro podría ser más fino. |
| 🔴 | **Ejecución de script** | No hay timeout; un script colgado mantendrá estado running indefinidamente. |
| 🔴 | handleFetch | No usa AbortController; si la webview se cierra la fetch sigue viva.
| 🔴 | **Concurrencia de scripts** | Implementar abort/timeout (p.ej. `Promise.race` con `AbortController`) para evitar bloqueos permanentes. |
| 🔴 | **Gestión de memoria** | Cancelar `fetch` pendientes cuando el panel se cierre (`panel.onDidDispose`). |
| 🔴 | **Redirecciones** | Confirmar guardar si se cierran editores con cambios no guardados (`vscode.workspace.saveAll` o prompt). |
| 🔴 | **Watcher global** | Filtrar eventos (`e.document.languageId`, ruta) antes de parsear para reducir trabajo innecesario. |
| 🔴 | **Actualizar colección** | Actualmente refresca sólo al crear/borrar `collection.bru`. Si se mueve/renombra, no se detecta; podrías escuchar `onDidRenameFiles`. |
| 🔴 | **Validación de rollupEnabled** | El toggle requiere recargar VSCode completo; podrías recargar sólo la extensión (`workbench.action.reloadWindow` es global).|
| 🔴 | `getScriptStart` | Si el marcador no existe, devuelve `1`, pero tu `SandboxNode` inyecta líneas extra; considera devolver `0` y dejar que el sandbox ajuste. |
| 🔴 | **Error handling de findUpTree** | Asume texto UTF‑8 siempre; si el archivo está corrupto se lanza. Rodéalo de `try/catch` en el parseador. |
| 🔴 | **Seguridad en fetch** | Reenvías cualquier URL; un script malicioso podría recuperar archivos locales con `file://` en entornos que lo permitan. Validar protocolo.