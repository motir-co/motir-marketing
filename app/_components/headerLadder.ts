import type { Locale } from '@/i18n/routing'

/*
 * THE GIVE-WAY LADDER AS CLASS STRINGS (MOTIR-7947 revision 2 · MOTIR-7953).
 *
 * `HEADER_LADDER` in `i18n/routing.ts` holds the widths; this holds them
 * spelled as Tailwind classes. ⚠️ THE STRINGS ARE WRITTEN OUT, NOT BUILT:
 * Tailwind finds a class by scanning source text, so `min-[${b}px]:flex` would
 * never be generated. `tests/headerLadder.test.ts` reads every width back out
 * of these strings and fails when the two disagree.
 *
 * Per rung:
 *   setup — Copy setup prompt, shown from `a`
 *   nav   — the nav, shown from `b`
 *   wide  — Sign in, shown from `b`
 *   menu  — the Menu button and its panel, gone from `b`
 *   bar   — the nav's text size and spacing. English sits its items a little
 *           closer (gap-4) so its bar keeps the full nav at 1280px. The full
 *           17px everywhere but
 *           the five languages whose nav runs longest (es, fr, it, pl, pt),
 *           which keep their own words ("Documentazione", not "Docs") and
 *           set them smaller instead, so their bar folds near the others'.
 */
export interface LadderClasses {
  bar: string
  setup: string
  nav: string
  wide: string
  menu: string
}

export const LADDER_CLASSES: Record<Locale, LadderClasses> = {
  en: {
    bar: 'gap-4 text-[17px]',
    setup: 'hidden min-[1577px]:inline-flex',
    nav: 'hidden min-[1360px]:flex',
    wide: 'hidden min-[1360px]:inline-flex',
    menu: 'min-[1360px]:hidden',
  },
  zh: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1464px]:inline-flex',
    nav: 'hidden min-[1283px]:flex',
    wide: 'hidden min-[1283px]:inline-flex',
    menu: 'min-[1283px]:hidden',
  },
  'zh-tw': {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1464px]:inline-flex',
    nav: 'hidden min-[1283px]:flex',
    wide: 'hidden min-[1283px]:inline-flex',
    menu: 'min-[1283px]:hidden',
  },
  ja: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1679px]:inline-flex',
    nav: 'hidden min-[1378px]:flex',
    wide: 'hidden min-[1378px]:inline-flex',
    menu: 'min-[1378px]:hidden',
  },
  ko: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1456px]:inline-flex',
    nav: 'hidden min-[1262px]:flex',
    wide: 'hidden min-[1262px]:inline-flex',
    menu: 'min-[1262px]:hidden',
  },
  de: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1757px]:inline-flex',
    nav: 'hidden min-[1464px]:flex',
    wide: 'hidden min-[1464px]:inline-flex',
    menu: 'min-[1464px]:hidden',
  },
  fr: {
    bar: 'gap-4 text-[14px]',
    setup: 'hidden min-[1835px]:inline-flex',
    nav: 'hidden min-[1513px]:flex',
    wide: 'hidden min-[1513px]:inline-flex',
    menu: 'min-[1513px]:hidden',
  },
  es: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1797px]:inline-flex',
    nav: 'hidden min-[1490px]:flex',
    wide: 'hidden min-[1490px]:inline-flex',
    menu: 'min-[1490px]:hidden',
  },
  it: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1713px]:inline-flex',
    nav: 'hidden min-[1397px]:flex',
    wide: 'hidden min-[1397px]:inline-flex',
    menu: 'min-[1397px]:hidden',
  },
  nl: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1673px]:inline-flex',
    nav: 'hidden min-[1406px]:flex',
    wide: 'hidden min-[1406px]:inline-flex',
    menu: 'min-[1406px]:hidden',
  },
  pl: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1735px]:inline-flex',
    nav: 'hidden min-[1442px]:flex',
    wide: 'hidden min-[1442px]:inline-flex',
    menu: 'min-[1442px]:hidden',
  },
  pt: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1757px]:inline-flex',
    nav: 'hidden min-[1454px]:flex',
    wide: 'hidden min-[1454px]:inline-flex',
    menu: 'min-[1454px]:hidden',
  },
}
