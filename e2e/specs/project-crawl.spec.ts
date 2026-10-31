import { expect, test } from '@playwright/test'
import { CUSTOM_ORIGIN, TENANT_ORIGIN } from '../stub/origin'
import { readSitemap } from '../support/sitemap'

/*
 * The CRAWL SURFACE (MOTIR-4118) — everything on /p/* that a machine consumes.
 *
 * ⚠️ THESE ARE THE ASSERTIONS WITH NO HUMAN WATCHING. A broken feed unsubscribes
 * people silently; a sitemap that drops its project pages costs the crawl budget
 * of the whole site; a missing OG card makes every shared link look dead. None
 * of the three is visible from a page that renders correctly.
 */

test('the Atom feed serves at the EXACT path the redirect produces', async ({
  request,
}) => {
  // `motir-core`'s proxy 308s `/p/:path*` to the same path here, so
  // `app.motir.co/p/MOTIR/changelog.xml` lands on THIS url or nowhere. A feed
  // URL is copied into a reader and outlives every redirect we would regret.
  const res = await request.get('/p/MOTIR/changelog.xml')

  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('application/atom+xml')
})

test('the feed body is the producing endpoint’s, forwarded unchanged', async ({
  request,
}) => {
  // Re-serialising it here would put the ESCAPING — the one thing in the
  // builder that must be right, because an unescaped ampersand makes a reader
  // reject the whole feed rather than one entry — in two repositories, guarded
  // once. The ampersand in the stub's title is the tell.
  const body = await (await request.get('/p/MOTIR/changelog.xml')).text()

  expect(body).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
  expect(body).toContain('Motir &amp; friends')
  // The links inside already name the public origin, because the producer builds
  // them from its own configured public origin.
  expect(body).toContain('https://motir.co/p/MOTIR/changelog.xml')
})

test('the feed 404s for a project that is not public — and NOT for an outage', async ({
  request,
}) => {
  // A reader that receives a 404 unsubscribes; one that receives a 503 retries.
  // The stub has no fixture for NOPE, so its 404 is the API saying so.
  const res = await request.get('/p/NOPE/changelog.xml')
  expect(res.status()).toBe(404)
})

test('the sitemap lists every project whose CANONICAL is this host — its page and changelog', async ({
  request,
}) => {
  const xml = await readSitemap(request)

  expect(xml).toContain('https://motir.co/p/MOTIR</loc>')
  expect(xml).toContain('https://motir.co/p/MOTIR/changelog</loc>')
  // MOTIR-6743 — no read page: those are redirects into the app now.
  for (const view of ['board', 'items', 'tree', 'roadmap']) {
    expect(xml).not.toContain(`/p/MOTIR/${view}</loc>`)
  }
  // The static entries survive alongside them.
  expect(xml).toContain('https://motir.co/explore</loc>')
  expect(xml).toContain('https://motir.co/legal</loc>')
})

test('and OMITS one whose canonical has moved to a tenant host', async ({
  request,
}) => {
  // ⚠️ THIS ASSERTION USED TO BE ITS OPPOSITE, and the change is the card
  // (MOTIR-4222). `ROAD`'s primary is `roadmap.localhost` in the stub's index,
  // and a sitemap may only list URLs on its OWN host — so the project
  // disappears from here and appears in that host's sitemap, which the test
  // below walks. Listing it in both is the duplication *make primary* exists to
  // prevent; listing it in neither loses it.
  const xml = await readSitemap(request)

  expect(xml).not.toContain('/p/ROAD')
})

test('a customer domain has no sitemap here — it is not this site’s', async ({
  request,
}) => {
  // MOTIR-9528 (Story MOTIR-4533): a customer's own domain belongs to its
  // workspace's application, answered at Motir's edge, so this site lists
  // nothing for it — its `/sitemap.xml` is the one 404 room.
  const res = await request.get(`${CUSTOM_ORIGIN}/sitemap.xml`)

  expect(res.status()).toBe(404)
  expect(await res.text()).not.toContain('<loc>')
})

test('a workspace host’s sitemap lists nothing — it serves no project', async ({
  request,
}) => {
  // MOTIR-9512: the bare workspace host belongs to the default application.
  const xml = await (await request.get(`${TENANT_ORIGIN}/sitemap.xml`)).text()
  expect(xml).not.toContain('<loc>')
})

test('and its robots.txt names ITS OWN sitemap', async ({ request }) => {
  const txt = await (await request.get(`${TENANT_ORIGIN}/robots.txt`)).text()

  expect(txt).toContain(`${TENANT_ORIGIN}/sitemap.xml`)
  expect(txt).not.toContain('motir.co/sitemap.xml')
})

test('the sitemap does NOT list the noindex hand-off doorway', async ({
  request,
}) => {
  // A sitemap that listed `/requests/new` would ask a crawler to index a page
  // that refuses to be indexed — a contradiction the crawler resolves against us.
  const xml = await readSitemap(request)

  expect(xml).not.toContain('/requests/new')
})

test('robots allows /p/*', async ({ request }) => {
  const txt = await (await request.get('/robots.txt')).text()

  expect(txt).toContain('Allow: /')
  expect(txt.toLowerCase()).not.toContain('disallow: /p')
})

test('a project serves its OWN OpenGraph card, and the page points at it', async ({
  page,
  request,
}) => {
  await page.goto('/p/MOTIR')

  const ogImage = await page
    .locator('meta[property="og:image"]')
    .first()
    .getAttribute('content')
  expect(ogImage, 'the page declares no og:image').toBeTruthy()
  expect(ogImage).toContain('/p/MOTIR/opengraph-image')

  // ⚠️ FETCHED, not merely declared. A metadata image route that 200s while the
  // page carries no tag, and a tag pointing at a route that errors, are both
  // states this repository has shipped before (MOTIR-3491).
  //
  // ⚠️ AND FETCHED AT ITS PATH, not at the tag's value. `og:image` is ABSOLUTE
  // and names the production origin (`SITE_ORIGIN`) — which is correct, and is
  // the whole point of the move — so requesting the tag verbatim would leave
  // this server and hit the real motir.co. The path is what this build serves.
  const imagePath =
    new URL(ogImage as string).pathname + new URL(ogImage as string).search
  const image = await request.get(imagePath)
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toContain('image/png')
  expect((await image.body()).byteLength).toBeGreaterThan(5_000)
})
