'use client'

import { useCallback, useRef, useState } from 'react'
import { useSitePathname } from '@/i18n/sitePathname'
import { ArrowRight, ArrowUpRight, ChevronDown, Menu } from 'lucide-react'
import { buttonVariants, cn } from '@motir/design-system'
import { type Copy, useCopy, usePageLocale } from '@/lib/copy'
import type { Locale } from '@/i18n/routing'
import { PRODUCT_MARK, productGroupsFor, productItemsFor } from './products'
import { BrandTile } from './BrandTile'
import { LADDER_CLASSES } from './headerLadder'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useDismiss } from './useDismiss'
import {
  DESIGN,
  DOCS,
  EXPLORE,
  HOW_IT_WORKS,
  HOW_TO_USE,
  PRICE,
  IDEAS,
  MOTIR_BUILDS_ITSELF,
  FREE_DOOR,
  SIGN_IN,
  SITE_ROOT,
  PRODUCT_DOCS,
  productPath,
  type ProductSlug,
} from '@/lib/destinations'
import { siteLinkFor, type PublicHost } from '@/lib/publicHost'
import { ChromeLink } from './ChromeLink'
import { SetupPromptButton } from './SetupPromptButton'

/*
 * The top bar, carrying DOOR 3's first half: the `Start free` nav entry.
 *
 * Since the 2026-10 redesign it has NO FILL AND NO RULE of its own: it sits on
 * the page's own background, so it reads as the top of the hero rather than a
 * stripe above it, and its links sit on the left beside the Motir lockup, with
 * Sign in and Start free on the right. (It was the `ExploreTopBar` pattern: an
 * `--el-surface-soft` fill, an `--el-border` hairline and centred links.) The
 * ink notes below were measured on that fill; on the page background the same
 * pairs are the page's own, and `tests/aaMatrix.test.ts` re-measures them.
 *
 * ⚠️ THE CURRENT-PAGE ITEM IS `--el-accent-on-surface` AT `font-weight: 600` —
 * the pairing `ExploreTopBar` ships, byte for byte. This comment used to say
 * the opposite twice over, and BOTH halves are retired (MOTIR-1043 /
 * MOTIR-3874):
 *
 *   - *"no nav item here is ever the current page"* — true while motir.co was
 *     one page. `/design` is the site's first internal second route.
 *   - *"NO ACCENT-COLOURED TEXT: 4.41:1 in dark, under AA"* — a MEASUREMENT of
 *     `@motir/design-system@0.1.0`, and it named its own expiry condition.
 *     MOTIR-3872 published 0.1.1 with MOTIR-3745's and MOTIR-3774's lifted ink
 *     and this repository pins it: the same pair now measures **5.76:1** in
 *     dark and 6.29:1 in light, on `--el-surface-soft`, and the Menu
 *     panel's `--el-surface` reads 5.54:1 / 6.03:1. Those four are the warm
 *     palette's, which MOTIR-6471 renamed Amethyst; the monochrome Motir
 *     palette that is the default since MOTIR-6616 reads 9.40 / 5.99 and
 *     9.05 / 5.53. `tests/aaMatrix.test.ts` re-measures every pair over every
 *     palette rather than trusting this note.
 *
 * The invented stand-in the old number forced — `--el-text` plus a 2px
 * `--el-accent` rule — is GONE rather than kept alongside: it existed only
 * because the accent ink failed AA, so a pattern that outlived its reason
 * would just be a pattern app.motir.co does not have. `font-weight: 600` is
 * retained and is the whole of WCAG 1.4.1 here — a non-colour channel carries
 * the state — and `aria-current="page"` carries it to assistive technology.
 *
 * The brand GLYPH keeps `--el-accent-on-surface` and is fine there — it is a
 * graphical object at 1.4.11's 3:1, not text.
 */

