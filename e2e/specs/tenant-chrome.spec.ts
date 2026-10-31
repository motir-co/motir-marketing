import { expect, test, type Page } from '@playwright/test'
import {
  BROKEN_ORIGIN,
  SITE_ORIGIN,
  SITE_PORT,
  TENANT_ORIGIN,
} from '../stub/origin'

/*
 * THE CHROME ON A TENANT HOST (MOTIR-4372) — the half no jsdom test can reach.
 *
 * `tests/host/chromeLinks.test.tsx` asks the DOM what the chrome EMITS on each
 * host kind. This asks a browser what the network actually DID, which is the
 * only place two of the card's criteria live:
 *
 *   • A 404 is a property of a request, not of a string. The bug's own evidence
 *     was `hey.motir.site/explore → 404`, and nothing that renders markup can
 *     observe that.
 *   • The costly half was never a click at all. `/explore`, `/docs` and
 *     `/design` were same-origin `next/link`s, so Next RSC-PREFETCHED all three
 *     ON RENDER — three 404s per tenant page load, before the visitor touched
 *     anything. A prefetch is invisible in the DOM and invisible in a snapshot;
 *     it exists only as a request.
 *
 * ⚠️ ASSERTED AS A COUNT, NOT AS THE ABSENCE OF THREE URLS — the card says so in
 * terms, and it is the difference between a guard and a fixture. A fourth site
 * link added to the chrome next year is covered by these assertions the day it
 * is added; a list of three would report green about it for ever.
 */

/** The marketing paths this site serves and a tenant host does not. */
const MARKETING_PATHS = ['/explore', '/docs', '/design', '/legal']

/** Every response at 400 or above, as `status url`, for a legible diff. */
function recordFailures(page: Page): string[] {
  const seen: string[] = []
  page.on('response', (res) => {
    if (res.status() >= 400) seen.push(`${res.status()} ${res.url()}`)
  })
  return seen
}

/** Every distinct HOST the page reached, in the order first reached. */
function recordHosts(page: Page): string[] {
  const seen: string[] = []
  page.on('request', (req) => {
    const host = new URL(req.url()).host
    if (!seen.includes(host)) seen.push(host)
  })
  return seen
}

/**
 * Load, then let the page finish being a page.
 *
 * ⚠️ THE WAIT IS THE MEASUREMENT HERE, not pacing. A prefetch is issued after
 * hydration, so a spec that asserted at `load` would observe the exact request
 * set the bug did not produce and pass with the defect present. `networkidle`
 * is the obvious instrument and is the one Playwright warns against — on an app
 * that polls it never settles, and the failure is a timeout that reads like a
 * broken page. A bounded settle says the same thing and can only ever be
 * over-generous: everything here is served by a standalone Next server on
 * loopback.
 */
async function loadAndSettle(page: Page, url: string) {
  const response = await page.goto(url)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
  return response
}

/** Every href in the served document. */
function hrefsOf(page: Page): Promise<string[]> {
  return page
    .locator('a[href]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')!))
}

/*
 * ⚠️ THE IDENTIFIERS ARE THE FIXTURE'S, AND THEY ARE NOT `MOTIR`.
 * `host-project.json` puts `ROAD` at the customer domain's root — while every
 * `/p/*` URL in `e2e/routes.ts` uses `MOTIR`, which is the SITE host's fixture.
 * A tenant URL naming `MOTIR` is a 404, and it renders the 404 room inside this
 * same chrome — so the assertions below still find a page, still find links,
 * and fail on the room's own relative Explore door instead of on the defect.
 * The `expect(status).toBe(200)` in each test is what keeps that mistake
 * legible rather than mysterious.
 *
 * The workspace host serves no project since MOTIR-9512, so its row walks the
 * page it does serve: the no-application page at its root, in the same chrome.
 * The customer-domain row is gone with MOTIR-9528 (Story MOTIR-4533): a
 * customer's own domain is answered at Motir's edge, and this site serves it
 * only the 404 room.
 */
