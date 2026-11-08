import { describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import { getCopy, format } from '@/lib/copy'
import { legalDocumentSlugs, getLegalDocument } from '@/lib/legal/documents'
import { siteUrl } from '@/lib/siteOrigin'
import type { Metadata } from '@/lib/metadata'
import * as landing from '@/app/[locale]/LandingRoute'
import * as price from '@/app/[locale]/price/PriceRoute'
import * as design from '@/app/[locale]/design/DesignRoute'
import * as howItWorks from '@/app/[locale]/how-it-works/HowItWorksRoute'
import * as howToUse from '@/app/[locale]/how-to-use/HowToUseRoute'
import * as explainer from '@/app/[locale]/how-the-calculation-works/HowTheCalculationWorksRoute'
import * as aiPlanner from '@/app/[locale]/products/ai-planner/AiPlannerRoute'
import * as projectManagement from '@/app/[locale]/products/project-management/ProjectManagementRoute'
import * as aiDebugging from '@/app/[locale]/products/ai-debugging/AiDebuggingRoute'
import * as agentFleet from '@/app/[locale]/products/agent-fleet/AgentFleetRoute'
import * as agentHosting from '@/app/[locale]/products/agent-hosting/AgentHostingRoute'
import * as placeholder from '@/app/[locale]/products/[slug]/ProductPlaceholderRoute'
import * as legalLayout from '@/app/[locale]/legal/LegalLayout'
import * as legalIndex from '@/app/[locale]/legal/LegalIndexRoute'
import * as legalDocument from '@/app/[locale]/legal/[slug]/LegalDocumentRoute'

/*
 * THE CONTENT PAGES' MODULES, AS THEIR ASTRO PAGES CALL THEM (MOTIR-10644).
 *
 * Each `src/pages/[...locale]/*.astro` hands its route module's
 * `generateMetadata` to the shared layout and renders its default export.
 * This holds the metadata each one states — the canonical and the thirteen
 * alternates, the English-only canonical a legal page carries, the
 * placeholder's `noindex` — in a locale that is not English, where a dropped
 * prefix would show. The built heads were compared tag for tag with the Next
 * build at b9ff37a; this keeps them there.
 */

const params = (locale = 'de') => Promise.resolve({ locale })
const slugParams = (locale: string, slug: string) =>
  Promise.resolve({ locale, slug })

const ROUTES = [
  ['/', landing],
  ['/price', price],
  ['/design', design],
  ['/how-it-works', howItWorks],
  ['/how-to-use', howToUse],
  ['/how-the-calculation-works', explainer],
  ['/products/ai-planner', aiPlanner],
  ['/products/project-management', projectManagement],
  ['/products/ai-debugging', aiDebugging],
  ['/products/agent-fleet', agentFleet],
  ['/products/agent-hosting', agentHosting],
] as const

const languages = (meta: Metadata) =>
  Object.keys(meta.alternates?.languages ?? {})

describe('each content page states its own canonical and the thirteen alternates', () => {
  it.each(ROUTES)('%s', async (path, route) => {
    const meta = await route.generateMetadata({ params: params() })
    expect(meta.alternates?.canonical).toBe(
      siteUrl(path === '/' ? '/de' : `/de${path}`),
    )
    expect(languages(meta)).toHaveLength(LOCALES.length + 1)
    expect(languages(meta)).toContain('x-default')
    expect(meta.title).toEqual(expect.any(String))
    expect(meta.description).toEqual(expect.any(String))
  })

  it('keeps the product pages in review out of the index', async () => {
    for (const route of [aiPlanner, projectManagement, aiDebugging]) {
      const meta = await route.generateMetadata({ params: params() })
      expect(meta.robots).toEqual({ index: false, follow: true })
    }
  })
})

describe('the product placeholder', () => {
  it('is built for project-manager only, noindex, follow', async () => {
    expect(placeholder.PLACEHOLDER_SLUGS).toEqual(['project-manager'])
    const copy = await getCopy('fr')
    const meta = await placeholder.generateMetadata({
      params: slugParams('fr', 'project-manager'),
    })
    expect(meta.robots).toEqual({ index: false, follow: true })
    expect(meta.alternates?.canonical).toBe(
      siteUrl('/fr/products/project-manager'),
    )
    expect(meta.title).toBe(
      format(copy.products.metaTitle, {
        name: copy.nav.productItems.projectManager.name,
      }),
    )
  })

  it('names nothing for a slug no product has, and refuses to build it', async () => {
    expect(
      await placeholder.generateMetadata({
        params: slugParams('en', 'no-such-product'),
      }),
    ).toEqual({})
    await expect(
      placeholder.default({
        params: slugParams('en', 'no-such-product'),
      }),
    ).rejects.toThrow('No product is named "no-such-product"')
  })
})

describe('the legal pages', () => {
  it('take their words from the legal shell, in the page’s locale', async () => {
    const copy = await getCopy('ja')
    expect(
      await legalLayout.generateMetadata({ params: params('ja') }),
    ).toEqual({
      title: copy.legal.metaTitle,
      description: copy.legal.metaDescription,
    })
  })

  it('give the index its own canonical, as the Next build did', async () => {
    const meta = await legalIndex.generateMetadata({ params: params() })
    expect(meta.alternates?.canonical).toEqual(
      expect.stringContaining('/legal'),
    )
  })

  it.each(legalDocumentSlugs())(
    'canonicalise every locale of /legal/%s to the English document, with no hreflang',
    async (slug) => {
      const doc = getLegalDocument(slug)!
      for (const locale of ['de', 'zh-tw']) {
        const meta = await legalDocument.generateMetadata({
          params: slugParams(locale, slug),
        })
        expect(meta.alternates?.canonical).toBe(siteUrl(`/legal/${slug}`))
        expect(languages(meta)).toEqual([])
        expect(meta.title).toBe(doc.title)
        expect(meta.description).toContain(doc.version)
      }
    },
  )

  it('names nothing for a document that does not exist, and refuses to build it', async () => {
    expect(
      await legalDocument.generateMetadata({
        params: slugParams('en', 'nope'),
      }),
    ).toEqual({})
    await expect(
      legalDocument.default({ params: slugParams('en', 'nope') }),
    ).rejects.toThrow('No legal document is named "nope"')
  })
})

vi.mock('@/lib/ideas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ideas')>()),
  fetchIdeas: vi
    .fn()
    .mockResolvedValue({ items: [], categories: [], total: 0 }),
}))
