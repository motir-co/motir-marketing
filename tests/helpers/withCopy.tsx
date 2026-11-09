import type { ReactElement, ReactNode } from 'react'
import {
  act,
  render as rtlRender,
  type RenderOptions,
} from '@testing-library/react'
import type { Locale } from '@/i18n/routing'
import { clientCopy, type Copy, englishCopy, PageProvider } from '@/lib/copy'
import type { Root } from 'react-dom/client'
import { hydrateIslands } from '@/lib/hydrateIslands'

/**
 * Render inside the page a component would be built in (MOTIR-7950 ·
 * MOTIR-10643).
 *
 * Every component reads its words, its locale and its path through
 * `PageProvider` (`lib/copy.ts`), which each page's React root mounts. Under
 * jsdom nothing does, so a component rendered bare would throw. This is the
 * ONE place a test supplies it — English at `/` by default, or any
 * `{ locale, messages, pathname }` a test is about.
 */
export interface CopyOptions {
  locale?: Locale
  messages?: Copy
  pathname?: string
}

export function withCopy(
  ui: ReactNode,
  { locale = 'en', messages = englishCopy, pathname = '/' }: CopyOptions = {},
): ReactElement {
  return (
    <PageProvider value={{ locale, copy: messages, pathname }}>
      {ui}
    </PageProvider>
  )
}

/**
 * `@testing-library/react`'s `render`, with the provider around it. A test
 * imports `render` from here instead, and nothing else about it changes —
 * `rerender` keeps the provider too.
 */
export function render(
  ui: ReactElement,
  options: RenderOptions & CopyOptions = {},
) {
  const { locale, messages, pathname, ...rest } = options
  return rtlRender(ui, {
    wrapper: ({ children }) =>
      withCopy(children, { locale, messages, pathname }),
    ...rest,
  })
}

/**
 * `render`, then hydrate the islands in what it rendered, exactly as the page
 * script does in the browser (`lib/hydrateIslands.tsx`). An island renders as
 * static HTML until it is hydrated, so a test that CLICKS inside one — the
 * header's menus and its language list — renders through this.
 */
export async function renderHydrated(
  ui: ReactElement,
  options: RenderOptions & CopyOptions = {},
) {
  const result = render(ui, options)
  const { locale = 'en', messages = englishCopy, pathname = '/' } = options
  let islands: Root[] = []
  await act(async () => {
    islands = await hydrateIslands(result.container, {
      locale,
      copy: clientCopy(messages) as unknown as Copy,
      pathname,
    })
  })
  // Each island is a React root of its own, as in the browser: unmounting the
  // page unmounts them first, so their effects clean up too.
  const unmount = () => {
    for (const island of islands) island.unmount()
    result.unmount()
  }
  return { ...result, islands, unmount }
}
