import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/*
 * The repository's FIRST test lane (MOTIR-1152). `ci.yml`'s own header says to
 * "add a gate to `needs` as this repository grows one — do not declare a gate
 * before its job exists"; this is that job's other half, and `ci.yml` gains
 * both together.
 *
 * ⚠️ `NEXT_PUBLIC_MOTIR_APP_ORIGIN` IS SET HERE, and it is set to a value that
 * is NOT production on purpose. Every module that reaches `lib/destinations.ts`
 * imports `lib/appOrigin.ts`, which throws when the variable is missing — so
 * without this the whole suite would fail to import. A non-production value is
 * what lets `tests/destinations.test.ts` assert that the doors are BUILT from
 * the variable rather than merely equal to the string somebody expected.
 *
 * `tests/appOrigin.test.ts` is the one file that must see the variable ABSENT.
 * It re-imports the module under a stubbed environment rather than relying on
 * this default, which is why the default here does not weaken it.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    /*
     * next-intl is INLINED (MOTIR-7948). Its ESM build imports `next/server`
     * with no extension, which Node's own resolver refuses for a package with
     * no `exports` map — so loaded as an external, `proxy.ts` failed to import
     * at all. Inlined, Vite resolves the specifier the way Next's bundler does.
     */
    server: { deps: { inline: ['next-intl'] } },
    /*
     * ⚠️ `tests/design/**` BELONGS TO THE OTHER LANE (MOTIR-4001), and the
     * exclusion is load-bearing rather than tidy. Those specs drive a real
     * headless chromium — jsdom cannot measure a `.mock.html`, which is the
     * whole finding that card records — and the `Test` job installs no
     * browser, so a spec left in here would FAIL rather than run twice.
     * `vitest.design.config.mts` includes exactly what this excludes.
     *
     * ⚠️ `tests/seam/**` IS EXCLUDED FOR THE OPPOSITE REASON, and this one is
     * a CONTRACT rather than a capability (MOTIR-4139). That lane fetches the
     * egress manifest from the live motir-core deployment. It would RUN here
     * perfectly well — and that is the problem: `ci.yml` runs this job on every
     * pull request, so an app.motir.co restart would turn unrelated pull
     * requests red, which is precisely the cross-repository CI coupling
     * `public-surface-hosts.md` AMENDMENT 2 §E's split exists to avoid.
     * `vitest.seam.config.mts` includes exactly what this excludes, and
     * AMENDMENT 3 §B fixes where it may be triggered from: the deploy and a
     * schedule, never `pull_request`. Do not fold it back in.
     */
    exclude: ['node_modules/**', 'tests/design/**', 'tests/seam/**'],
    env: {
      NEXT_PUBLIC_MOTIR_APP_ORIGIN: 'https://app.test.motir.co',
    },
    /*
     * COVERAGE (MOTIR-4121) — this repository's first floor.
     *
     * ⚠️ IT RUNS INSIDE `pnpm test`, NOT AS A SECOND JOB, and that is the card's
     * own requirement ("the suite runs in the existing `test` job with no new CI
     * job"). `ci.yml`'s header says not to declare a gate before its job exists;
     * this adds a floor without adding a job, so the `test` gate that already
     * exists is the one that enforces it.
     *
     * ⚠️ `include` IS AN OPT-IN LIST, DELIBERATELY, and it is the same shape
     * motir-core uses. A repository-wide default would put every landing-page
     * component under a floor nobody measured, and the honest way to introduce
     * coverage to a repository that has never had it is one measured surface at
     * a time. What is listed here is what MOTIR-3877 added — MEASURED FIRST,
     * then pinned at the floor, per motir-core's own rule for that list.
     *
     * ⚠️ AND A FILE NOT IN THE LIST IS NOT MEASURED, which is exactly the defect
     * MOTIR-4120 found on the other side of this story: the sibling entry there
     * was a literal path, so five new route files inherited no floor at all and
     * the gate was green because it was measuring nothing. Adding a `/p/*` file
     * without adding it here reproduces that, so the list is checked by a test.
     */
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary'],
      /*
       * ⚠️ `?locale?`, NOT `[locale]` (MOTIR-7948). Every route moved under the
       * `app/[locale]` segment. In glob syntax `[locale]` is a CHARACTER CLASS;
       * picomatch, which this config is matched with, happens to fall back to a
       * literal match when the class matches nothing — measured, and not a
       * guarantee worth resting a floor on. And this file has a second reader:
       * `tests/publicProject/standingRules.test.ts` reads these arrays as TEXT,
       * up to their first `]`, so a bracket inside an entry would cut the list
       * short there. `?` matches the bracket on each side and is unambiguous to
       * both. The files measured are the same ones as before the move.
       */
      include: [
        'lib/publicProject.ts',
        'app/?locale?/p/**/*.tsx',
        // MOTIR-6743 — the five retired read pages are ROUTE HANDLERS now
        // (board, items, tree, roadmap and an item), each a permanent redirect
        // into the app. `.ts`, so the `.tsx` glob above does not reach them;
        // added WITH the files, per the rule the entry below records.
        'app/?locale?/p/**/route.ts',
        // MOTIR-4220. Added WITH the files rather than after them, which is the
        // rule the entry above earned: a file outside this list is not
        // measured, and a gate that measures nothing is green.
        'lib/publicHost.ts',
        'lib/hostResolution.ts',
        'lib/tenantDomain.ts',
        'proxy.ts',
        // MOTIR-4222 — the per-host crawl surface.
        // MOTIR-8842 — the sitemap is two halves under an index, and robots is
        // a built file plus a tenant route. Added WITH the files.
        'lib/sitemapEntries.ts',
        'lib/sitemapXml.ts',
        'app/robots.ts',
        'app/robots-tenant.txt/route.ts',
        'app/sitemap.xml/route.ts',
        'app/sitemap-site.xml/route.ts',
        'app/sitemap-projects.xml/route.ts',
        // MOTIR-7083 — the docs data modules Story MOTIR-6976 changed, added
        // WITH their top-up tests rather than after them. Before this story no
        // docs file was measured at all.
        'lib/docs.ts',
        'lib/skillsGuide.ts',
        'lib/mcpWiring.ts',
        // MOTIR-7685 — the ideas data layer, added WITH the file.
        'lib/ideas.ts',
        // MOTIR-7689 — the store-backed /ideas page and its components
        // (MOTIR-7687, MOTIR-7688). The page IS measured, unlike `app/p`'s:
        // `tests/ideas/ideasPage.test.tsx` awaits it against the recorded
        // contract, which is the integration gate the story asked for.
        'app/?locale?/ideas/**/*.tsx',
        // MOTIR-7967 — every non-route module Story MOTIR-7737 (eleven
        // languages) added or rewrote, measured first and pinned below.
        'i18n/*.ts',
        'lib/copy.ts',
        'lib/localeDetection.ts',
        'lib/languageSwitch.ts',
        'lib/localeMetadata.ts',
        'app/_components/LanguageSwitcher.tsx',
        'app/_components/NotFoundRoom.tsx',
        'app/_components/products.ts',
        'app/fonts.ts',
        'app/?locale?/not-found.tsx',
        'scripts/i18n/*.ts',
        // MOTIR-8032 — the per-language /docs document form, added WITH its tests.
        'lib/docsDocuments.ts',
        'app/?locale?/docs/_components/DocsDocument.tsx',
        'app/?locale?/docs/_components/TranslationUpdatingNote.tsx',
        // MOTIR-8089 — the files Story MOTIR-7740 (legal pages stay English)
        // changed, added WITH the gate that awaits them
        // (`tests/legal/bindingEnglishNoteGate.test.tsx`). The two pages ARE
        // measured, as `ideas`'s are: the gate awaits them per locale.
        'app/?locale?/legal/_components/BindingEnglishNote.tsx',
        'app/?locale?/legal/_components/MarkdownBody.tsx',
        'app/?locale?/legal/page.tsx',
        'app/?locale?/legal/?slug?/page.tsx',
        'lib/legal/englishAddress.ts',
        // MOTIR-8382 — the /price page's modules, added WITH their tests
        // (`tests/priceCard.test.tsx`, `tests/price/`).
        'app/_components/PricePage.tsx',
        'app/_components/price/*.ts',
        'app/_components/price/*.tsx',
        'lib/priceLadder.ts',
        'lib/aiOrigin.ts',
        'lib/seatFee.ts',
      ],
      /*
       * ⚠️ EVERY EXCLUSION HAS A REASON, and the reasons are different — a list
       * of paths with one blanket justification is how a gate stops measuring
       * things nobody decided to stop measuring.
       *
       *  • `changelog.xml/route.ts` — a pass-through whose whole behaviour is a
       *    status mapping against a real upstream. Covered end to end in the
       *    browser lane, which has one; a jsdom test would assert a mock.
       *  • `opengraph-image.tsx` — renders a raster through satori, which jsdom
       *    cannot execute at all. The browser lane FETCHES the image and checks
       *    its bytes, which is the only assertion that means anything.
       *  • `**\/page.tsx` and `tabPage.tsx` — async Server Components. Covering
       *    one means awaiting it, and what it does is compose a read with a
       *    render: both halves are already covered — the read in
       *    `lib/publicProject.ts` at 100%, the render in the component tests —
       *    and the composition is what the browser lane walks. MOTIR-4121 says
       *    in terms not to duplicate the E2E. This is the same gap motir-core's
       *    own config records for its `page.tsx` files, for the same reason.
       *  • `layout.tsx` — nine lines of chrome composition with no branch.
       */
      exclude: [
        'app/?locale?/p/**/changelog.xml/route.ts',
        'app/?locale?/p/**/opengraph-image.tsx',
        'app/?locale?/p/**/page.tsx',
        'app/?locale?/p/**/layout.tsx',
        'app/?locale?/p/**/_components/tabPage.tsx',
      ],
      /*
       * MEASURED FIRST, then pinned at the floor — motir-core's rule for its own
       * list, followed here. On this branch: `lib/publicProject.ts` 100 across;
       * `ActRail` / `ProjectHeader` / `Rows` / `States` / `JsonLd` 100 lines.
       */
      thresholds: {
        'lib/publicProject.ts': { lines: 90, functions: 90, branches: 90 },
        // MOTIR-8032 — measured first under `tests/docs/docsDocuments.test.ts`,
        // then pinned at the floor.
        'lib/docsDocuments.ts': { lines: 90, functions: 90, branches: 85 },
        'app/?locale?/docs/_components/DocsDocument.tsx': {
          lines: 90,
          functions: 90,
          branches: 80,
        },
        'app/?locale?/docs/_components/TranslationUpdatingNote.tsx': {
          lines: 90,
          functions: 90,
          branches: 85,
        },
        // MOTIR-8089 — MEASURED FIRST under `tests/legal/` on this branch: the
        // note and the English-address helper 100 across, `MarkdownBody` 96
        // lines / 95.7 functions / 100 branches, both pages 100 lines and
        // functions. The pages' BRANCHES are 75 (index) and 83.3 (document),
        // and the gap is one dead arm each: the version line's
        // `doc.effectiveDate ? versionAndEffective : versionNotYetEffective`,
        // whose first arm cannot run while every `content/legal/*.md` says
        // `effectiveDate: TBD` (`lib/legal/documents.ts` maps that to null).
        // Pinned at the measured floor rather than reached with a fixture
        // document; raise it when the first document takes effect.
        'app/?locale?/legal/_components/BindingEnglishNote.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/?locale?/legal/_components/MarkdownBody.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/?locale?/legal/page.tsx': {
          lines: 90,
          functions: 90,
          branches: 75,
        },
        'app/?locale?/legal/?slug?/page.tsx': {
          lines: 90,
          functions: 90,
          branches: 80,
        },
        'lib/legal/englishAddress.ts': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        // MEASURED FIRST, then pinned at the floor — the same rule the entries
        // beside it follow. On this branch: `publicHost` and `tenantDomain` 100
        // lines, `hostResolution` and `proxy` 100 lines.
        'lib/publicHost.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/hostResolution.ts': { lines: 90, functions: 90, branches: 85 },
        'lib/tenantDomain.ts': { lines: 90, functions: 90, branches: 85 },
        'proxy.ts': { lines: 90, functions: 90, branches: 85 },
        'lib/sitemapEntries.ts': { lines: 90, functions: 90, branches: 85 },
        'lib/sitemapXml.ts': { lines: 90, functions: 90, branches: 85 },
        'app/robots.ts': { lines: 90, functions: 90, branches: 85 },
        'app/robots-tenant.txt/route.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
        },
        'app/sitemap.xml/route.ts': { lines: 90, functions: 90, branches: 85 },
        'app/sitemap-site.xml/route.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
        },
        'app/sitemap-projects.xml/route.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
        },
        // MOTIR-6743 — measured first: the five redirect handlers are 100
        // across under `tests/publicProject/readPageRedirects.test.ts`.
        'app/?locale?/p/**/route.ts': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/?locale?/p/**/_components/*.tsx': {
          lines: 90,
          functions: 90,
          branches: 75,
        },
        // MOTIR-7083 — MEASURED FIRST under the docs tests on this branch:
        // `docs.ts` 100 lines / 98.6 branches / 100 functions (after
        // `tests/docs/docsLib.test.ts` topped up the helpers no page reached),
        // `skillsGuide.ts` and `mcpWiring.ts` 100 across. Pinned at the floor.
        'lib/docs.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/skillsGuide.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/mcpWiring.ts': { lines: 90, functions: 90, branches: 90 },
        // MOTIR-7685 — measured first under `tests/ideas.test.ts`.
        'lib/ideas.ts': { lines: 90, functions: 90, branches: 90 },
        // MOTIR-7689 — MEASURED FIRST under `tests/ideas/`: the page 95.7
        // lines / 96.7 branches / 91.7 functions, every component 100 lines
        // and ≥ 90.9 branches. Pinned at the story's floor.
        'app/?locale?/ideas/**/*.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        // MOTIR-7967 — the eleven-languages story's modules, MEASURED FIRST
        // (the summary is on its pull request) and pinned at the story's
        // floor. A glob key aggregates the files it matches.
        'i18n/*.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/copy.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/localeDetection.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/languageSwitch.ts': { lines: 90, functions: 90, branches: 90 },
        'lib/localeMetadata.ts': { lines: 90, functions: 90, branches: 90 },
        'app/_components/LanguageSwitcher.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/_components/NotFoundRoom.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/_components/products.ts': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'app/fonts.ts': { lines: 90, functions: 90, branches: 90 },
        'app/?locale?/not-found.tsx': {
          lines: 90,
          functions: 90,
          branches: 90,
        },
        'scripts/i18n/*.ts': { lines: 90, functions: 90, branches: 90 },
        // MOTIR-8382 — measured first under `tests/priceCard.test.tsx` and
        // `tests/price/`, then pinned at the floor.
        'app/_components/price/*.ts': {
          lines: 90,
          functions: 90,
          branches: 80,
        },
        'app/_components/price/*.tsx': {
          lines: 90,
          functions: 90,
          branches: 80,
        },
        'lib/priceLadder.ts': { lines: 90, functions: 90, branches: 85 },
        'lib/aiOrigin.ts': { lines: 90, functions: 90, branches: 85 },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
