import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { SubscribeForm } from '@/app/[locale]/p/[identifier]/_components/SubscribeForm'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { publicApiBase } from '@/lib/publicProject'

/*
 * SUBSCRIBE (MOTIR-4121) — the ONE write `public-surface-hosts.md` AMENDMENT 4
 * lets stay on this host, and therefore the one place a cookie could be asked
 * for by accident.
 *
 * Every case here is a guarantee coverage alone cannot see.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const fill = async (email = 'reader@example.test') => {
  const user = userEvent.setup()
  render(
    <SubscribeForm identifier="ACME" apiBase={publicApiBase(APP_ORIGIN)} />,
  )
  await user.type(screen.getByLabelText('Email for changelog updates'), email)
  await user.click(screen.getByRole('button', { name: 'Subscribe' }))
  return user
}

describe('the request it makes', () => {
  it('posts to the APP origin, with the email and the page locale as JSON', async () => {
    fetchMock.mockResolvedValue({ status: 202 })

    await fill()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${APP_ORIGIN}/api/public/p/ACME/subscribe`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'reader@example.test',
      locale: 'en',
    })
  })

  it("sends the PAGE's locale, so an email-only follow is recorded in it (MOTIR-8735)", async () => {
    // The request is cross-origin and carries no cookie, so without this the
    // core route falls back to `Accept-Language` — the browser's language, not
    // the language of the `/[locale]` page the visitor was reading.
    fetchMock.mockResolvedValue({ status: 202 })
    const user = userEvent.setup()
    render(
      <SubscribeForm identifier="ACME" apiBase={publicApiBase(APP_ORIGIN)} />,
      { locale: 'it' },
    )
    await user.type(screen.getByRole('textbox'), 'lettore@example.test')
    await user.click(screen.getByRole('button'))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'lettore@example.test',
      locale: 'it',
    })
  })

  it('⚠️ SENDS NO CREDENTIALS — the property that lets this act stay here', async () => {
    // `credentials` is left at its default (`same-origin`), so the browser
    // attaches nothing to a cross-origin request. MOTIR-4114's CORS answer
    // allow-lists this origin WITHOUT `Access-Control-Allow-Credentials`, so a
    // credentialed attempt would be refused anyway — the two together are why
    // AMENDMENT 4 could keep this one write on this host.
    fetchMock.mockResolvedValue({ status: 202 })

    await fill()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.credentials).toBeUndefined()
  })

  it('encodes the identifier in the path', async () => {
    fetchMock.mockResolvedValue({ status: 202 })
    const user = userEvent.setup()
    render(
      <SubscribeForm
        identifier="OPEN CORE"
        apiBase={publicApiBase(APP_ORIGIN)}
      />,
    )
    await user.type(
      screen.getByLabelText('Email for changelog updates'),
      'a@b.test',
    )
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/p/OPEN%20CORE/subscribe')
  })
})

describe('the outcomes, each its own state', () => {
  it('202 → one deliberately vague success, and the field clears', async () => {
    // ⚠️ THE VAGUENESS IS THE POINT. The route answers 202 for
    // already-subscribed, newly-subscribed and re-sent alike, precisely so it
    // cannot be an oracle for "does this address follow this project". A message
    // saying "you were already subscribed" would rebuild that oracle here.
    fetchMock.mockResolvedValue({ status: 202 })

    await fill()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Check your inbox to confirm.',
    )
    expect(screen.getByLabelText('Email for changelog updates')).toHaveValue('')
  })

  it('422 → the address is wrong, as the SERVER judges it', async () => {
    // ⚠️ THE FIXTURE IS A SYNTACTICALLY VALID ADDRESS, deliberately. The input is
    // `type="email"` and `required`, so the browser refuses to submit something
    // like "nope" and this arm is never reached — which is correct product
    // behaviour and makes "nope" the wrong fixture for it. The 422 exists for
    // the addresses the BROWSER accepts and the server does not
    // (`normalizeFollowEmail` / `InvalidFollowEmailError`).
    fetchMock.mockResolvedValue({ status: 422 })
    await fill('reader@invalid-tld')
    expect(await screen.findByRole('status')).toHaveTextContent(
      /does not look like an email/i,
    )
  })

  it('409 → the project has changelog email turned off', async () => {
    fetchMock.mockResolvedValue({ status: 409 })
    await fill()
    expect(await screen.findByRole('status')).toHaveTextContent(/turned off/i)
  })

  it('429 → rate-limited, and it says to wait rather than to retry now', async () => {
    fetchMock.mockResolvedValue({ status: 429 })
    await fill()
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Too many attempts/i,
    )
  })

  it('an unexpected status → a failure that names the reach, not the address', async () => {
    fetchMock.mockResolvedValue({ status: 500 })
    await fill()
    expect(await screen.findByRole('status')).toHaveTextContent(
      /could not reach Motir/i,
    )
  })

  it('a thrown fetch → the same, rather than an unhandled rejection', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await fill()
    expect(await screen.findByRole('status')).toHaveTextContent(
      /could not reach Motir/i,
    )
  })

  it('the four failures are DISTINCT messages, not one generic one', async () => {
    // The card asks for each failure as its own state. A visitor acts
    // differently on each: fix the address, give up, wait, or retry.
    const seen = new Set<string>()
    for (const status of [422, 409, 429, 500]) {
      fetchMock.mockResolvedValue({ status })
      const { unmount } = render(
        <SubscribeForm identifier="ACME" apiBase={publicApiBase(APP_ORIGIN)} />,
      )
      const user = userEvent.setup()
      await user.type(
        screen.getAllByLabelText('Email for changelog updates')[0]!,
        'a@b.test',
      )
      await user.click(screen.getAllByRole('button', { name: 'Subscribe' })[0]!)
      seen.add((await screen.findAllByRole('status'))[0]!.textContent ?? '')
      unmount()
      fetchMock.mockReset()
    }
    expect(seen.size).toBe(4)
  })
})
