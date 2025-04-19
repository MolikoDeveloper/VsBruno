## [0.0.2] - 2025-04-19

### Added

- Two‑way synchronization between request URL query string and Params table in the WebView.
- Helper utilities buildUri() and parseUri() to build/parse query strings consistently.
- Separate build pipeline for WebView (platform: \"browser\", format: \"iife\") to avoid Node‑specific globals.

### Changed

- Refactored App.tsx state management to prevent circular updates and ensure active flags persist.
- Params component now emits updates through onChange, keeping external state in sync.

## Fixed

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
