import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdeaSheet } from '@/app/[locale]/ideas/_components/IdeaSheet'
import {
  IdeasNavigator,
  isPlainClick,
  returnFocusTo,
  searchAddress,
  takeOpenedFromList,
} from '@/app/[locale]/ideas/_components/IdeasNavigator'

/*
 * /ideas' CLIENT HALF IN THE BROWSER (MOTIR-10755): the navigator island over
 * the page's plain links and form, and the sheet's close without Next's router.
 */

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const PAGE = `
  <h2 id="find-h" tabindex="-1">Find an idea</h2>
  <p aria-live="polite" data-ideas-count="Updating…">15 ideas</p>
  <form method="get" action="/de/ideas" role="search" data-ideas-search="">
    <input type="text" name="q" value="  returns  " />
    <input type="hidden" name="category" value="ecommerce" />
    <input type="hidden" name="tag" value="smb" />
    <input type="hidden" name="kind" value="direction" />
    <button type="submit">Search</button>
  </form>
  <a id="filter" href="/de/ideas?tag=smb" data-ideas-nav="">smb</a>
  <a id="plain" href="/de/docs">docs</a>
  <div data-ideas-results=""><a id="card" href="/de/ideas?idea=one" data-idea-link="one">One</a></div>
`

let root: Root | null = null
let host: HTMLElement

beforeEach(() => {
  document.body.innerHTML = PAGE
  host = document.createElement('div')
  document.body.append(host)
  window.sessionStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

function mount(node: React.ReactNode) {
  root = createRoot(host)
  act(() => root!.render(node))
}

const count = () => document.querySelector('[data-ideas-count]')!
const results = () => document.querySelector('[data-ideas-results]')!

function click(id: string, init: MouseEventInit = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  })
  document.getElementById(id)!.dispatchEvent(event)
  return event
}

describe('IdeasNavigator', () => {
  it('renders nothing of its own', () => {
    mount(<IdeasNavigator />)
    expect(host.innerHTML).toBe('')
  })

  it('a plain click on a filter shows the pending state, and lets the link navigate', () => {
    mount(<IdeasNavigator />)
    const event = click('filter')
    expect(event.defaultPrevented).toBe(false)
    expect(count().textContent).toBe('Updating…')
    expect(results().getAttribute('aria-busy')).toBe('true')
  })

  it('leaves a modified click, another link and a handled click alone', () => {
    mount(<IdeasNavigator />)
    click('filter', { metaKey: true })
    click('plain')
    const handled = new MouseEvent('click', { bubbles: true, cancelable: true })
    handled.preventDefault()
    document.getElementById('filter')!.dispatchEvent(handled)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(count().textContent).toBe('15 ideas')
    expect(results().hasAttribute('aria-busy')).toBe(false)
  })

  it('a page restored from the back-forward cache is put back to rest', () => {
    mount(<IdeasNavigator />)
    click('filter')
    click('filter')
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: false }),
    )
    expect(count().textContent).toBe('Updating…')
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    )
    expect(count().textContent).toBe('15 ideas')
    expect(results().hasAttribute('aria-busy')).toBe(false)
  })

  it('a click on a card notes that the sheet was opened from the list', () => {
    mount(<IdeasNavigator />)
    click('card')
    expect(count().textContent).toBe('15 ideas')
    expect(takeOpenedFromList('other')).toBe(false)
    click('card')
    expect(takeOpenedFromList('one')).toBe(true)
    expect(takeOpenedFromList('one')).toBe(false)
  })

  it('a search goes to the canonical address, pending meanwhile', () => {
    mount(<IdeasNavigator />)
    const form = document.querySelector('form')!
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(count().textContent).toBe('Updating…')
    expect(searchAddress(form)).toBe(
      '/de/ideas?category=ecommerce&tag=smb&q=returns&kind=direction',
    )
  })

  it('a search with no words drops the empty q', () => {
    const form = document.querySelector('form')!
    form.querySelector<HTMLInputElement>('input[name=q]')!.value = '   '
    for (const hidden of form.querySelectorAll('input[type=hidden]'))
      hidden.remove()
    expect(searchAddress(form)).toBe('/de/ideas')
  })

  it('leaves any other form alone', () => {
    mount(<IdeasNavigator />)
    const other = document.createElement('form')
    document.body.append(other)
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true })
    other.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(count().textContent).toBe('15 ideas')
  })

  it('returns focus to the card of the sheet that closed', () => {
    returnFocusTo('one')
    mount(<IdeasNavigator />)
    expect(document.activeElement?.id).toBe('card')
  })

  it('returns focus to “Find an idea” when the card is not on the page', () => {
    returnFocusTo('gone')
    mount(<IdeasNavigator />)
    expect(document.activeElement?.id).toBe('find-h')
  })

  it('takes no focus while a sheet is open, or with nothing to return', () => {
    mount(<IdeasNavigator />)
    expect(document.activeElement).toBe(document.body)
    act(() => root?.unmount())
    root = null
    const sheet = document.createElement('div')
    sheet.setAttribute('data-idea-sheet', 'one')
    document.body.append(sheet)
    returnFocusTo('one')
    mount(<IdeasNavigator />)
    expect(document.activeElement).toBe(document.body)
  })

  it('works on without storage', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })
    returnFocusTo('one')
    mount(<IdeasNavigator />)
    click('card')
    expect(takeOpenedFromList('one')).toBe(false)
  })

  it('works on when storage refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    returnFocusTo('one')
    expect(window.sessionStorage.getItem('motir:ideas:return')).toBeNull()
  })

  it('isPlainClick takes the primary button with no modifier only', () => {
    const plain = new MouseEvent('click', { button: 0 })
    expect(isPlainClick(plain)).toBe(true)
    for (const init of [
      { button: 1 },
      { button: 0, ctrlKey: true },
      { button: 0, shiftKey: true },
      { button: 0, altKey: true },
    ])
      expect(isPlainClick(new MouseEvent('click', init))).toBe(false)
  })
})

describe('IdeaSheet', () => {
  function sheet() {
    mount(
      <IdeaSheet
        slug="one"
        titleId="idea-title"
        closeHref="/de/ideas?tag=smb"
        closeLabel="Close"
        eyebrow={<span>Idea</span>}
      >
        <h2 id="idea-title" tabIndex={-1}>
          One
        </h2>
        <a href="/x">first</a>
      </IdeaSheet>,
    )
  }

  it('opened from the list, closes by going back', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    window.sessionStorage.setItem('motir:ideas:opened', 'one')
    sheet()
    expect(document.activeElement?.id).toBe('idea-title')
    expect(document.body.style.overflow).toBe('hidden')
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
      )
    })
    expect(back).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('motir:ideas:return')).toBe('one')
  })

  it('loaded from a link, closes by replacing the address', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    sheet()
    const close = host.querySelector<HTMLAnchorElement>(
      'a[aria-label="Close"]',
    )!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      close.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    expect(back).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem('motir:ideas:return')).toBe('one')
  })

  it('gives the page its scroll back when it goes', () => {
    sheet()
    act(() => root?.unmount())
    root = null
    expect(document.body.style.overflow).toBe('')
  })
})
