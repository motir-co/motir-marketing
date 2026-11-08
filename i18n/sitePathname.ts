'use client'

import { usePagePathname } from '@/lib/copy'
import { LOCALES } from './routing'

/**
 * The address with its locale taken off (MOTIR-7948) — `/ja/docs/mcp` and
 * `/docs/mcp` both read `/docs/mcp` — for the chrome that marks the current
 * page.
 *
 * The chrome compares the locale-free path to its links' paths, so the same
 * page is marked current in every language. The path is the page's own at
 * build and the location bar's in the browser (`usePagePathname`).
 */
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/')
  if (!(LOCALES as readonly string[]).includes(first ?? '')) return pathname
  return `/${rest.join('/')}`
}

export function useSitePathname(): string {
  return stripLocale(usePagePathname())
}
