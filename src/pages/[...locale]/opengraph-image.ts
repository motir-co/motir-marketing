import type { APIRoute } from 'astro'
import { renderLocaleShareCard } from '@/app/_brand/localeShareCard'
import { localeStaticPaths, pageLocale } from '@/lib/staticPaths'

/*
 * The landing's share card, one PNG per locale, drawn once by `astro build`
 * (MOTIR-10647): `/opengraph-image` for English, `/<locale>/opengraph-image`
 * for the other eleven — the addresses `siteCard` advertises. The file has no
 * extension, so `public/_headers` serves it as `image/png`.
 */
export const prerender = true

export const getStaticPaths = localeStaticPaths

export const GET: APIRoute = async ({ params }) =>
  new Response(await renderLocaleShareCard(pageLocale(params)), {
    headers: { 'Content-Type': 'image/png' },
  })