for (const [label, url] of [
  ['a workspace subdomain', `${TENANT_ORIGIN}/`],
] as const) {
  test(`${label} — its page takes ZERO responses at 400 or above`, async ({
    page,
  }) => {
    const failures = recordFailures(page)

    const response = await loadAndSettle(page, url)
    expect(response?.status(), 'the tenant host did not serve a document').toBe(
      200,
    )

    expect(failures, failures.join('\n')).toEqual([])
  })

  test(`${label} — makes NO request off this host, which is what stops the prefetch`, async ({
    page,
  }) => {
    /*
     * ⚠️ THE PREFETCH ASSERTION, WRITTEN AS A HOST TEST, because a host is what
     * Next actually keys on: a `next/link` whose href is cross-origin is not
     * prefetched and not client-routed. That is why the fix makes these links
     * ABSOLUTE rather than merely correct — a relative-but-right href would
     * still be prefetched.
     *
     * It is also this lane's own standing rule, applied. `e2e/stub/origin.ts`
     * records what it cost the last time a spec here reached outside the
     * fixture: the suite was making cross-repository network calls on every
     * pull request and 43 of 44 specs stayed green. The chrome's links now name
     * `https://motir.co`, so a page that prefetched one would fetch PRODUCTION
     * from CI, and this is what says it does not.
     */
    const hosts = recordHosts(page)

    await loadAndSettle(page, url)

    expect(hosts, hosts.join(', ')).toEqual([new URL(url).host])
  })

  test(`${label} — every chrome link leaves for the site or stays on this host`, async ({
    page,
  }) => {
    // The card's second criterion, run against the SERVED document rather than
    // a rendered component — `curl … | grep -oE 'href="[^"]*"'`, with the grep
    // expressed as an assertion.
    const response = await page.goto(url)
    // ⚠️ FIRST, and it is not ceremony: the 404 room wears this same chrome, so
    // a URL the fixture cannot serve produces a page that passes the link count
    // and fails on the room's own Explore door — a diagnosis pointing at the
    // product for a mistake in this line.
    expect(response?.status(), 'the tenant host did not serve a document').toBe(
      200,
    )
    const hrefs = await hrefsOf(page)

    // A guard on the guard: a page that rendered no chrome would satisfy every
    // assertion below vacuously.
    expect(hrefs.length).toBeGreaterThan(10)

    for (const href of hrefs) {
      if (href.startsWith('#')) continue
      if (!href.startsWith('/')) {
        // Absolute, and on a host that is deliberately not this one: motir.co's
        // own pages, the app doors, the source repository.
        expect(() => new URL(href)).not.toThrow()
        continue
      }
      // A root-relative href on a tenant host is that PROJECT's own path —
      // `publicPathFor`'s output — and never one of this site's pages.
      for (const path of MARKETING_PATHS) {
        expect(
          href === path || href.startsWith(`${path}/`),
          `${href} is served by motir.co alone and 404s on ${new URL(url).host}`,
        ).toBe(false)
      }
    }
  })
}

test('the SITE keeps the relative chrome it has always had', async ({
  page,
}) => {
  /*
   * The control, and the card's fifth criterion: the fix is a no-op on
   * `motir.co`. Without this, "no relative marketing path on a tenant host"
   * would be satisfiable by making every link absolute EVERYWHERE — which costs
   * this site its client routing and adds an origin hop to every nav click,
   * while turning both assertions above green.
   */
  const failures = recordFailures(page)

  await loadAndSettle(page, `${SITE_ORIGIN}/p/MOTIR`)
  const hrefs = await hrefsOf(page)

  for (const path of ['/', ...MARKETING_PATHS]) {
    expect(hrefs, `${path} is no longer relative on the site`).toContain(path)
  }
  expect(hrefs.filter((h) => h.startsWith('https://motir.co'))).toEqual([])
  expect(failures, failures.join('\n')).toEqual([])
})

/*
 * ⚠️ THE ROUTER'S OWN TWO LANDING PADS (MOTIR-4430) — the surfaces MOTIR-4372
 * could not reach.
 *
 * That card made the chrome ask which host it is on, and every surface that
 * could answer did. These two could not: `proxy.ts` reached them through a
 * `rewriteTo` helper that forwarded no headers at all, so the page was told it
 * was on `motir.co` and was right to believe it. The reproduction on the live
 * deployment was `hey.motir.site/explore` — a 404 room offering six doors, all
 * six of them 404s where the visitor was standing.
 *
 * ⚠️ AND THE ROOM'S OWN DOORS ARE THE HALF THE TESTS ABOVE CANNOT SEE.
 * `Explore projects` and `Go to the homepage` live inside `<main>`, not in the
 * chrome, and they were the two links a lost visitor is most likely to click —
 * so `hrefsOf` is read over the WHOLE document here rather than over the bar
 * and the footer alone.
 *
 * ⚠️ THE TWO SURFACES ANSWER FOR DIFFERENT REASONS, and the assertions cannot
 * tell them apart — which is the point. `/host-unavailable` is an ordinary
 * route and READS the request, so it knows it is on an `unresolved` host. The
 * 404 room may not read anything: `app/not-found.tsx` is the GLOBAL not-found
 * boundary, so a `headers()` read there makes the entire site dynamic
 * (measured). It links absolutely on every host instead. Both end up emitting
 * the same thing, and this spec asks for the emission rather than the mechanism.
 *
 * The base-domain branch (`host === TENANT_DOMAIN`) has no instance in this
 * lane, and that is a property of the lane rather than a gap: the configured
 * base domain here is `localhost`, which the router steps aside for as a LOCAL
 * host before it ever reaches that branch. `tests/host/hostRouter.test.ts`
 * covers it against the production value, with the base domain stubbed for
 * exactly that reason.
 */
const STRANGER_ORIGIN = `http://stranger.localhost:${SITE_PORT}`

