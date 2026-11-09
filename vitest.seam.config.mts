import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/*
 * THE LIVE SEAM LANE (MOTIR-4139) — the only lane in this repository that
 * reaches the network, and the only one that may.
 *
 * `motir-core` `docs/decisions/public-surface-hosts.md` AMENDMENT 2 §E requires
 * one property of the split subprocessor guard: *the seam FAILS when the two
 * sides diverge.* Neither half shipped by MOTIR-4008 / MOTIR-4011 closes it —
 * one proves the manifest describes its own tree, the other proves the
 * comparison would report a divergence IF it were handed one. This lane hands
 * it the real one, fetched from the deployment `motir-core` actually serves.
 *
 * ⚠️ IT IS A SEPARATE LANE SO THAT PULL-REQUEST CI NEVER ACQUIRES THE COUPLING.
 * §E's cost note is explicit that closing the window must not mean one
 * repository's CI blocking on another's. A network assertion inside
 * `vitest.config.mts` would do exactly that: every pull request here would go
 * red when app.motir.co restarted. So the default lane EXCLUDES `tests/seam/**`
 * (see the exclusion there, which is load-bearing rather than tidy) and this
 * config includes exactly it. AMENDMENT 3 §B records where it is wired: the
 * DEPLOY job, before the release, and a SCHEDULE — never `pull_request`.
 *
 * ⚠️ AND `PUBLIC_MOTIR_APP_ORIGIN` IS DELIBERATELY NOT STUBBED HERE.
 * `vitest.config.mts` sets it to a non-production test value so the offline
 * suite can import `lib/appOrigin.ts` at all. Doing that here would point the
 * whole check at a host that does not exist and the lane would report
 * UNREACHABLE for ever. The real value comes from the environment — CI's own
 * workflow-level `env` — and `lib/appOrigin.ts` throws with the variable's name
 * when it is missing, which is the correct failure.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/seam/**/*.test.ts'],
    exclude: ['node_modules/**'],
    /*
     * The manifest fetch retries a transient deploy window (4 attempts, 5s
     * apart), so the ceiling has to clear that plus the request itself.
     */
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
