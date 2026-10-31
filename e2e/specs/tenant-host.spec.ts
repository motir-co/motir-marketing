import { expect, test } from '@playwright/test'
import { CUSTOM_ORIGIN, SITE_ORIGIN, TENANT_ORIGIN } from '../stub/origin'

/*
 * THE TENANT HOST, IN A REAL BROWSER (MOTIR-4220's fifth criterion).
 *
 * ⚠️ WHAT THIS SPEC IS FOR, said plainly: it proves the HARNESS is reachable.
 * The card asks for "a spec that walks `acme.localhost:<port>`… proving the
 * tenant-host harness is reachable", and that is a real deliverable rather than
 * a token one — `e2e/specs/acceptance-public-project.spec.ts` and MOTIR-4226's
 * work both need a tenant host to walk, and until one request has actually
 * arrived on `acme.localhost` with the router in the loop, nobody knows whether
 * the lane CAN address a second host at all. The routing logic itself is
 * covered exhaustively in `tests/host/`, over a stubbed contract; this is the
 * half those cannot do — the `Host` header a real browser sends, the rewrite
 * Next actually performs, and the status code on the wire.
 *
 * Every wait is on an authoritative signal, per the lane's discipline.
 */

test('a workspace host answers the no-application page at its root', async ({
  page,
}) => {
  const response = await page.goto(`${TENANT_ORIGIN}/`)

  expect(
    response?.status(),
    'the tenant host did not serve a document — is the router matching?',
  ).toBe(200)

  // The URL BAR IS UNCHANGED. A rewrite, not a redirect.
  expect(new URL(page.url()).host).toBe(new URL(TENANT_ORIGIN).host)

  // MOTIR-9512: the bare workspace host belongs to the default application;
  // until one exists it says so, naming the workspace the CONTRACT supplied.
  await expect(
    page.getByRole('heading', { level: 1, name: 'No application here yet' }),
  ).toBeVisible()
  // ⚠️ SCOPED TO THE LANDMARK. The footer's copyright names the same company.
  await expect(
    page.getByRole('main').getByText('moooon B.V.', { exact: true }),
  ).toBeVisible()
})

test('a project path on that host is a real 404, not a soft one', async ({
  page,
}) => {
  // The `/<identifier>` rewrite is gone: public projects live at
  // `motir.co/p/<identifier>`.
  const response = await page.goto(`${TENANT_ORIGIN}/ACME/changelog`)

  // ⚠️ THE STATUS, not just the DOM. A 404 page served with a 200 is what a
  // `loading.tsx` above a route that decides existence produces, and a crawler
  // reads the status rather than the words — `app/not-found.tsx` carries the
  // rule this asserts.
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { level: 1, name: /isn’t here/ }),
  ).toBeVisible()
})

test('a read page on a customer domain is the 404 room — it redirects nowhere', async ({
  request,
}) => {
  // MOTIR-9528 (Story MOTIR-4533) retired MOTIR-6743's redirect here: a
  // customer's own domain belongs to its workspace's application, answered at
  // Motir's edge, so this site serves it no project path and sends it nowhere.
  const res = await request.get(`${CUSTOM_ORIGIN}/board`, {
    maxRedirects: 0,
  })
  expect(res.status()).toBe(404)
  expect(res.headers()['location']).toBeUndefined()
})

test('the site’s own host is untouched', async ({ page }) => {
  // The other half of the criterion: the router must change nothing for
  // `motir.co`. If it did, every spec in this lane would already be failing —
  // so this asserts the ONE thing they do not: that `/p/*` still answers at the
  // shape it shipped with, on the site host, while the tenant host answers too.
  const response = await page.goto(`${SITE_ORIGIN}/p/MOTIR/changelog`)
  expect(response?.status()).toBe(200)

  const overview = page
    .getByRole('navigation', { name: 'Project' })
    .getByRole('link', { name: 'Overview' })
  await expect(overview).toHaveAttribute('href', '/p/MOTIR')
})
