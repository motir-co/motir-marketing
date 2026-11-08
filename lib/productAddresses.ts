/*
 * THE PRODUCT PAGES' ADDRESSES (2026-10 redesign · MOTIR-10644).
 *
 * The header's Products menu points at one page per product. These lists say
 * which addresses exist and what each one is, with no other import, so the
 * three places that need them read the same list: the pages and the header
 * (through `lib/destinations.ts`, which re-exports them), the redirect rules
 * the build writes (`lib/redirects.ts`, loaded by `astro.config.mjs` before
 * any build-time variable is checked), and `scripts/i18n/check-static-pages.ts`,
 * which runs under plain Node.
 */

/**
 * Every product slug. Until a page is written, its route renders the
 * product's name and one line with a way into Motir, and is kept OUT of
 * `SITE_PATHS` (and so out of the sitemap) on purpose.
 */
export const PRODUCT_SLUGS = [
  'ai-planner',
  'project-management',
  'project-manager',
  'ai-debugging',
  'mcp',
  'cli',
  'claude-code-connector',
  'claude-code-plugin',
  'agent-fleet',
  'agent-hosting',
  'sandbox',
] as const
export type ProductSlug = (typeof PRODUCT_SLUGS)[number]
export const productPath = (slug: ProductSlug) => `/products/${slug}`

/**
 * The products whose page IS their documentation: the tooling, and the
 * sandbox. The Products menu opens these in a new tab, and their
 * `/products/<slug>` address is a 308 to the same locale's docs page — a rule
 * in the built site's `_redirects` (`lib/redirects.ts`), never a page.
 */
export const PRODUCT_DOCS: Partial<Record<ProductSlug, string>> = {
  mcp: '/docs/mcp',
  cli: '/docs/cli',
  'claude-code-connector': '/docs/claude-code-connector',
  'claude-code-plugin': '/docs/claude-code-plugin',
  sandbox: '/docs/sandbox',
}

/** The products whose page is written in full, each at its own route. */
export const WRITTEN_PRODUCTS: readonly ProductSlug[] = [
  'ai-planner',
  'project-management',
  'ai-debugging',
  'agent-fleet',
  'agent-hosting',
]

/**
 * The slugs `/products/[slug]` builds: every product that is neither written
 * at its own route nor forwarded to its docs — the placeholders.
 */
export const PLACEHOLDER_PRODUCTS: readonly ProductSlug[] =
  PRODUCT_SLUGS.filter(
    (slug) => !WRITTEN_PRODUCTS.includes(slug) && !PRODUCT_DOCS[slug],
  )