/*
 * The bar's three nav destinations, as the SITE PATHS they are — the href each
 * one actually gets is `siteLinkFor(host, path)`, because this same chrome is
 * worn by every tenant host and these three pages exist on `motir.co` alone.
 *
 * Explore and Docs are same-origin (MOTIR-4045 / MOTIR-4046) and `/design` has
 * been since it shipped (MOTIR-1043), so on the SITE all three are `next/link`s
 * that mark themselves current on their surface and its sub-pages.
 *
 * ⚠️ AND OFF THE SITE ALL THREE STOP BEING `next/link`s (MOTIR-4372) — the rule
 * this file already applied to the app doors, now applied to the site's own
 * pages on the hosts where they are a different ORIGIN. It is not a tidiness
 * point: a same-origin `next/link` is RSC-PREFETCHED on render, so before this
 * card every load of every tenant page fetched `/explore`, `/docs` and `/design`
 * and took three 404s before the visitor touched anything. Neither prefetching,
 * client routing nor `aria-current` means anything across origins.
 */
const navItemsFor = (copy: Copy) =>
  [
    // How Motir works stands where Build in public stood until projects are
    // built in public on Motir (2026-10-18); /explore itself is unchanged.
    { path: HOW_IT_WORKS, label: copy.nav.howItWorks },
    { path: HOW_TO_USE, label: copy.nav.howToUse },
    { path: PRICE, label: copy.nav.price },
    { path: MOTIR_BUILDS_ITSELF, label: copy.nav.buildsItself, feature: true },
    { path: IDEAS, label: copy.nav.ideas },
    { path: DOCS, label: copy.nav.docs },
    { path: DESIGN, label: copy.nav.design },
  ] as const

/**
 * Whether an item is the page being read. Explore and Docs each cover their
 * sub-pages, so they match the `/explore/` / `/docs/` prefix too.
 *
 * ⚠️ ASKED OF THE SITE PATH AND ONLY ON THE SITE. Off it the item is a link to
 * another origin and can never be the current page — and the guard is not
 * merely redundant there: a workspace whose project identifier is `explore`
 * serves that project at `acme.motir.site/explore`, where a pathname test alone
 * would light the nav item up on a page that is not the Explore surface.
 */
/*
 * The Products menu (2026-10 redesign): every product, in its three groups
 * (`./products`), each with its mark colour and its own page. It opens from a
 * real button, closes on Escape and on a click outside it, and its entries are
 * ordinary links.
 */

/** A product's address: its page, or — for the tooling — its documentation. */
const productHref = (host: PublicHost, slug: ProductSlug, locale: Locale) =>
  siteLinkFor(host, PRODUCT_DOCS[slug] ?? productPath(slug), locale)
const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const

