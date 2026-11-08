// @vitest-environment node
import type { Metadata } from '@/lib/metadata'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  languageAlternates,
  localeMetadata,
  localizedPath,
  projectAlternates,
} from '@/lib/localeMetadata'
import { englishCopy, resolveCopy } from '@/lib/copy'
import { LOCALE_BCP47, LOCALES, OG_LOCALE } from '@/i18n/routing'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'

/*
 * CRAWL DATA PER LANGUAGE (MOTIR-7956).
 *
 * Every motir.co page names its own address in its own language as the
 * canonical, lists all twelve language versions plus `x-default`, and reads
 * its title and description from that locale's catalogue. One helper spells
 * all of it, and the sitemap uses the same helper, so the two cannot disagree
 * (`tests/host/crawlSurface.test.ts` holds the sitemap half).
 */

type GenerateMetadata = (props: {
  params: Promise<Record<string, string>>
  searchParams?: Promise<Record<string, string>>
}) => Promise<Metadata>

const canonicalOf = (meta: Metadata) => String(meta.alternates?.canonical)

describe('the helper', () => {
  it('spells a locale’s address — English unprefixed, the root without a slash', () => {
    expect(localizedPath('en', '/explore')).toBe('/explore')
    expect(localizedPath('ja', '/explore')).toBe('/ja/explore')
    expect(localizedPath('ja', '/')).toBe('/ja')
    expect(localizedPath('fr', '/explore?rank=new')).toBe(
      '/fr/explore?rank=new',
    )
    expect(localizedPath('fr', '/?q=x')).toBe('/fr?q=x')
  })

  it('lists thirteen alternates — the twelve locales by BCP 47 tag and x-default on English', () => {
    const languages = languageAlternates('/design')
    expect(Object.keys(languages).sort()).toEqual(
      [...LOCALES.map((l) => LOCALE_BCP47[l]), 'x-default'].sort(),
    )
    expect(languages['zh-TW']).toBe(siteUrl('/zh-tw/design'))
    expect(languages.zh).toBe(siteUrl('/zh/design'))
    expect(languages).not.toHaveProperty('zh-tw')
    for (const url of Object.values(languages)) {
      expect(url.startsWith(`${SITE_ORIGIN}/`)).toBe(true)
    }
    expect(languages['x-default']).toBe(languages.en)
    expect(languages.en).toBe(siteUrl('/design'))
    expect(languages.ja).toBe(siteUrl('/ja/design'))
  })

  it('canonicalises a page to its own language address, with og:locale and eleven alternates', () => {
    const meta = localeMetadata({
      locale: 'ja',
      copy: englishCopy,
      path: '/design',
      title: 'T',
      description: 'D',
    })
    expect(canonicalOf(meta)).toBe(siteUrl('/ja/design'))
    expect(meta.alternates?.languages).toEqual(languageAlternates('/design'))
    const og = meta.openGraph as Record<string, unknown>
    expect(og.locale).toBe(OG_LOCALE.ja)
    expect(og.alternateLocale).toHaveLength(11)
    expect(og.alternateLocale).not.toContain(OG_LOCALE.ja)
    expect(og.url).toBe(siteUrl('/ja/design'))
    // A child `openGraph` replaces the root's, so the share card is named —
    // the page's own locale's card (MOTIR-7972).
    expect(og.images).toEqual([
      expect.objectContaining({ url: '/ja/opengraph-image' }),
    ])
  })
})

describe('the landing reads its words from the locale’s catalogue', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/copy')
    vi.resetModules()
  })

  it('a mocked title under ja; de’s own catalogue title under de', async () => {
    vi.resetModules()
    vi.doMock('@/lib/copy', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/copy')>()
      return {
        ...actual,
        getCopy: async (locale: string) =>
          locale === 'ja'
            ? resolveCopy({ meta: { title: 'モティア' } })
            : actual.getCopy(locale as never),
      }
    })
    const { generateMetadata } = await import('@/app/[locale]/LandingRoute')

    const ja = await generateMetadata({
      params: Promise.resolve({ locale: 'ja' }),
    })
    expect(ja.title).toBe('モティア')
    expect(canonicalOf(ja).endsWith('/ja')).toBe(true)
    expect(Object.keys(ja.alternates?.languages ?? {})).toHaveLength(13)

    const de = await generateMetadata({
      params: Promise.resolve({ locale: 'de' }),
    })
    // de's catalogue shipped (MOTIR-7960), so the real reader serves its title.
    expect(de.title).toBe(
      (await import('@/messages/de.json')).default.meta.title,
    )
    expect(de.title).not.toBe(englishCopy.meta.title)
    expect(canonicalOf(de)).toBe(siteUrl('/de'))
  })
})

/**
 * Every converted page, with the English path it canonicalises to. A page
 * whose canonical carries a query or a slug is given one below.
 */
