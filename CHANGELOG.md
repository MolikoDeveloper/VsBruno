## [0.0.33] - 2025-05-25

### fixed
 - Rollup Binary on windows OS.

## [0.0.32] - 2025-05-25

### fixed
 - rollup import on windows.

### added
- auto complete for external script files.
- added variable syntax to json body.
- {{variables}} parse.
- **pre Request**: 
    - ```ts
        req.setBody({name: "value"}})
        //or
        req.setBody({ '{{variable1}}': '{{variable2}}'}});
        ```
    - ```ts
        // adds or update a header.
        req.setHeader("Content-Type", "application/json", true); /** enabled: true by default.*/
        
        // for multiple headers.
        req.setHeaders([
            {
                name: 'Content-Type',
                value: "text/plain"
            },
            {
                name: 'Authorization',
                value: "Basic user:pass"
            }
        ])
        ```

### changed
- less files exported for monaco-editor loader.
- rollup download folder.
- vscode engine upgrade.

### fixed
- retain Context When the editor is hidden in production.

## [0.0.31] - 2025-05-10

### fixed
- Request Body editor fixed.

## [0.0.3] - 2025-05-10

### Added

- Dynamic Monaco language registration based on `src/common/headers.json`, providing tokenization, completions, and hover tooltips with no external dependencies.
- Support for multiple Monaco contexts (`req`, `res`) by injecting custom global types (`req`, `res`, `bru`) with autocomplete and type safety.
- Automatic detection of the current VSCode theme (`light`, `vs-dark`, `hc-black`) using `vscode.theme`.
- New UMD bundle that assigns `globalThis.ReactJSX | globalThis.ReactDOM | globalThis.React` dynamically based on `NODE_ENV`, matching React's official runtime behavior.
- Added `manual.yml` GitHub Actions workflow to allow manual build validation execution via `workflow_dispatch`.
- Added `bun.yml` GitHub Actions workflow to allow automatic build validation execution via `workflow_dispatch`.
- The UMD banner now sets `globalThis.process = { env: { NODE_ENV: "..." } }` to prevent "process is not defined" errors in WebViews.

### Changed

- Rollup exports skip params depending of post script instruction.
- Replaced Codemirror with `@monaco-editor/react`.

### Fixed

- CSP violation for `blob:` workers; resolved by reconfiguring Monaco to use local `vs` paths and avoiding blob-based workers.

## [0.0.2] - 2025-04-19

### Added

- Two‑way synchronization between request URL query string and Params table in the WebView.
- Helper utilities buildUri() and parseUri() to build/parse query strings consistently.
- Separate build pipeline for WebView (platform: \"browser\", format: \"iife\") to avoid Node‑specific globals.

### Changed

- Refactored App.tsx state management to prevent circular updates and ensure active flags persist.
- Params component now emits updates through onChange, keeping external state in sync.

### Fixed

- Runtime error “module is not defined” in WebView by bundling the WebView code for the browser environment.
- Column mis‑alignment in the query parameter table when the vertical scrollbar is visible.

## [0.0.1] - 2025-04-14

### Added

- Interactive visual editor for `.bru` files using React and TailwindCSS.
- Command `vs-bruno.openPlainText` to reopen `.bru` as plain text (F7).
- Markdown viewer with syntax-highlighted code blocks.
- Tailwind and PostCSS integration.
- Resizable response panel with persistent width state.
- Editable `Params` table with activation checkboxes, fully controllable externally.
- JSON collapsible viewer (`JsonSchemaViewer`) for better response readability.
- Left panel with customizable tabbed navigation and persistent active tab.
- Right panel with response-related tabs: body, headers, timeline, etc.
- Enhanced `.bru` parser that removes unnecessary indentation in `docs` blocks.

### Changed

- Refactored `Tag` component for cleaner logic and event handling.
- Replaced `highlight.js` integration to dynamically highlight code using scoped CSS themes.
- Improved visual styling using VSCode theme variables (light/dark mode compatible).

### Fixed

- Correct parsing of `json` and `docs` blocks.
- Prevented misaligned indentation when rendering `docs` block markdown.
- Improved sync between the `.bru` source file and the graphical editor view.
