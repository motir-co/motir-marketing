import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSitePathname } from '@/i18n/sitePathname'
import {
  englishCopy,
  PageProvider,
  usePagePathname,
  type PageValue,
} from '@/lib/copy'

/*
 * THE PAGE CONTEXT EVERY COMPONENT READS (MOTIR-10643) — the locale, the
 * catalogue and the path, from `PageProvider`, at build and in the browser.
 */

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

const Path = () => (
  <p>
    {usePagePathname()} · {useSitePathname()}
  </p>
)

const page = (value: Partial<PageValue>): PageValue => ({
  locale: 'de',
  copy: englishCopy,
  pathname: '/de/price',
  ...value,
})

describe('the page’s path', () => {
  it('is the built path, at build and in the browser alike', () => {
    window.history.replaceState(null, '', '/somewhere-else')
    expect(
      renderToString(
        <PageProvider value={page({})}>
          <Path />
        </PageProvider>,
      ).replace(/<!-- -->/g, ''),
    ).toBe('<p>/de/price · /price</p>')
    render(
      <PageProvider value={page({})}>
        <Path />
      </PageProvider>,
    )
    expect(screen.getByText('/de/price · /price')).toBeInTheDocument()
  })

  it('is the location bar’s on a page served at any path — the not-found room', () => {
    window.history.replaceState(null, '', '/de/does-not-exist')
    render(
      <PageProvider
        value={page({ pathname: '/de/404', servedAtAnyPath: true })}
      >
        <Path />
      </PageProvider>,
    )
    expect(
      screen.getByText('/de/does-not-exist · /does-not-exist'),
    ).toBeInTheDocument()
  })
})

describe('outside a page', () => {
  it('says which provider is missing rather than rendering nothing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Path />)).toThrow(
      'A component read the page catalogue outside a PageProvider',
    )
  })
})
