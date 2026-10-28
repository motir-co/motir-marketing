import { writeFileSync } from 'node:fs'
import { readSitemap } from '../support/sitemap'
import { expect, test } from '@playwright/test'
import {
  ALIAS_ORIGIN,
  BROKEN_ORIGIN,
  CUSTOM_ORIGIN,
  SITE_ORIGIN,
  TENANT_ORIGIN,
} from '../stub/origin'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR CUSTOMER-OWNED ADDRESSES (MOTIR-4226) — a visitor
 * arrives on a tenant subdomain and on a customer domain, reads the project,
 * follows links and STAYS on that host; a request on a non-primary address
 * lands on the primary. PACED FOR A PERSON TO WATCH.
 *
 * ⚠️ AMENDED BY MOTIR-9512 (Story MOTIR-4528, the address decision MOTIR-9790).
 * The bare workspace host now belongs to the workspace's default application
 * and serves no project: until an application exists it answers a
 * no-application page at its root and a 404 everywhere else. A retired name
 * answers the same 404 as an unknown host — nothing redirects any more.
 *
 * This is MOTIR-3878's public-half receipt, and it follows
 * `acceptance-public-project.spec.ts` exactly — same `beat()`, same measured
 * `chapter()` index, same reason: a reviewer watches the recording and accepts
 * the story on it, so the recorded path is deliberately slowed between steps.
 * Every `beat()` is PACING, not a wait for state; every assertion still waits on
 * an authoritative signal.
 *
 * ── ⚠️ FIVE HOSTS, ONE SERVER, NO `/etc/hosts` ────────────────────────────
 *
 * Chromium resolves every label under `.localhost` to loopback, so
 * `acme.localhost`, `roadmap.localhost`, `old.localhost` and `broken.localhost`
 * all reach the same standalone server with a DIFFERENT
 * `Host` header — which is the only thing `proxy.ts` reads. What each host IS is
 * decided by `e2e/stub/publicApiStub.ts`, so the whole address matrix is one
 * fixture table. `e2e/stub/origin.ts` owns the constants.
 *
 * ── ⚠️ THE PRIMARY IS A PROPERTY OF THE PROJECT, WHICH SHAPES THE FIXTURES ─
 *
 * `ROAD`'s primary is the customer domain, because one project cannot be
 * canonical at two addresses. That is also the trap this lane already sprang once: a tenant-host spec walking a
 * project whose primary is `motir.co` does not merely fail — the redirect sends
 * the browser to PRODUCTION, and it answers 200.
 */

test.setTimeout(180_000)

/**
 * Pacing for the recording. NOT a wait for state — see the header.
 *
 * ⚠️ 1.6s RATHER THAN `acceptance-public-project.spec.ts`'s 900ms, and it is a
 * MEASUREMENT rather than a preference. That walk has enough steps to run 18
 * seconds at 900ms; this one has eight, and at 900ms the chapter index showed
 * them ~1.1s apart — too fast to read a URL bar, which is the thing this
 * recording is about. Every landing here is "look at the address", so the beat
 * is longer.
 */
const beat = (page: import('@playwright/test').Page, ms = 1600) =>
  page.waitForTimeout(ms)

