// @vitest-environment node
import { describe, expect, it } from 'vitest'

/*
 * MOTIR-7967, case 6 — the branches the story's other tests never reach, so
 * the 90/90/90 floor over its non-route modules measures behaviour rather than
 * an import. Each block names the module it tops up.
 *
 * MOTIR-10643 removed the blocks whose modules left with Next — `app/fonts.ts`,
 * `i18n/request.ts`, `i18n/navigation.ts`, the claim in `i18n/locale.ts`,
 * next-intl's halves of `lib/copy.ts` and `scripts/i18n/check-prerender.ts`.
 * Their replacements carry their own tests (`tests/copy.test.ts`,
 * `tests/i18n/checkStaticPages.test.ts`, `tests/typeFaces.test.ts`).
 */

describe('i18n/sitePathname.ts', () => {
  it('an empty address has no locale to strip', async () => {
    const { stripLocale } = await import('@/i18n/sitePathname')
    expect(stripLocale('')).toBe('')
  })
})

describe('app/_components/products.ts', () => {
  it('an unknown slug is a programming error, said by name', async () => {
    const { productOf } = await import('@/app/_components/products')
    const { englishCopy } = await import('@/lib/copy')
    expect(() => productOf('no-such-product' as never, englishCopy)).toThrow(
      'Unknown product: no-such-product',
    )
  })
})
