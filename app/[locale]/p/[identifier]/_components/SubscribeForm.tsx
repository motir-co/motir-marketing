'use client'

import { useState } from 'react'
import { useCopy, usePageLocale } from '@/lib/copy'

/**
 * SUBSCRIBE BY EMAIL (MOTIR-4119) — AMENDMENT 4 row 3, the one act that stays
 * on this host.
 *
 * ⚠️ IT IS A CROSS-ORIGIN `fetch` AND IT CARRIES NO CREDENTIALS, deliberately.
 * `credentials` is left at its default (`same-origin`), so the browser attaches
 * nothing to a request bound for `app.motir.co` — and MOTIR-4114's CORS answer
 * allow-lists this origin WITHOUT `Access-Control-Allow-Credentials`, so a
 * credentialed request would be refused by the browser even if one were
 * attempted. That pairing is what makes this the only write the amendment lets
 * stay here: it needs no identity, so it needs no cookie.
 *
 * ⚠️ THE 202 IS THE SAME WHATEVER HAPPENED, and the UI must not undo that. The
 * producing route answers 202 with no body for already-subscribed,
 * newly-subscribed and unconfirmed-and-re-sent alike, precisely so the endpoint
 * cannot be used as an oracle for "does this address follow this project". A
 * form that said "you were already subscribed" would rebuild the oracle in the
 * client. So there is ONE success message, and it is deliberately vague about
 * which of the three happened.
 *
 * ⚠️ IT SENDS THE PAGE'S LANGUAGE, NOT THE BROWSER'S (MOTIR-8735). An
 * email-only follow has no account to hold a language, so motir-core records
 * the body's `locale` on the follow and renders that follower's emails in it.
 * Without it the route falls back to the request's own language — and this
 * request carries no cookie, so that is `Accept-Language`, not the `/[locale]`
 * of the page the visitor was reading.
 */

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
  | { kind: 'limited' }
  | { kind: 'failed' }

/*
 * The five result messages are `publicProject.subscribe.messages.*`, keyed by
 * the state that shows them (MOTIR-7954). The `sent` one stays the single,
 * deliberately vague success line the note above requires.
 */

export function SubscribeForm({
  identifier,
  apiBase,
}: {
  identifier: string
  /**
   * The public API this form posts to (`publicApiBase`), passed in rather than
   * read from a build constant: the page that renders the form reads the app
   * origin per request (MOTIR-10753), and the island carries it to the browser.
   */
  apiBase: string
}) {
  const copy = useCopy()
  const subscribe = copy.publicProject.subscribe
  const locale = usePageLocale()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ kind: 'sending' })

    try {
      const res = await fetch(
        `${apiBase}/p/${encodeURIComponent(identifier)}/subscribe`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, locale }),
        },
      )

      // Each failure is its OWN state, as the card asks — never one generic
      // "something went wrong" over four different things a visitor can act on
      // differently.
      if (res.status === 202) {
        setState({ kind: 'sent' })
        setEmail('')
        return
      }
      if (res.status === 422) return setState({ kind: 'invalid' })
      if (res.status === 409) return setState({ kind: 'unavailable' })
      if (res.status === 429) return setState({ kind: 'limited' })
      setState({ kind: 'failed' })
    } catch {
      setState({ kind: 'failed' })
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor={`sub-${identifier}`}>
        {subscribe.label}
      </label>
      <input
        id={`sub-${identifier}`}
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={subscribe.placeholder}
        className="h-(--height-btn-md) min-w-[16rem] rounded-(--radius-input) border border-(--el-border-strong) bg-(--el-page-bg) px-(--spacing-input-x) text-[14px] text-(--el-text) placeholder:text-(--el-text-secondary)"
      />
      <button
        type="submit"
        disabled={state.kind === 'sending'}
        className="inline-flex h-(--height-btn-md) items-center rounded-(--radius-btn) border border-(--el-border-strong) px-(--spacing-btn-x) text-[14px] font-medium text-(--el-text) hover:bg-(--el-surface-soft) disabled:opacity-60"
      >
        {state.kind === 'sending' ? subscribe.submitting : subscribe.submit}
      </button>
      {state.kind !== 'idle' && state.kind !== 'sending' ? (
        <p role="status" className="text-[12px] text-(--el-text-secondary)">
          {subscribe.messages[state.kind]}
        </p>
      ) : null}
    </form>
  )
}
