// ⚠️ FIRST, so the origins are in `process.env` before any site module reads them.
import './processEnv'
import type { Env, WaitUntil } from './env'
import { route } from './router'

/*
 * THE WORKER ENTRY (MOTIR-10752) — `main` in `wrangler.jsonc`.
 *
 * Cloudflare invokes it for the addresses `run_worker_first` names (the live
 * surface and the bare `/`) and for a request no built file matches; every
 * built page is answered from the static assets without it. `route` decides
 * the rest (`worker/router.ts`).
 */
const worker = {
  fetch(request: Request, env: Env, ctx: WaitUntil): Promise<Response> {
    return route(request, env, undefined, ctx)
  },
}

export default worker
