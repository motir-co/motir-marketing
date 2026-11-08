import type { ReactNode } from 'react'
import { HandDrawnFilter } from '@motir/design-system'
import type { Locale } from '@/i18n/routing'
import { ImmersiveTiltIsland } from '../_islands'
import { RootJsonLd } from './RootJsonLd'

/*
 * THE BODY EVERY motir.co PAGE IS SERVED IN (MOTIR-7948 · MOTIR-10643).
 *
 * The document itself — `<html lang>`, the appearance attributes, the head —
 * is the Astro layout's (`src/layouts/SitePage.astro`), the one place a built
 * page's `<html>` is written. This module is what that layout renders inside
 * `<body>` around every page, so the style engines and the entity graph
 * cannot drift between the pages and the not-found rooms. The faces are
 * declared in `app/fonts.css` (MOTIR-7952).
 */

/** The `<html>` element's classes (the faces are `:root` variables now). */
export const SITE_HTML_CLASS = 'antialiased'

export function SiteBody({
  lang,
  description,
  children,
}: Readonly<{
  lang: Locale
  /** The locale catalogue's `meta.description`, for the entity graph. */
  description: string
  children: ReactNode
}>) {
  return (
    <>
      {/* The two style engines the app mounts too: the pointer tilt the 3D /
          Immersive style animates `data-tilt` panels with — an island, since
          it is an effect — and the roughen filter the Hand-Drawn style
          references. Both are inert under every other style (and the tilt
          under reduced motion). */}
      <ImmersiveTiltIsland />
      <HandDrawnFilter />
      {children}
      {/*
       * The Organization + WebSite entity graph (MOTIR-1154). It sits at the
       * END of <body> rather than in <head> deliberately: structured data is
       * read from the parsed document, position-independently, and nothing
       * above it should wait on it. Site-wide because the entity is the
       * SITE's, not any one page's — a second page inherits it from here.
       */}
      <RootJsonLd locale={lang} description={description} />
    </>
  )
}
