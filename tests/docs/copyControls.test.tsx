import { screen, waitFor } from '@testing-library/react'
import { renderHydrated } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeBlock } from '@/app/[locale]/docs/_components/DocSchema'
import {
  COPIED_MS,
  COPY_FAILED_NOTE,
  COPY_LABELS,
  copyButtonLabel,
} from '@/app/[locale]/docs/_components/CopyControls'

/*
 * THE COPY AFFORDANCE (MOTIR-4977) — built to `design/docs/design-notes.md`
 * § "The copy affordance — three states, and the failure is the point".
 *
 * ⚠️ THE FAILED STATE IS THE POINT, AND IT IS THE ONE A HAPPY-PATH SUITE
 * MISSES. A copy button that works is easy to prove and nearly worthless to
 * prove: the defect the design argues about is `writeText` being REFUSED —
 * insecure context, denied permission, no trusted gesture — and a silent no-op
 * leaving the reader convinced they hold the command. So the refusal path is
 * asserted first, its wording is asserted verbatim, and the fact that it does
 * NOT time out is asserted against a clock that has been run well past the
 * confirmation's own duration.
 *
 * The clipboard is stubbed here on purpose. Whether a REAL browser clipboard
 * ends up holding the text is the E2E sibling's (MOTIR-4979) — asserting it
 * against a stub would only prove the stub was called.
 */

const CODE = 'docker run -it --rm --pull=always \\\n  -v "$PWD:/workspace"'
const CAPTION = 'run'

function stubClipboard(impl: () => Promise<void>) {
  const writeText = vi.fn(impl)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
  return writeText
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('CodeBlock’s copy affordance', () => {
  it('puts the block’s EXACT code on the clipboard — newlines and continuations included', async () => {
    const writeText = stubClipboard(() => Promise.resolve())
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)

    await userEvent.click(
      screen.getByRole('button', { name: copyButtonLabel(CAPTION) }),
    )

    // Exact equality, not `toContain`: truncation at a line break is the
    // plausible bug and a substring assertion would pass straight through it.
    expect(writeText).toHaveBeenCalledWith(CODE)
  })

  it('names itself by CAPTION, so two panes on one page never announce identically', async () => {
    stubClipboard(() => Promise.resolve())
    await renderHydrated(
      <>
        <CodeBlock caption="pull" code="docker pull x" />
        <CodeBlock caption="run" code="docker run x" />
      </>,
    )

    expect(
      screen.getByRole('button', { name: 'Copy the pull command' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Copy the run command' }),
    ).toBeTruthy()
  })

  it('shows COPIED, then reverts to idle after the design’s duration', async () => {
    stubClipboard(() => Promise.resolve())
    // REAL timers, deliberately. `userEvent`'s own internal waits are timers
    // too, so driving a click under fake ones deadlocks the two against each
    // other — and the duration under test is 1.6 s, which is cheap to just
    // wait out. The assertion is the same either way.
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)
    expect(button.textContent).toContain(COPY_LABELS.copied)
    expect(button.dataset.state).toBe('copied')

    await waitFor(() => expect(button.dataset.state).toBe('idle'), {
      timeout: COPIED_MS * 2,
    })
    expect(button.textContent).toContain(COPY_LABELS.idle)
  })

  it('reports the REFUSAL — label, note and state — when writeText rejects', async () => {
    stubClipboard(() => Promise.reject(new Error('NotAllowedError')))
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)

    await waitFor(() => expect(button.dataset.state).toBe('failed'))
    expect(button.textContent).toContain(COPY_LABELS.failed)
    // Verbatim: the design owns this wording and the build may not invent it.
    expect(screen.getByText(COPY_FAILED_NOTE)).toBeTruthy()
  })

  it('reports the refusal when the clipboard API is ABSENT — an insecure context', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)

    await waitFor(() => expect(button.dataset.state).toBe('failed'))
    expect(screen.getByText(COPY_FAILED_NOTE)).toBeTruthy()
  })

  it('⚠️ the FAILED state does NOT time out — it is still there long past the copied duration', async () => {
    stubClipboard(() => Promise.reject(new Error('NotAllowedError')))
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)
    await waitFor(() => expect(button.dataset.state).toBe('failed'))

    // Wait PAST what the CONFIRMATION holds for, on a real clock. A build that
    // reused the copied timer for the failure would be idle by now, and the
    // reader would be looking at a button that says nothing went wrong. The
    // margin is what makes this an assertion rather than a race.
    await new Promise((resolve) => setTimeout(resolve, COPIED_MS + 400))

    expect(button.dataset.state).toBe('failed')
    expect(screen.getByText(COPY_FAILED_NOTE)).toBeTruthy()
  })

  it('clears the failure on the next SUCCESSFUL copy', async () => {
    let refuse = true
    stubClipboard(() =>
      refuse ? Promise.reject(new Error('no')) : Promise.resolve(),
    )
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)
    await waitFor(() => expect(button.dataset.state).toBe('failed'))

    refuse = false
    await userEvent.click(button)

    await waitFor(() => expect(button.dataset.state).toBe('copied'))
    expect(screen.queryByText(COPY_FAILED_NOTE)).toBeNull()
  })

  it('clears the failure when focus leaves the pane', async () => {
    stubClipboard(() => Promise.reject(new Error('no')))
    await renderHydrated(
      <>
        <CodeBlock caption={CAPTION} code={CODE} />
        <button type="button">elsewhere</button>
      </>,
    )
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    await userEvent.click(button)
    await waitFor(() => expect(button.dataset.state).toBe('failed'))

    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))

    await waitFor(() => expect(button.dataset.state).toBe('idle'))
    expect(screen.queryByText(COPY_FAILED_NOTE)).toBeNull()
  })

  it('is operable by KEYBOARD, and the pane stays reachable for scrolling', async () => {
    const writeText = stubClipboard(() => Promise.resolve())
    const { container } = await renderHydrated(
      <CodeBlock caption={CAPTION} code={CODE} />,
    )

    // The pane keeps its own tab stop — an overflowing block must stay
    // scrollable by keyboard, and the button must not have taken that away.
    const pre = container.querySelector('pre')
    expect(pre?.getAttribute('tabindex')).toBe('0')

    await userEvent.tab()
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })
    expect(document.activeElement).toBe(button)

    await userEvent.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledWith(CODE)
  })

  it('never carries a state by COLOUR alone — the label changes every time', async () => {
    let refuse = false
    stubClipboard(() =>
      refuse ? Promise.reject(new Error('no')) : Promise.resolve(),
    )
    await renderHydrated(<CodeBlock caption={CAPTION} code={CODE} />)
    const button = screen.getByRole('button', {
      name: copyButtonLabel(CAPTION),
    })

    expect(button.textContent).toContain(COPY_LABELS.idle)
    await userEvent.click(button)
    expect(button.textContent).toContain(COPY_LABELS.copied)

    refuse = true
    await userEvent.click(button)
    await waitFor(() =>
      expect(button.textContent).toContain(COPY_LABELS.failed),
    )

    // Three states, three distinct labels — which is what a reader who cannot
    // separate mint from peach actually reads.
    expect(new Set(Object.values(COPY_LABELS)).size).toBe(3)
  })
})
