/**
 * EVERY ROUTE THIS SITE SERVES, AND ONE CONCRETE URL FOR EACH (MOTIR-4169).
 *
 * ── ⚠️ THIS FILE IS A LIST, AND THAT IS SAFE ONLY BECAUSE A TEST ENUMERATES ─
 *
 * MOTIR-4169 asks for the landmark assertion to ENUMERATE the routes rather
 * than list them, "so a page added later cannot ship without one" — and a
 * browser cannot enumerate a route tree: a dynamic segment has no URL until
 * somebody supplies a parameter the stub can answer, so a spec that walked
 * `app/**` would have to invent `/explore/topic/undefined`.
 *
 * The enumeration therefore lives one lane over, in
 * `tests/mainLandmark.test.tsx`, and it enumerates `src/pages/[...locale]/**​/*.astro`
 * from disk and asserts that the pattern set below is EXACTLY that set — no missing
 * entry, no stale one. So a thirteenth page turns the `test` job red until it
 * appears here, and appearing here is what puts it in the browser lane's walk.
 * The list is the E2E lane's parameter table; the enumeration is the guard.
 *
 * ⚠️ SO THE 404 IS NOT IN THIS TABLE, AND MUST NOT BE ADDED TO IT
 * (MOTIR-4193). `404.astro` serves no route pattern of its own, so a row
 * for it would fail the very assertion above — the pattern
 * set here must be EXACTLY the enumerated one. The 404 has its own entry in
 * the lane instead: `e2e/specs/not-found.spec.ts`, which walks the four
 * arrivals that reach it and asserts the STATUS as well as the landmark count.
 *
 * ── THE URLS THE STUB CAN ANSWER ──────────────────────────────────────────
 *
 * Every `/p/*` URL uses `MOTIR`, the identifier `e2e/stub/publicApiStub.ts`
 * has fixtures for, and the two detail pages use the keys its `ROUTES` table
 * names. A URL this stub has no fixture for answers `STUB_NO_FIXTURE` and the
 * page renders its own not-found — which would pass a landmark assertion while
 * proving nothing about the route, so the pairing matters.
 */

export type SiteRoute = {
  /** The route pattern, as `tests/mainLandmark.test.tsx` derives it. */
  readonly pattern: string
  /** A URL the browser lane can actually open against the stub. */
  readonly url: string
}

export const SITE_ROUTES: readonly SiteRoute[] = [
  { pattern: '/', url: '/' },
  { pattern: '/design', url: '/design' },
  { pattern: '/how-it-works', url: '/how-it-works' },
  { pattern: '/how-to-use', url: '/how-to-use' },
  { pattern: '/price', url: '/price' },
  {
    pattern: '/how-the-calculation-works',
    url: '/how-the-calculation-works',
  },

  { pattern: '/docs', url: '/docs' },
  { pattern: '/docs/api', url: '/docs/api' },
  { pattern: '/docs/api/getting-started', url: '/docs/api/getting-started' },
  { pattern: '/docs/api/stability', url: '/docs/api/stability' },
  { pattern: '/docs/cli', url: '/docs/cli' },
  { pattern: '/docs/mcp', url: '/docs/mcp' },
  { pattern: '/docs/mcp/tools', url: '/docs/mcp/tools' },
  { pattern: '/docs/sandbox', url: '/docs/sandbox' },
  { pattern: '/docs/public-address', url: '/docs/public-address' },
  { pattern: '/docs/sentry', url: '/docs/sentry' },
  { pattern: '/docs/difficulty', url: '/docs/difficulty' },
  { pattern: '/docs/skills', url: '/docs/skills' },
  {
    pattern: '/docs/claude-code-plugin',
    url: '/docs/claude-code-plugin',
  },
  {
    pattern: '/docs/claude-code-connector',
    url: '/docs/claude-code-connector',
  },

  { pattern: '/legal', url: '/legal' },
  // `terms` is one of the seven files in `content/legal/`.
  { pattern: '/legal/[slug]', url: '/legal/terms' },
  // A product's page (2026-10 redesign) — one per product in the header's menu.
  { pattern: '/products/[slug]', url: '/products/project-manager' },
  { pattern: '/products/ai-planner', url: '/products/ai-planner' },
  {
    pattern: '/products/project-management',
    url: '/products/project-management',
  },
  { pattern: '/products/ai-debugging', url: '/products/ai-debugging' },
  { pattern: '/products/agent-fleet', url: '/products/agent-fleet' },
  { pattern: '/products/agent-hosting', url: '/products/agent-hosting' },
]

/**
 * THE PER-REQUEST ROUTES (MOTIR-10649) — the pages a static build does not
 * serve, because each renders per request from the public API. The Worker
 * answers them (MOTIR-10635), and `e2e/specs/landmark-live.spec.ts` walks
 * them; `tests/mainLandmark.test.tsx` holds the table to the Worker's document
 * slots. The tenant rows (`/no-application`, `/host-unavailable`) went with the
 * tenant router (MOTIR-10643).
 */
export const LIVE_ROUTES: readonly SiteRoute[] = [
  { pattern: '/ideas', url: '/ideas' },
  { pattern: '/motir-builds-itself', url: '/motir-builds-itself' },
  { pattern: '/explore', url: '/explore' },
  {
    pattern: '/explore/topic/[slug]',
    // `developer-tools` is the first slug in `e2e/fixtures/categories.json`.
    url: '/explore/topic/developer-tools',
  },
  { pattern: '/p/[identifier]', url: '/p/MOTIR' },
  { pattern: '/p/[identifier]/changelog', url: '/p/MOTIR/changelog' },
  {
    pattern: '/p/[identifier]/requests/[requestKey]',
    url: '/p/MOTIR/requests/MOTIR-4051',
  },
  { pattern: '/p/[identifier]/requests/new', url: '/p/MOTIR/requests/new' },
]
