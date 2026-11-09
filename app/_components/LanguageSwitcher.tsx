'use client'

import { type MouseEvent, useCallback, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { buttonVariants, cn } from '@motir/design-system'
import { stripLocale } from '@/i18n/sitePathname'
import {
  LOCALE_BCP47,
  LOCALE_ENDONYMS,
  LOCALES,
  type Locale,
} from '@/i18n/routing'
import { format, useCopy, usePageLocale, usePagePathname } from '@/lib/copy'
import { rememberLocale, switchHref } from '@/lib/languageSwitch'
import type { PublicHost } from '@/lib/publicHost'
import { useDismiss } from './useDismiss'

/*
 * THE LANGUAGE SWITCHER (MOTIR-7953), built to MOTIR-7947's revision 2: a globe
 * at the bar's right edge, after Start free, at every width. It opens an
 * end-aligned group of the twelve languages, each in its own script.
 *
 * ⚠️ THE ENTRIES ARE LINKS, AND CHOOSING ONE IS A FULL NAVIGATION. motir.co
 * gives every language its own address, so an entry is the page being read
 * under another locale, and it works without JavaScript. With JavaScript the
 * click first writes the remembered-choice cookie, then `location.assign`s the
 * page built for that locale. Off the site (the 404 room's unresolved host)
 * the entry is the same address, and the cookie is the whole signal.
 *
 * It hydrates as part of the header island (MOTIR-10643). The query and
 * fragment are read from `location` at click time, so the built markup does
 * not depend on them.
 *
 * The group renders only while open, so a closed bar carries no endonym — and
 * no CJK glyph a Latin page's font set would have to fall back for.
 */
export function LanguageSwitcher({ host }: { host: PublicHost }) {
  const copy = useCopy()
  const current = usePageLocale()
  const browserPath = usePagePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((via: 'escape' | 'outside') => {
    setOpen(false)
    if (via === 'escape') triggerRef.current?.focus()
  }, [])
  useDismiss(rootRef, open, close)

  // The site's address carries the locale; off the site (the 404 room, which
  // cannot know its host) the browser path is kept as the visitor typed it.
  const path = host.kind === 'site' ? stripLocale(browserPath) : browserPath

  const choose = (event: MouseEvent<HTMLAnchorElement>, locale: Locale) => {
    event.preventDefault()
    setOpen(false)
    if (locale === current) return
    const { search, hash } = window.location
    rememberLocale(locale)
    window.location.assign(switchHref(host, path, locale) + search + hash)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="language-menu"
        aria-label={format(copy.nav.language.label, {
          language: LOCALE_ENDONYMS[current],
        })}
        title={copy.nav.language.heading}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'md' }),
          'w-(--height-btn-md) shrink-0 px-0 text-(--el-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
          open && 'bg-(--el-surface-soft)',
        )}
      >
        <Globe aria-hidden="true" className="size-[18px]" />
      </button>
      {open ? (
        <div
          id="language-menu"
          role="group"
          aria-label={copy.nav.language.menuLabel}
          data-surface="popover"
          className="absolute top-[calc(100%+8px)] right-0 z-40 grid min-w-[13rem] rounded-(--radius-card) border border-(--el-border) bg-(--el-page-bg) p-1 shadow-(--shadow-elevated)"
        >
          {LOCALES.map((locale) => {
            const isCurrent = locale === current
            return (
              <a
                key={locale}
                href={switchHref(host, path, locale)}
                lang={LOCALE_BCP47[locale]}
                hrefLang={LOCALE_BCP47[locale]}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={(event) => choose(event, locale)}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_16px] items-center gap-3 rounded-(--radius-control) px-(--spacing-control-x) py-(--spacing-control-y) text-[15px] no-underline hover:bg-(--el-surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
                  isCurrent
                    ? 'font-semibold text-(--el-accent-on-surface)'
                    : 'text-(--el-text)',
                )}
              >
                {LOCALE_ENDONYMS[locale]}
                {isCurrent ? (
                  <Check
                    aria-hidden="true"
                    className="size-4 text-(--el-accent-on-surface)"
                  />
                ) : null}
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
