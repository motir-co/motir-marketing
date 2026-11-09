/*
 * The one Workers runtime module the Worker imports (`worker/processEnv.ts`).
 *
 * Declared here rather than through `@cloudflare/workers-types`, whose
 * globals (`Request`, `Response`, `caches`) collide with the DOM library the
 * rest of this repository type-checks against in one `tsconfig.json`; the
 * Worker uses the standard Fetch types, which both define the same way.
 */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>
}

/** A `.wasm` import, which wrangler bundles as a compiled module (MOTIR-10757). */
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