const PAGES: { module: string; path: string; params?: object }[] = [
  { module: '@/app/[locale]/LandingRoute', path: '/' },
  { module: '@/app/[locale]/design/DesignRoute', path: '/design' },
  {
    module: '@/app/[locale]/how-it-works/HowItWorksRoute',
    path: '/how-it-works',
  },
  { module: '@/app/[locale]/docs/(guides)/DocsIndexRoute', path: '/docs' },
  ...(
    [
      ['claude-code-connector', 'ClaudeCodeConnectorRoute'],
      ['claude-code-plugin', 'ClaudeCodePluginRoute'],
      ['cli', 'CliRoute'],
      ['difficulty', 'DifficultyRoute'],
      ['mcp', 'McpRoute'],
      ['mcp/tools', 'McpToolsRoute'],
      ['public-address', 'PublicAddressRoute'],
      ['sandbox', 'SandboxRoute'],
      ['sentry', 'SentryRoute'],
      ['skills', 'SkillsRoute'],
    ] as const
  ).map(([slug, route]) => ({
    module: `@/app/[locale]/docs/(guides)/${slug}/${route}`,
    path: `/docs/${slug}`,
  })),
  { module: '@/app/[locale]/docs/api/ApiReferenceRoute', path: '/docs/api' },
  {
    module: '@/app/[locale]/docs/api/getting-started/GettingStartedRoute',
    path: '/docs/api/getting-started',
  },
  {
    module: '@/app/[locale]/docs/api/stability/StabilityRoute',
    path: '/docs/api/stability',
  },
  ...(
    [
      ['agent-fleet', 'AgentFleetRoute'],
      ['agent-hosting', 'AgentHostingRoute'],
      ['ai-debugging', 'AiDebuggingRoute'],
      ['ai-planner', 'AiPlannerRoute'],
      ['project-management', 'ProjectManagementRoute'],
    ] as const
  ).map(([slug, route]) => ({
    module: `@/app/[locale]/products/${slug}/${route}`,
    path: `/products/${slug}`,
  })),
  {
    module: '@/app/[locale]/products/[slug]/ProductPlaceholderRoute',
    path: '/products/project-manager',
    params: { slug: 'project-manager' },
  },
  { module: '@/app/[locale]/legal/LegalIndexRoute', path: '/legal' },
  // A legal DOCUMENT is not here: every language version of it is canonical to
  // the English document (MOTIR-8086), the English-only arm below.
  // `/explore`, `/ideas` and `/motir-builds-itself` render per request: their
  // arm is `localeMetadataLive.test.ts`, held for MOTIR-10635.
]

describe('every converted page canonicalises to its own language address', () => {
  afterEach(() => vi.unstubAllGlobals())

  for (const { module, path, params } of PAGES) {
    for (const locale of ['en', 'fr'] as const) {
      it(`${module} under ${locale}`, async () => {
        // No page's metadata may depend on a network read succeeding.
        vi.stubGlobal('fetch', async () => {
          throw new Error('ECONNREFUSED')
        })
        const { generateMetadata } = (await import(
          /* @vite-ignore */ module
        )) as { generateMetadata: GenerateMetadata }
        const meta = await generateMetadata({
          params: Promise.resolve({ locale, ...params }),
          searchParams: Promise.resolve({}),
        })
        expect(canonicalOf(meta)).toBe(siteUrl(localizedPath(locale, path)))
        expect(meta.alternates?.languages).toEqual(languageAlternates(path))
        expect(meta.title).toBeTruthy()
      })
    }
  }

  it('a legal document is the exception: every language version is canonical to the English document, with no hreflang set (MOTIR-8086)', async () => {
    const slug = legalDocumentSlugs()[0]!
    const { generateMetadata } =
      await import('@/app/[locale]/legal/[slug]/LegalDocumentRoute')
    for (const locale of ['en', 'fr'] as const) {
      const meta = await generateMetadata({
        params: Promise.resolve({ locale, slug }),
      })
      expect(canonicalOf(meta)).toBe(siteUrl(`/legal/${slug}`))
      expect(meta.alternates?.languages).toBeUndefined()
      expect(meta.title).toBeTruthy()
    }
  })

  it('no canonical resolves to the root except the English landing’s', () => {
    const roots = PAGES.filter(({ path }) => path === '/')
    expect(roots).toHaveLength(1)
    expect(roots[0]!.module).toBe('@/app/[locale]/LandingRoute')
  })
})

describe('a public project page', () => {
  it('on motir.co: its own language address, and the thirteen alternates', () => {
    const alternates = projectAlternates('fr', 'https://motir.co/p/MOTIR')
    expect(alternates.canonical).toBe(siteUrl('/fr/p/MOTIR'))
    expect(alternates.languages).toEqual(languageAlternates('/p/MOTIR'))
    expect(
      projectAlternates('en', 'https://motir.co/p/MOTIR/changelog').canonical,
    ).toBe(siteUrl('/p/MOTIR/changelog'))
  })

  it('on a workspace or customer host: that canonical, and NO hreflang set', () => {
    for (const primary of [
      'https://acme.motir.site/ACME',
      'https://roadmap.acme.com/',
    ]) {
      const alternates = projectAlternates('fr', primary)
      expect(alternates.canonical).toBe(primary)
      expect(alternates.languages).toBeUndefined()
    }
  })
})
