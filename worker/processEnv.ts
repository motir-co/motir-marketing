import { env } from 'cloudflare:workers'

/*
 * THE SITE'S MODULES READ THE ORIGINS FROM `process.env`; THE WORKER HANDS
 * THEM ITS RUNTIME VARIABLES (MOTIR-10752).
 *
 * `lib/appOrigin.ts` and `lib/siteOrigin.ts` read
 * `process.env.NEXT_PUBLIC_MOTIR_{APP,SITE}_ORIGIN` once, at module scope —
 * the names the build inlines into the static pages. The live pages render
 * the same chrome in the Worker, so the same modules run here, and this
 * module sets those two names from `wrangler.jsonc`'s `MOTIR_APP_ORIGIN` and
 * `MOTIR_SITE_ORIGIN` before any of them is evaluated: `worker/index.ts`
 * imports it first, and ES modules evaluate in import order. One built Worker
 * is therefore pointed at the e2e stub or at app.motir.co by its variables
 * alone, with no rebuild.
 *
 * `cloudflare:workers`'s `env` is the same bindings object every `fetch`
 * receives, readable at module scope.
 */
const vars = env as { MOTIR_APP_ORIGIN?: string; MOTIR_SITE_ORIGIN?: string }

process.env.NEXT_PUBLIC_MOTIR_APP_ORIGIN = vars.MOTIR_APP_ORIGIN
process.env.NEXT_PUBLIC_MOTIR_SITE_ORIGIN = vars.MOTIR_SITE_ORIGIN
