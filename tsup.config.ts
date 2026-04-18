import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.tsx', 'src/apitoGraphqlNames.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', '@refinedev/core'],
    outExtension: ({ format }) => ({
        js: format === 'cjs' ? '.js' : '.mjs',
    }),
}); 