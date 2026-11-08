import { localizedPath } from '@/i18n/localizedPath'
import type { Metadata } from '@/lib/metadata'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@motir/design-system'
import { format, getCopy, type Copy } from '@/lib/copy'
import { localePageMetadata } from '@/lib/localeMetadata'
import {
  PRODUCT_SLUGS,
  SITE_ROOT,
  SIGN_UP,
  type ProductSlug,
} from '@/lib/destinations'
import { PLACEHOLDER_PRODUCTS } from '@/lib/productAddresses'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../../_components/SiteShell'
import { enterLocale } from '@/i18n/locale'

/*
 * A product's page (2026-10 redesign). The header's Products menu points at
 * one page per product; each will get its own design and copy. Until a page is
 * written, its route shows the product's name and its one line, with a way
 * into Motir — and it is kept out of the index (`robots: noindex`) and out of
 * the sitemap, because a placeholder is not a page a search result should land
 * on.
 */

const ITEM_KEY: Record<ProductSlug, keyof Copy['nav']['productItems']> = {
  'ai-planner': 'aiPlanner',
  'project-management': 'projectManagement',
  'project-manager': 'projectManager',
  'ai-debugging': 'aiDebugging',
  mcp: 'mcp',
  cli: 'cli',
  'claude-code-connector': 'claudeCodeConnector',
  'claude-code-plugin': 'claudeCodePlugin',
  'agent-fleet': 'agentFleet',
  'agent-hosting': 'agentHosting',
  sandbox: 'sandbox',
}

function productFor(slug: string, copy: Copy) {
  return (PRODUCT_SLUGS as readonly string[]).includes(slug)
    ? copy.nav.productItems[ITEM_KEY[slug as ProductSlug]]
    : null
}

/**
 * The slugs this route is built for: the placeholders (MOTIR-10644). A written
 * product has its own route, and a product whose page is its documentation is
 * a 308 to it in the built site's `_redirects` (`lib/redirects.ts`) — a static
 * page cannot answer one — so neither is built here.
 */
export const PLACEHOLDER_SLUGS = PLACEHOLDER_PRODUCTS

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const copy = await getCopy(await enterLocale(params))
  const product = productFor(slug, copy)
  if (!product) return {}
  return localePageMetadata(params, `/products/${slug}`, () => ({
    title: format(copy.products.metaTitle, { name: product.name }),
    description: product.blurb,
    robots: { index: false, follow: true },
  }))
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const { slug } = await params
  const product = productFor(slug, copy)
  // Only `PLACEHOLDER_SLUGS` is built, so this is a slug list that names a
  // product the menu does not have — a build error, never a page.
  if (!product) throw new Error(`No product is named "${slug}"`)

  return (
    <>
      <SiteShell host={SITE_HOST} className="bg-(--el-surface)">
        <section className="mx-auto grid max-w-[880px] gap-5 px-[clamp(16px,3vw,48px)] py-[clamp(72px,10vw,144px)]">
          <span className="font-(family-name:--font-mono) text-[12px] tracking-[0.1em] text-(--el-text-secondary) uppercase">
            {copy.products.eyebrow}
          </span>
          <h1 className="m-0 font-(family-name:--font-serif) text-[clamp(44px,7vw,104px)] leading-[0.92] font-bold tracking-[-0.045em]">
            {product.name}
          </h1>
          <p className="m-0 max-w-[40ch] text-[clamp(18px,1.6vw,22px)] text-(--el-text-secondary)">
            {product.blurb}
          </p>
          <p className="m-0 max-w-[52ch] text-[16px] text-(--el-text-secondary)">
            {copy.products.comingSoon}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={SIGN_UP} className={buttonVariants()}>
              {copy.products.start}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              href={localizedPath(locale, SITE_ROOT)}
              className={buttonVariants({ variant: 'ghost' })}
            >
              {copy.products.back}
            </a>
          </div>
        </section>
      </SiteShell>
    </>
  )
}