const chapters: { label: string; tSeconds: number }[] = []
const startedAt = Date.now()
const chapter = (label: string) => {
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

test.afterEach(({}, testInfo) => {
  writeFileSync(
    testInfo.outputPath('chapters.json'),
    JSON.stringify(chapters, null, 2),
  )
})

test('a project at its own address, as MOTIR-3878 asks to be accepted', async ({
  page,
}) => {
  // ── 1 · THE WORKSPACE'S OWN ADDRESS ─────────────────────────────────────
  chapter('Arrive on the workspace subdomain — no application yet')
  const arrival = await page.goto(`${TENANT_ORIGIN}/`)
  expect(arrival?.status(), 'the tenant host did not serve a document').toBe(
    200,
  )

  // The URL bar is UNCHANGED — a rewrite, not a redirect.
  expect(new URL(page.url()).host).toBe(new URL(TENANT_ORIGIN).host)
  await expect(
    page.getByRole('heading', { level: 1, name: 'No application here yet' }),
  ).toBeVisible()
  await expect(
    page.getByRole('main').getByText('moooon B.V.', { exact: true }),
  ).toBeVisible()
  // A placeholder, not content: a crawler is told not to keep it.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  )
  // It lists no projects — they live at motir.co/p/<identifier>.
  expect(
    await page.getByRole('main').locator('a[href]').count(),
    'the no-application page links no project',
  ).toBe(0)
  await beat(page)

  // ── 2 · A PROJECT PATH ON IT IS A 404 ───────────────────────────────────
  chapter('An old project link on the workspace subdomain is a 404')
  const oldLink = await page.goto(`${TENANT_ORIGIN}/ACME/changelog`)
  expect(oldLink?.status()).toBe(404)
  expect(oldLink?.request().redirectedFrom()).toBeNull()
  await expect(
    page.getByRole('heading', { level: 1, name: /isn’t here/ }),
  ).toBeVisible()
  await beat(page)

  // ── 3 · A CUSTOMER DOMAIN, WITH THE PROJECT AT ITS ROOT ─────────────────
  chapter('A customer domain serves one project at its root')
  const custom = await page.goto(`${CUSTOM_ORIGIN}/`)
  expect(custom?.status()).toBe(200)
  expect(new URL(page.url()).host).toBe(new URL(CUSTOM_ORIGIN).host)

  await expect(
    page.getByRole('navigation', { name: 'Project' }).getByRole('link', {
      name: 'Overview',
    }),
  ).toHaveAttribute('href', '/')

  // The canonical and `og:url` name the primary the fixture declares.
  // (The overview's canonical is the bare origin — no trailing slash.)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    CUSTOM_ORIGIN,
  )
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    CUSTOM_ORIGIN,
  )
  await beat(page)

  // ── 3 · A NON-PRIMARY ADDRESS LANDS ON THE PRIMARY ──────────────────────
  chapter('motir.co redirects to the primary, once it has moved')
  const moved = await page.goto(`${SITE_ORIGIN}/p/ROAD`)
  expect(page.url()).toBe(`${CUSTOM_ORIGIN}/`)
  // Asserted from the response CHAIN, not merely from where we ended up.
  const chain = moved?.request().redirectedFrom()
  expect(chain, 'no redirect happened at all').not.toBeNull()
  expect((await chain!.response())?.status()).toBe(308)
  await beat(page)

  // ── 4 · A RETIRED NAME STOPS ANSWERING ──────────────────────────────────
  // ADR §8 Amendment 3 rule 2. The stub still answers this host with the
  // retired `alias` payload, the case of a producer a version behind: the
  // router must 404 it like any unknown host, and redirect nowhere.
  chapter('A retired subdomain is a 404 — it redirects nowhere')
  const alias = await page.goto(`${ALIAS_ORIGIN}/ACME/changelog`)
  expect(alias?.status()).toBe(404)
  expect(alias?.request().redirectedFrom()).toBeNull()
  expect(new URL(page.url()).host).toBe(new URL(ALIAS_ORIGIN).host)
  await beat(page)
})

test('the crawl surface belongs to the host that asks for it', async ({
  request,
}) => {
  // ⚠️ ONE SENTENCE IS THE RULE: a sitemap may only list URLs on its own host.
  // A workspace host serves no project (MOTIR-9512), so its sitemap is empty.
  const tenant = await (
    await request.get(`${TENANT_ORIGIN}/sitemap.xml`)
  ).text()
  expect(tenant).not.toContain('<loc>')

  const custom = await (
    await request.get(`${CUSTOM_ORIGIN}/sitemap.xml`)
  ).text()
  expect(custom).toContain(`${CUSTOM_ORIGIN}/</loc>`)
  expect(custom).not.toContain(`${CUSTOM_ORIGIN}/board</loc>`)
  expect(custom).not.toContain('ACME')

  const site = await readSitemap(request, SITE_ORIGIN)
  expect(site).toContain('https://motir.co/p/MOTIR</loc>')
  expect(site).not.toContain('ACME')
  expect(site).not.toContain('ROAD')

  for (const origin of [TENANT_ORIGIN, CUSTOM_ORIGIN]) {
    const txt = await (await request.get(`${origin}/robots.txt`)).text()
    expect(txt).toContain(`${origin}/sitemap.xml`)
    expect(txt).not.toContain('motir.co')
  }
})

test('the three states a tenant address can be in', async ({ page }) => {
  // NO APPLICATION — a live workspace host with nothing deployed (MOTIR-9512).
  // It is a real state, not a 404: the address is real.
  const live = await page.goto(`${TENANT_ORIGIN}/`)
  expect(live?.status()).toBe(200)
  await expect(page.getByText('No application here yet')).toBeVisible()

  // ERROR — the contract is unreachable. ⚠️ NEVER a 404: a crawler acts on a
  // 404 and would drop every customer's domain the moment app.motir.co
  // restarted.
  const broken = await page.goto(`${BROKEN_ORIGIN}/`)
  expect(broken?.status()).toBe(200)
  // Scoped to the landmark: Next's own route announcer is also `role="alert"`.
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await expect(page.getByText(/could not load/i)).toBeVisible()

  // NOT FOUND — a host nobody has claimed. This one IS a 404, and the status is
  // asserted as well as the words: a 404 page served with a 200 is what a
  // `loading.tsx` above a route that decides existence produces.
  const unknown = await page.goto('http://stranger.localhost:4318/')
  expect(unknown?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { level: 1, name: /isn’t here/ }),
  ).toBeVisible()
})