function ProductsMenu({ host }: { host: PublicHost }) {
  const copy = useCopy()
  const locale = usePageLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const onSite = host.kind === 'site'

  const close = useCallback(() => setOpen(false), [])
  useDismiss(rootRef, open, close)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="products-menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          NAV_ITEM,
          NAV_REST,
          'inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
        )}
      >
        {copy.nav.products}
        <ChevronDown
          aria-hidden="true"
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div
          id="products-menu"
          aria-label={copy.nav.productsMenuLabel}
          role="group"
          data-surface="popover"
          className="absolute top-[calc(100%+12px)] left-[-14px] z-40 grid w-[min(920px,calc(100vw-32px))] gap-x-4 gap-y-3 rounded-(--radius-card) border border-(--el-border) bg-(--el-page-bg) p-(--spacing-card-padding) shadow-(--shadow-elevated) md:grid-cols-3"
        >
          {productGroupsFor(copy).map((group) => (
            <div key={group.label} className="grid content-start gap-1">
              <p className="m-0 px-(--spacing-control-x) pb-1 font-(family-name:--font-mono) text-[11px] tracking-[0.1em] text-(--el-text-secondary) uppercase">
                {group.label}
              </p>
              {group.items.map((product) => (
                <ChromeLink
                  key={product.slug}
                  href={productHref(host, product.slug, locale)}
                  internal={onSite && !PRODUCT_DOCS[product.slug]}
                  {...(PRODUCT_DOCS[product.slug] ? NEW_TAB : {})}
                  onClick={() => setOpen(false)}
                  className="grid grid-cols-[10px_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-(--radius-control) px-(--spacing-control-x) py-(--spacing-control-y) no-underline hover:bg-(--el-surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)"
                >
                  <i
                    aria-hidden="true"
                    className={cn(
                      'row-span-2 mt-1.5 size-2.5',
                      PRODUCT_MARK[product.slug],
                    )}
                  />
                  <b className="inline-flex items-center gap-1 text-[14.5px] font-semibold text-(--el-text)">
                    {product.name}
                    {PRODUCT_DOCS[product.slug] ? (
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 text-(--el-text-secondary)"
                      />
                    ) : null}
                  </b>
                  <span className="text-[13px] text-(--el-text-secondary)">
                    {product.blurb}
                  </span>
                </ChromeLink>
              ))}
              {group.label === copy.nav.productGroups.tooling ? (
                <SetupPromptButton look="row" className="mt-2" />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const isCurrent = (host: PublicHost, path: string, pathname: string) =>
  host.kind !== 'site'
    ? false
    : path === EXPLORE || path === DOCS
      ? pathname === path || pathname.startsWith(`${path}/`)
      : pathname === path

// The bar's nav sets its own text size per locale (`ladder.bar`); the Menu
// panel's items keep the full size.
const NAV_ITEM = 'font-medium whitespace-nowrap'
const NAV_REST = 'text-(--el-text) hover:text-(--el-accent-on-surface)'
const NAV_CURRENT = 'font-semibold text-(--el-accent-on-surface)'
/** "Motir builds itself" is live: square and words walk the wave hues (`.mk-live`, globals.css). */
const LIVE_ITEM =
  'mk-live-text inline-flex items-center gap-2 hover:underline underline-offset-4'
const LIVE_SQUARE = (
  <i aria-hidden="true" className="mk-live size-2 flex-none" />
)

export function SiteHeader({
  host,
  overlay = false,
}: {
  host: PublicHost
  /** Over the page's first section rather than above it (`SiteShell`). */
  overlay?: boolean
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = useSitePathname()
  const onSite = host.kind === 'site'
  // The give-way ladder (MOTIR-7947 revision 2): the widths each rung needs
  // are this locale's, measured, not shared breakpoints.
  const ladder = LADDER_CLASSES[locale]

  return (
    <header className={cn(overlay && 'absolute inset-x-0 top-0 z-30')}>
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-(--spacing-card-padding) sm:py-4">
        <div className="flex min-w-0 items-center gap-8">
          {/* motir.co's own root — internal ON THE SITE, and an absolute link
            HOME from a tenant host, where `/` is that workspace's or that
            project's root rather than ours (MOTIR-4372). This comment used to
            call it "the ONE internal link on the page", which was true of the
            host it was written on and of no other. Every destination that is a
            different ORIGIN stays a plain `<a>`: `next/link` prefetches and
            client-routes, neither of which means anything across origins. */}
          <ChromeLink
            href={siteLinkFor(host, SITE_ROOT, locale)}
            internal={onSite}
            aria-label={copy.nav.brandAriaLabel}
            className="flex flex-none items-center"
          >
            {/* 28px in the bar, 22px in the footer — the §7c proportions. The
              accessible name comes from the visible wordmark and the glyph is
              aria-hidden inside BrandMark: a lockup is decoration plus visible
              text, never both an image and a label. */}
            <BrandTile size={28} />
          </ChromeLink>

          <nav
            aria-label={copy.nav.ariaLabel}
            className={cn('items-center', ladder.bar, ladder.nav)}
          >
            <ProductsMenu host={host} />
            {navItemsFor(copy).map((item) => {
              const current = isCurrent(host, item.path, pathname)
              return (
                <ChromeLink
                  key={item.path}
                  href={siteLinkFor(host, item.path, locale)}
                  internal={onSite}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    NAV_ITEM,
                    current ? NAV_CURRENT : NAV_REST,
                    'feature' in item && LIVE_ITEM,
                  )}
                >
                  {'feature' in item && LIVE_SQUARE}
                  {item.label}
                </ChromeLink>
              )
            })}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:flex-none">
          {/* The first thing to leave the bar (rung B); narrower viewports
              reach it in the Products menu. */}
          <SetupPromptButton look="header" className={ladder.setup} />
          <a
            href={SIGN_IN}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'md' }),
              'text-[15px]',
              ladder.wide,
            )}
          >
            {copy.nav.signIn}
          </a>
          {/* DOOR 3, half one of two. It is the LAST thing to leave the bar on
              a narrow viewport, not the first — it is the only door up here,
              and a visitor who wants the project-management tool has no other
              route in from the public web. */}
          <a
            href={FREE_DOOR}
            className={cn(
              buttonVariants({ size: 'md' }),
              'text-[15px]',
              // Below `sm` the label may wrap onto two lines and drops its
              // arrow, so the longest catalogue label (fr "Commencer
              // gratuitement") fits beside the brand, language and Menu at
              // 390px instead of painting over the brand (MOTIR-8135).
              'max-sm:h-auto max-sm:min-h-(--height-btn-md) max-sm:min-w-0 max-sm:py-1 max-sm:leading-tight max-sm:whitespace-normal',
            )}
          >
            {copy.nav.startFree}
            <ArrowRight aria-hidden="true" className="size-3.5 max-sm:hidden" />
          </a>
          {/* The language switcher (MOTIR-7953): the bar's LAST control, after
              the account pair, and on the bar at EVERY width — a 40px square
              that fits beside Start free and Menu at 390px. It has no section
              in the Menu panel: one control, in one place. */}
          <LanguageSwitcher host={host} />
          <button
            type="button"
            aria-label={copy.nav.menu}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'w-8 shrink-0 px-0',
              ladder.menu,
            )}
          >
            <Menu aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {/*
       * ⚠️ ONE RUNG-1 FILL, DECLARED. The design asset draws this button and
       * says "the nav collapses behind the menu button", but depicts no OPEN
       * panel. What it does NOT leave open is the panel's CONTENT: these are
       * exactly the three items the same asset's desktop bar draws and that
       * the narrow bar drops. So the box is the only unspecified thing, and it
       * is composed from the bar's own tokens and the nav's own type scale —
       * no new vocabulary. Flagged on the pull request so it is cheap to
       * redirect; if a real mobile-nav design lands, this is the one block it
       * replaces.
       */}
      {menuOpen ? (
        <nav
          id="site-menu"
          aria-label={copy.nav.ariaLabel}
          data-surface="popover"
          className={cn(
            'flex flex-col gap-3 border-t border-(--el-border) bg-(--el-page-bg) px-4 py-3 shadow-(--shadow-elevated)',
            ladder.menu,
          )}
        >
          {/* The current-page treatment is drawn HERE TOO. It is a separate
              branch in the same component, which is exactly how a treatment
              ends up existing only on desktop — the design asset draws the
              open panel (panel 4) rather than describing it, for that
              reason. */}
          {[
            ...productItemsFor(copy).map((product) => ({
              href: productHref(host, product.slug, locale),
              label: product.name,
              internal: onSite && !PRODUCT_DOCS[product.slug],
              current: false,
              newTab: Boolean(PRODUCT_DOCS[product.slug]),
            })),
            ...navItemsFor(copy).map((item) => ({
              href: siteLinkFor(host, item.path, locale),
              label: item.label,
              internal: onSite,
              current: isCurrent(host, item.path, pathname),
              feature: 'feature' in item,
            })),
            {
              href: SIGN_IN,
              label: copy.nav.signIn,
              internal: false,
              current: false,
            },
          ].map((item) => (
            <ChromeLink
              key={item.href}
              href={item.href}
              internal={item.internal}
              aria-current={item.current ? 'page' : undefined}
              {...('newTab' in item && item.newTab ? NEW_TAB : {})}
              className={cn(
                NAV_ITEM,
                'text-[17px]',
                item.current ? NAV_CURRENT : NAV_REST,
                'feature' in item && item.feature && LIVE_ITEM,
              )}
            >
              {'feature' in item && item.feature && LIVE_SQUARE}
              {item.label}
            </ChromeLink>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
