import Link from 'next/link'
import { ChromeLink } from './ChromeLink'
import { type Copy, format, useCopy, usePageLocale } from '@/lib/copy'
import {
  DOCS,
  EXPLORE,
  IDEAS,
  MOTIR_BUILDS_ITSELF,
  HOW_IT_WORKS,
  HOW_TO_USE,
  PRICE,
  FREE_DOOR,
  LEGAL_INDEX,
  LEGAL_PRIVACY,
  LEGAL_TERMS,
  SIGN_IN,
  SITE_ROOT,
  SOURCE_REPO,
} from '@/lib/destinations'
import { siteLinkFor, type PublicHost } from '@/lib/publicHost'
import { BrandTile } from './BrandTile'

/*
 * The footer — the `ExploreFooter` four-column shape: the brand column plus
 * Product / Resources / Legal, then the legal strip.
 *
 * ⚠️ EVERY ITEM HERE RESOLVES, AND THE ONES THAT DO NOT ARE ABSENT RATHER THAN
 * DRAWN AS LABELS. The design asset's own footer sketches `Overview`,
 * `Pricing`, `Blog`, `About` and `Contact` as plain text for pages that do not
 * exist yet. This ships the rule the same asset applies ONE SECTION UP, where
 * it drops `Product` and `Pricing` from the nav because they "render as dead
 * text there and are simply absent here" — and it means the footer needs no
 * copy MOTIR-1144 did not write. When those pages land they arrive with their
 * own strings and their own links.
 *
 * MOTIR-1144's catalogue supplies exactly these nine items and three headings;
 * the mapping below spends all of them and invents none.
 */

/*
 * ⚠️ `site: true` MARKS A LINK TO ONE OF THIS SITE'S OWN PAGES, and it is the
 * whole of MOTIR-4372 down here. Every one of these five was a root-relative
 * path emitted identically on every host the chrome is worn on — and a tenant
 * host serves that workspace's projects and nothing else, so `/explore`,
 * `/docs` and all three legal paths were 404s in the footer of every customer's
 * page. `siteLinkFor` spells them absolutely off the site and leaves them
 * exactly as they are on it.
 *
 * The three that are NOT marked are already absolute and already on another
 * host — the two `APP_ORIGIN` doors and the GitHub repository — so there is
 * nothing per-host to decide about them.
 */
const columnsFor = (copy: Copy) =>
  [
    {
      heading: copy.footer.productHeading,
      items: [
        { href: HOW_IT_WORKS, label: copy.footer.howItWorks, site: true },
        { href: HOW_TO_USE, label: copy.footer.howToUse, site: true },
        { href: PRICE, label: copy.footer.price, site: true },
        { href: FREE_DOOR, label: copy.footer.startFree },
        { href: SIGN_IN, label: copy.footer.signIn },
      ],
    },
    {
      heading: copy.footer.resourcesHeading,
      items: [
        { href: EXPLORE, label: copy.footer.explore, site: true },
        { href: IDEAS, label: copy.footer.ideas, site: true },
        {
          href: MOTIR_BUILDS_ITSELF,
          label: copy.footer.buildsItself,
          site: true,
        },
        { href: DOCS, label: copy.footer.docs, site: true },
        { href: SOURCE_REPO, label: copy.footer.github },
      ],
    },
    {
      heading: copy.footer.legalHeading,
      items: [
        { href: LEGAL_PRIVACY, label: copy.footer.privacy, site: true },
        { href: LEGAL_TERMS, label: copy.footer.terms, site: true },
        { href: LEGAL_INDEX, label: copy.footer.legalIndex, site: true },
      ],
    },
  ] as const

export function SiteFooter({ host }: { host: PublicHost }) {
  const copy = useCopy()
  const locale = usePageLocale()
  return (
    <footer
      aria-label={copy.footer.ariaLabel}
      className="grid gap-8 border-t border-(--el-border) bg-(--el-surface-soft) px-4 py-10 sm:grid-cols-2 sm:px-(--spacing-card-padding) lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
    >
      <div>
        {/* motir.co's own root — internal ON THE SITE, and an absolute link
            home from a tenant host, where `/` is that workspace's or that
            project's root rather than ours (MOTIR-4372). The old comment called
            it "the ONE internal link in the footer", which was a statement about
            the host it was written on. Every destination that is a different
            ORIGIN is a plain `<a>`. */}
        {host.kind === 'site' ? (
          <Link
            href={siteLinkFor(host, SITE_ROOT, locale)}
            aria-label={copy.nav.brandAriaLabel}
            className="inline-flex"
          >
            <BrandTile size={22} />
          </Link>
        ) : (
          <a
            href={siteLinkFor(host, SITE_ROOT, locale)}
            aria-label={copy.nav.brandAriaLabel}
            className="inline-flex"
          >
            <BrandTile size={22} />
          </a>
        )}
        <p className="mt-2.5 max-w-[30rem] text-[13px] leading-relaxed text-(--el-text-secondary)">
          {copy.footer.tagline}
        </p>
        <p className="mt-2 max-w-[30rem] text-[13px] leading-relaxed text-(--el-text-secondary)">
          {copy.footer.openSource}
        </p>
      </div>

      {columnsFor(copy).map((column) => (
        <div key={column.heading}>
          <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.04em] text-(--el-text-secondary) uppercase">
            {column.heading}
          </h2>
          <ul className="flex list-none flex-col gap-1.5 p-0">
            {column.items.map((item) => (
              <li key={item.href}>
                {/* A page of this site is a client navigation, so the look a
                    visitor picked on /design stays on for the visit; a
                    full-page load would start it over (Yue, 2026-10-09). */}
                <ChromeLink
                  href={
                    'site' in item && item.site
                      ? siteLinkFor(host, item.href, locale)
                      : item.href
                  }
                  internal={
                    'site' in item && !!item.site && host.kind === 'site'
                  }
                  className="text-[13px] text-(--el-text-secondary) hover:text-(--el-link) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)"
                >
                  {item.label}
                </ChromeLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/*
       * ⚠️ `--el-text-secondary`, NOT `--el-text-muted` (MOTIR-3984). This strip
       * sits on the footer's own `--el-surface-soft` band with no `Card` between
       * it and that fill, and the muted ink on that band is **4.34:1** in light
       * Amethyst — under the 4.5:1 WCAG 1.4.3 asks of 12px text. Amethyst was
       * the palette a first-time visitor was served until MOTIR-6616 moved the
       * default to the monochrome Motir palette (5.75:1 there), and it is still
       * one pick away on `/design`, so the rule holds for every page. `theme.css`
       * states the figure at the token's own declaration and adds the rule in
       * its own words: "a muted caption belongs inside a card, never on a panel"
       * (MOTIR-2455). Secondary on the same band is what the rest of this footer
       * already uses, and it is what `design/marketing/` draws.
       */}
      <div className="col-span-full border-t border-(--el-border) pt-4 text-[12px] text-(--el-text-secondary)">
        {/*
         * ⚠️ The year is computed on the SERVER, at render. This page is
         * statically rendered, so it is the BUILD's year rather than the
         * reader's — which is the honest trade for a legal strip: a client-side
         * `new Date()` would differ between the server HTML and the first
         * client render and hydrate-mismatch on every New Year's Eve, for a
         * line nobody reads. A redeploy refreshes it.
         */}
        {format(copy.footer.copyright, { year: new Date().getFullYear() })} ·{' '}
        {copy.footer.entity}
      </div>
    </footer>
  )
}
