import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { SITE_HTML_CLASS } from '@/app/_components/SiteDocument'
import { siteMetadata } from '@/app/_components/siteMetadata'
import { LOCALE_BCP47, type Locale } from '@/i18n/routing'
import { AppOriginProvider } from '@/lib/appOriginContext'
import { clientCopy, getCopy, type Copy } from '@/lib/copy'
import { ISLAND_TAG, PAGE_CONTEXT_ID } from '@/lib/islands'
import {
  escapeHtml,
  headTags,
  resolveMetadata,
  type Metadata,
} from '@/lib/metadata'
import { PageRoot } from '@/lib/pageRoot'
import { serializeJsonForScript } from '@/lib/scriptJson'
import {
  clearStoredAppearanceScript,
  siteAppearanceAttributes,
} from '@/lib/siteDefaults'
import type { Env } from '../env'
import { readShell, type AssetShell } from './shell'

/*
 * THE DOCUMENT A WORKER-RENDERED PAGE IS (MOTIR-10753).
 *
 * The per-request twin of `src/layouts/SitePage.astro`, which writes every
 * built page: the same `<html>` attributes, the same head in the same order
 * (`lib/metadata.ts` resolves the site's layer and the page's), the same one
 * React root in `<body>` (`lib/pageRoot.tsx`) and the same page-context block
 * the islands hydrate from. The hashed stylesheet, fonts and island script are
 * the build's own, read from it (`./shell.ts`). The live routes (`/p/**`,
 * `/explore`, `/ideas`, `/motir-builds-itself`) all render through here, so
 * a live page cannot drift from a built one.
 *
 * Two things differ, both because the page is rendered per request: the app
 * origin comes from the Worker's variable (`lib/appOriginContext.tsx`), and
 * the island script is linked only when the page has an island, so a page
 * with no interactive piece ships no hydration script.
 */

/** Next's header for a dynamic page, which the live routes were. */
export const DYNAMIC_CACHE_CONTROL =
  'private, no-cache, no-store, max-age=0, must-revalidate'

export interface PageRender {
  env: Env
  url: URL
  locale: Locale
  /** The page's metadata layers, outermost first, after the site's own. */
  metadata: ReadonlyArray<Metadata | undefined>
  /** The page, inside the site body; it renders with the page context. */
  body: ReactNode
  status?: number
  /** Replaces the dynamic `Cache-Control` when a route caches. */
  cacheControl?: string
}

function htmlAttributes(locale: Locale): string {
  const attributes: Record<string, string> = {
    lang: LOCALE_BCP47[locale],
    class: SITE_HTML_CLASS,
    ...siteAppearanceAttributes,
  }
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(' ')
}

function headHtml(shell: AssetShell, meta: Metadata): string {
  return [
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    ...shell.fontPreloads.map(
      (href) =>
        `<link rel="preload" href="${escapeHtml(href)}" as="font" type="font/woff2" crossorigin=""/>`,
    ),
    ...headTags(meta),
    '<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16"/>',
    '<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any"/>',
    '<link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180"/>',
    `<script>${clearStoredAppearanceScript}</script>`,
    ...shell.stylesheets.map(
      (href) => `<link rel="stylesheet" href="${escapeHtml(href)}"/>`,
    ),
  ].join('')
}

function bodyHtml(input: PageRender, copy: Copy, shell: AssetShell): string {
  const value = { locale: input.locale, copy, pathname: input.url.pathname }
  const Page = () => input.body
  const root = renderToString(
    <AppOriginProvider value={input.env.MOTIR_APP_ORIGIN}>
      <PageRoot
        value={value}
        page={Page}
        params={Promise.resolve({ locale: input.locale })}
      />
    </AppOriginProvider>,
  )
  const context = serializeJsonForScript({ ...value, copy: clientCopy(copy) })
  const hydrate = root.includes(`<${ISLAND_TAG}`)
    ? shell.scripts.map(
        (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
      )
    : []
  return [
    root,
    `<script type="application/json" id="${PAGE_CONTEXT_ID}">${context}</script>`,
    ...hydrate,
  ].join('')
}

/** Render one page the way the build renders every page, as a Response. */
export async function renderPage(input: PageRender): Promise<Response> {
  const [copy, shell] = await Promise.all([
    getCopy(input.locale),
    readShell(input.env, input.url),
  ])
  const meta = resolveMetadata(
    siteMetadata(input.locale, copy),
    ...input.metadata,
  )
  const html = `<!doctype html><html ${htmlAttributes(input.locale)}><head>${headHtml(shell, meta)}</head><body>${bodyHtml(input, copy, shell)}</body></html>`
  return new Response(html, {
    status: input.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': input.cacheControl ?? DYNAMIC_CACHE_CONTROL,
    },
  })
}
