import type { Plugin } from 'esbuild';
import { build as esbuildBuild } from 'esbuild';

export interface ReactUMDPluginOptions {
    /** Carpeta de salida para los bundles (por defecto "dist") */
    outdir?: string;
    /** Entrada de React (por defecto "node_modules/react/index.js") */
    reactEntry?: string;
    /** Entrada de ReactDOM wrapper unificado (por defecto "src/vendor/react-dom.ts") */
    reactDOMEntry?: string;
    /** Indica si es producción (por defecto usa process.env.NODE_ENV) */
    prod?: boolean;
}

export default function reactUMDPlugin(opts: ReactUMDPluginOptions = {}): Plugin {
    const prod = opts.prod ?? (process.env.NODE_ENV === 'production');
    const NODE_ENV = prod ? 'production' : 'development';
    const outdir = opts.outdir ?? 'dist';
    const reactEntry = opts.reactEntry ?? 'node_modules/react/index.js';
    const reactDOMEntry = opts.reactDOMEntry ?? __dirname + '/react-dom.ts';
    const reactOutfile = `${outdir}/react.${NODE_ENV}${prod ? '.min' : ''}.js`;
    const reactDOMOutfile = `${outdir}/react-dom.${NODE_ENV}${prod ? '.min' : ''}.js`;

    return {
        name: 'esbuild-react-umd',
        setup(build) {
            build.onEnd(async () => {
                // 1) Bundlea React
                await esbuildBuild({
                    entryPoints: [reactEntry],
                    bundle: true,
                    platform: 'browser',
                    format: 'iife',
                    globalName: 'React',
                    sourcemap: !prod ? 'inline' : false,
                    minify: prod,
                    outfile: `${build.initialOptions.outdir ? build.initialOptions.outdir + "/" : ''}${reactOutfile}`,
                });

                // 2) Bundlea ReactDOM usando la global React
                await esbuildBuild({
                    entryPoints: [reactDOMEntry],
                    bundle: true,
                    platform: 'browser',
                    format: 'iife',
                    globalName: 'ReactDOM',
                    sourcemap: !prod ? 'inline' : false,
                    minify: prod,
                    external: ['react'],
                    outfile: `${build.initialOptions.outdir ? build.initialOptions.outdir + "/" : ''}${reactDOMOutfile}`,
                    banner: {
                        js: `
  function require(module) {
    if (module === 'react') return window.React;
    if (module === 'react-dom/client') return window.ReactDOM;
    if (module === 'react-dom') return window.ReactDOM.default;
    if (module === 'react/jsx-runtime') {
        const React = window.React;
        function jsx(type, props, key) {
            const finalProps = { ...props };
                if (key !== undefined) finalProps.key = key;
                return React.createElement(type, finalProps);
            }
        return {
            jsx,
            jsxs: jsx,
            jsxDEV: jsx,
            Fragment: React.Fragment
        };
    }
    throw new Error('Cannot find module ' + module);
  }
              `.trim()
                    },
                });

                console.log(`✅ React`);
                console.log(`✅ ReactDOM`);
            });
            build.onResolve({ filter: /^(react|react-dom(\/client)?|react\/jsx-runtime)$/ }, args => ({
                path: args.path,
                external: true
            }))
        }
    };
}