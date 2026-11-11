import { IDEA_DRAFT_ENDPOINT, SIGN_IN, signInWithDraft } from './destinations'

/**
 * Door 1's cross-origin hand-off (MOTIR-1152, acceptance criterion 2).
 *
 * The contract is motir-core's, stated in `app/api/idea-draft/route.ts`:
 *
 *   POST /api/idea-draft  { "idea": string }   →  201 { "draftId": string }
 *   then navigate to  `${origin}/sign-in?draft=<draftId>`
 *
 * The idea travels as a DRAFT ID and never as a query parameter — the receiver
 * stores it server-side and `/sign-in` claims it into the `motir_pending_idea`
 * cookie, which is what survives the OAuth round trip and the email-verification
 * bounce into the `/onboarding` entrance's carried panel.
 *
 * Pure and free of the DOM so the states it drives can be asserted directly;
 * the component owns only what it does with the result.
 */

/** The cap motir-core's `MAX_PENDING_IDEA_LENGTH` enforces — it TRUNCATES past
 *  it rather than rejecting, which is why the box draws a counter and sets
 *  `maxLength`. A visitor who pastes 4,000 characters must lose them HERE,
 *  visibly, or lose them silently somewhere after sign-in. */
export const MAX_IDEA_LENGTH = 2000

export type IdeaHandoff =
  { readonly ok: true; readonly href: string } | { readonly ok: false }

/**
 * Trade an idea for the URL to navigate to.
 *
 * ⚠️ AN EMPTY IDEA SKIPS THE POST. Submit is enabled on an empty box by design
 * — "the box is a head-start, not a gate", the same call the `/onboarding`
 * entrance made — while the receiver answers an empty body with `400
 * EMPTY_IDEA`. Posting it would turn the designed happy path into the designed
 * ERROR state for a visitor who did nothing wrong. There is no draft to carry,
 * so door 1's own destination minus the draft is the honest answer.
 */
export async function handOffIdea(
  idea: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaHandoff> {
  const trimmed = idea.trim()
  if (trimmed === '') return { ok: true, href: SIGN_IN }

  try {
    const response = await fetchImpl(IDEA_DRAFT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: trimmed }),
      // The visitor is logged out and the receiver is deliberately not
      // session-gated, so no credentials are sent — which also keeps the
      // request a simple CORS POST.
      credentials: 'omit',
    })
    if (!response.ok) return { ok: false }

    const body: unknown = await response.json()
    const draftId = (body as { draftId?: unknown } | null)?.draftId
    // A 201 whose body is not the DTO is a failure, not a navigation: sending
    // the visitor to `/sign-in?draft=undefined` loses the idea while looking
    // like success, which is the one outcome the error state exists to prevent.
    if (typeof draftId !== 'string' || draftId === '') return { ok: false }

    return { ok: true, href: signInWithDraft(draftId) }
  } catch {
    // A cross-origin POST between two origins fails for reasons that have
    // nothing to do with the visitor — CORS, a cold machine, a network blip —
    // at the exact moment they have typed the most valuable thing they will
    // type all session. The caller keeps their text and draws the banner.
    return { ok: false }
  }
}
