import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { DEFAULT_LOCALE, LOCALES } from './i18n/routing.ts'
import { SITE_ORIGIN } from './lib/siteOrigin.ts'

/*
 * motir.co AS A BUILT SITE (MOTIR-10634 · MOTIR-10643).
 *
 * `astro build` writes the static half of motir.co — every page that is not
 * on the live public surface, in all twelve locales — into `dist/`, and
 * `wrangler.jsonc` serves that directory as Workers static assets. Nothing
 * here runs per request; the live surface is the Worker-routes story's.
 *
 * ── THE ADDRESS SHAPE IS THE NEXT SITE'S, AND TWO KEYS HOLD IT ─────────────
 *
 *  • `build.format: 'file'` writes `/price` as `price.html` and `/de` as
 *    `de.html`, which Workers' default `auto-trailing-slash` serves at the
 *    unslashed address. The `directory` format would write `price/index.html`,
 *    which the same handling answers at `/price/` — with a redirect from
 *    `/price` — and every canonical the Next build published names `/price`.
 *  • `trailingSlash: 'never'` keeps the dev server and every link Astro
 *    builds to that same spelling.
 *
 * ── THE LOCALES ARE READ, NOT RETYPED ──────────────────────────────────────
 *
 * `i18n/routing.ts` is the one list of the twelve (MOTIR-7948), so the
 * config imports it. English is unprefixed (`prefixDefaultLocale: false`),
 * every other locale sits under `/<locale>/`, and the pages spell that with
 * an optional `[...locale]` segment (`lib/staticPaths.ts`). `/en` and `/en/…`
 * are a 308 to the unprefixed address, from `public/_redirects`.
 *
 * ── BUILD-TIME ENV KEEPS ITS NAMES ─────────────────────────────────────────
 *
 * The modules read `process.env.NEXT_PUBLIC_*`, the names `ci.yml` already
 * sets (the CI story renames them). Prerendering runs in Node, where those
 * reads work as written; `define` inlines the same values into the islands'
 * browser bundle, exactly as `next build` inlined `NEXT_PUBLIC_*`, so a door
 * an island renders points where the server-rendered one does. `site` takes
 * `lib/siteOrigin.ts`'s answer, so that module stays the variable's one reader
 * (`tests/host/standingGuards.test.ts`).
 */

/** Every build-time variable an island's module can read. */
const PUBLIC_ENV = [
  'NEXT_PUBLIC_MOTIR_APP_ORIGIN',
  'NEXT_PUBLIC_MOTIR_SITE_ORIGIN',
  'NEXT_PUBLIC_MOTIR_AI_ORIGIN',
  'NEXT_PUBLIC_MOTIR_TENANT_DOMAIN',
]

const define = Object.fromEntries(
  PUBLIC_ENV.map((name) => [
    `process.env.${name}`,
    JSON.stringify(process.env[name]),
  ]),
)

export default defineConfig({
  site: SITE_ORIGIN,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react()],
  i18n: {
    locales: [...LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
    define,
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
  },
})
