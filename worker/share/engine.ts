import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import satori, { init as initSatori } from 'satori-worker/standalone'
import yogaWasm from 'satori-worker/yoga.wasm'

/*
 * THE SHARE CARD'S TWO WASM ENGINES (MOTIR-10757): satori's layout engine and
 * resvg, each compiled by wrangler as a WebAssembly module (its `CompiledWasm`
 * rule for a `.wasm` import) and instantiated once per isolate.
 *
 * `next/og` bundled both and drew in Node; the Worker draws with the same two
 * libraries, from their standalone builds, so nothing on the Worker imports
 * `next/og`. The modules are code and count toward the script's size; the
 * fonts are not, and are read from the static assets (`./fonts.ts`).
 *
 * ⚠️ SATORI IS PINNED AT 0.32 HERE, under the alias `satori-worker`. From 0.33
 * satori shapes text with HarfBuzz, an Emscripten build whose wasm is inlined
 * as bytes and compiled at run time — which workerd forbids (a Worker may only
 * instantiate a module its bundle compiled). Under `wrangler dev` every draw
 * hung until the runtime cancelled it. 0.32 is the last release whose only
 * wasm is yoga, imported here as a module like resvg's. The build-time share
 * images (`app/_brand/localeShareCard.tsx`) run in Node and keep the current
 * satori; `tests/worker/shareBundle.test.ts` fails if HarfBuzz reaches the
 * Worker again.
 *
 * Kept apart from the draw so a handler can be handed an engine of its own;
 * the unit suite compiles the same two `.wasm` files from disk (the
 * `compiledWasm` plugin in `vitest.config.mts`) and draws with the real ones.
 */

export interface ShareEngine {
  satori: typeof satori
  Resvg: typeof Resvg
}

let ready: Promise<ShareEngine> | null = null

/** The engines, instantiated on the first draw and kept for the isolate. */
export function shareEngine(): Promise<ShareEngine> {
  ready ??= Promise.all([initWasm(resvgWasm), initSatori(yogaWasm)]).then(
    () => ({ satori, Resvg }),
    (error: unknown) => {
      ready = null
      throw error
    },
  )
  return ready
}
