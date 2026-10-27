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
    setup: 'hidden min-[1541px]:inline-flex',
    nav: 'hidden min-[1324px]:flex',
    wide: 'hidden min-[1324px]:inline-flex',
    menu: 'min-[1324px]:hidden',
  },
  zh: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1428px]:inline-flex',
    nav: 'hidden min-[1247px]:flex',
    wide: 'hidden min-[1247px]:inline-flex',
    menu: 'min-[1247px]:hidden',
  },
  'zh-tw': {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1428px]:inline-flex',
    nav: 'hidden min-[1247px]:flex',
    wide: 'hidden min-[1247px]:inline-flex',
    menu: 'min-[1247px]:hidden',
  },
  ja: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1643px]:inline-flex',
    nav: 'hidden min-[1342px]:flex',
    wide: 'hidden min-[1342px]:inline-flex',
    menu: 'min-[1342px]:hidden',
  },
  ko: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1420px]:inline-flex',
    nav: 'hidden min-[1226px]:flex',
    wide: 'hidden min-[1226px]:inline-flex',
    menu: 'min-[1226px]:hidden',
  },
  de: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1721px]:inline-flex',
    nav: 'hidden min-[1428px]:flex',
    wide: 'hidden min-[1428px]:inline-flex',
    menu: 'min-[1428px]:hidden',
  },
  fr: {
    bar: 'gap-4 text-[14px]',
    setup: 'hidden min-[1799px]:inline-flex',
    nav: 'hidden min-[1477px]:flex',
    wide: 'hidden min-[1477px]:inline-flex',
    menu: 'min-[1477px]:hidden',
  },
  es: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1761px]:inline-flex',
    nav: 'hidden min-[1454px]:flex',
    wide: 'hidden min-[1454px]:inline-flex',
    menu: 'min-[1454px]:hidden',
  },
  it: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1677px]:inline-flex',
    nav: 'hidden min-[1361px]:flex',
    wide: 'hidden min-[1361px]:inline-flex',
    menu: 'min-[1361px]:hidden',
  },
  nl: {
    bar: 'gap-5 text-[17px]',
    setup: 'hidden min-[1637px]:inline-flex',
    nav: 'hidden min-[1370px]:flex',
    wide: 'hidden min-[1370px]:inline-flex',
    menu: 'min-[1370px]:hidden',
  },
  pl: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1699px]:inline-flex',
    nav: 'hidden min-[1406px]:flex',
    wide: 'hidden min-[1406px]:inline-flex',
    menu: 'min-[1406px]:hidden',
  },
  pt: {
    bar: 'gap-4 text-[15px]',
    setup: 'hidden min-[1721px]:inline-flex',
    nav: 'hidden min-[1418px]:flex',
    wide: 'hidden min-[1418px]:inline-flex',
    menu: 'min-[1418px]:hidden',
  },
}