for (const [label, url, status] of [
  // A RESOLVED workspace host serving a path it does not have — the branch
  // the card's reproduction takes, and the one where the router
  // already held the answer and simply did not pass it on.
  ['the 404 room on a resolved tenant host', `${TENANT_ORIGIN}/explore`, 404],
  // A host the contract does not know: `unresolved`, and still not this site.
  ['the 404 room on an unresolved host', `${STRANGER_ORIGIN}/`, 404],
  // The OUTAGE. ⚠️ NEVER a 404, and the case that decided the fourth kind: it
  // renders precisely when a real customer's domain is up and `app.motir.co` is
  // restarting.
  ['the host-unavailable page', `${BROKEN_ORIGIN}/`, 200],
] as const) {
  test(`${label} — every site path is absolute, none root-relative`, async ({
    page,
  }) => {
    const response = await page.goto(url)
    expect(response?.status(), `${url} did not answer ${status}`).toBe(status)

    const hrefs = await hrefsOf(page)
    // A guard on the guard: a page that rendered no chrome at all would satisfy
    // everything below vacuously.
    expect(hrefs.length).toBeGreaterThan(10)

    for (const href of hrefs) {
      if (href.startsWith('#')) continue
      if (!href.startsWith('/')) {
        expect(() => new URL(href)).not.toThrow()
        continue
      }
      /*
       * ⚠️ ASSERTED OVER EVERY ROOT-RELATIVE HREF, not against the list of six.
       * These pages are served on hosts that have no `motir.co` pages at all —
       * unlike a tenant PROJECT page, where a root-relative href is that
       * project's own path — so ANY of them is wrong here whatever it spells,
       * including one added after this spec was written. The only ones allowed
       * are the document's own assets, which this host does serve.
       */
      expect(
        href.startsWith('/_next/') ||
          href.startsWith('/favicon') ||
          href.startsWith('/icon') ||
          href.startsWith('/apple-icon'),
        `${href} is served by motir.co alone and 404s on ${new URL(url).host}`,
      ).toBe(true)
    }
  })
}

test('the 404 room on a tenant host makes NO request off that host', async ({
  page,
}) => {
  /*
   * The prefetch half, on the room rather than on the chrome. Before this card
   * the room's `Explore projects` door was a same-origin `next/link` to
   * `/explore`, so Next RSC-PREFETCHED it ON RENDER — a 404 fetched on every
   * arrival at a 404, on the one page a lost visitor lands on. Making the href
   * absolute is only half of the fix; the element has to stop being a
   * `next/link`, which is `ChromeLink`'s whole job, and a request log is the
   * only place the difference is observable.
   *
   * It is also what keeps this lane hermetic now that the room's doors name
   * `https://motir.co`: a page that prefetched one would fetch PRODUCTION from
   * CI, and this is what says it does not.
   */
  const hosts = recordHosts(page)

  const url = `${TENANT_ORIGIN}/explore`
  const response = await page.goto(url)
  expect(response?.status()).toBe(404)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)

  expect(hosts, hosts.join(', ')).toEqual([new URL(url).host])
})

test('the SITE’s own 404 room pays the ONE cost this fix has', async ({
  page,
}) => {
  /*
   * ⚠️ THIS IS THE REGRESSION MOTIR-4430 ACCEPTED, ASSERTED RATHER THAN LEFT TO
   * BE DISCOVERED — and it is the half of that card's fifth criterion that
   * could not be kept.
   *
   * The criterion asked for two things about `motir.co`'s own 404 room: the
   * same `○ (Static)` in the route table, and the relative hrefs it has always
   * had. They turned out to be incompatible. Reading the request in
   * `app/not-found.tsx` — the only way to tell `motir.co` from a tenant host
   * there — is what costs the `○`, and it costs it for the WHOLE SITE, because
   * that file is the global not-found boundary. So the room links absolutely on
   * every host, and this page keeps its prerender.
   *
   * What that costs, exactly: leaving the room on `motir.co` is a document load
   * rather than a client transition. The destination is unchanged. Nothing else
   * on the site moved — `e2e/specs/landmark.spec.ts` still walks every route,
   * and the test above this one still asserts the site's PROJECT chrome is
   * relative.
   */
  const failures = recordFailures(page)

  await loadAndSettle(page, `${SITE_ORIGIN}/no-such-page`)
  const hrefs = await hrefsOf(page)

  // Absolute, and every one of them on ONE origin — the site's own.
  const absolute = hrefs.filter((h) => h.startsWith('https://motir.co'))
  expect(absolute.length).toBeGreaterThan(5)
  for (const path of ['/', ...MARKETING_PATHS]) {
    expect(hrefs, `${path} is no longer reachable from the room`).toContain(
      `https://motir.co${path === '/' ? '/' : path}`,
    )
  }

  /*
   * ⚠️ AND NOTHING FETCHED ONE. The doors are plain `<a>`s, so an absolute href
   * pointing at production costs a click and never a prefetch — which is what
   * keeps this spec from reaching the live site.
   *
   * The DOCUMENT is excluded because it is supposed to be a 404: that is the
   * page under test. Everything else at 400 or above is a real failure, and a
   * prefetched `https://motir.co/explore` from CI would land in this list.
   */
  const unexpected = failures.filter(
    (f) => !f.endsWith(`${SITE_ORIGIN}/no-such-page`),
  )
  expect(unexpected, unexpected.join('\n')).toEqual([])
})
