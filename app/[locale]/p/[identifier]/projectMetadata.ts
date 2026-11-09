import type { Locale } from '@/i18n/routing'
import { format, type Copy } from '@/lib/copy'
import { openGraphLocales, projectAlternates } from '@/lib/localeMetadata'
import type { Metadata, MetadataImage } from '@/lib/metadata'
import { publicPathFor, publicUrlFor, SITE_HOST } from '@/lib/publicHost'
import {
  deriveDescription,
  type PublicProjectOverviewDto,
  type PublicRequestDetailDto,
} from '@/lib/publicProject'

/*
 * THE HEAD OF EVERY `/p/*` PAGE (MOTIR-4115 · MOTIR-4116 · MOTIR-4117,
 * ported off Next by MOTIR-10753).
 *
 * Each builder takes the project it has ALREADY read, so it is only called for
 * a project that read `ok`: a project that is not there gets the not-found
 * room's head, and one we could not reach gets the site's alone — a canonical
 * emitted during an outage would be indexed.
 *
 * ⚠️ THE CANONICAL IS THE PROJECT'S OWN PRIMARY ADDRESS (MOTIR-4222), built by
 * `publicUrlFor`, with the locale's prefix and the twelve-locale `hreflang` set
 * when that address is on motir.co (`projectAlternates`). `og:locale` names the
 * page's locale and the other eleven as alternates, as every built page does.
 */

type ProjectCopy = Copy['publicProject']

/**
 * THE PROJECT'S OWN SHARE CARD (MOTIR-10758), drawn by the Worker
 * (`worker/share/projectShareImage.ts`). Next added it to every page under
 * `/p/<identifier>` from the segment's `opengraph-image` file; a page's
 * `openGraph` replaces the site's whole here (`lib/metadata.ts`), so each
 * builder names it. One address for every locale, relative to the site's
 * `metadataBase`: the card is keyed by the identifier alone, so `/de/…` and
 * `/…` would only be two URLs for one image.
 */
export function projectCardImage(identifier: string): MetadataImage {
  return {
    // One card for every language, at the unprefixed address.
    url: publicPathFor(SITE_HOST, identifier, 'opengraph-image', 'en'),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'A public project on Motir',
  }
}

function openGraph(
  locale: Locale,
  url: string,
  project: PublicProjectOverviewDto,
  type = 'website',
) {
  return {
    type,
    url,
    siteName: 'Motir',
    ...openGraphLocales(locale),
    images: [projectCardImage(project.identifier)],
  }
}

/** The project page — `/p/<identifier>`. */
export function overviewMetadata(
  locale: Locale,
  copy: ProjectCopy,
  project: PublicProjectOverviewDto,
): Metadata {
  const alternates = projectAlternates(locale, publicUrlFor(project))
  const title = `${project.name} · ${project.identifier}`
  const description = deriveDescription(
    project.publicTagline ?? project.publicOverviewMd,
    copy.meta.overviewFallback,
  )
  return {
    title,
    description,
    alternates,
    openGraph: {
      ...openGraph(locale, alternates.canonical as string, project),
      title,
      description,
    },
  }
}

/**
 * A tab — `/p/<identifier>/changelog`. Its canonical is its own path with no
 * paging cursor: deep pages of one list are one document to a crawler.
 */
export function tabMetadata(
  locale: Locale,
  copy: ProjectCopy,
  project: PublicProjectOverviewDto,
  segment: string,
  labelKey: keyof ProjectCopy['tabs'],
): Metadata {
  const label = copy.tabs[labelKey]
  const alternates = projectAlternates(locale, publicUrlFor(project, segment))
  return {
    title: format(copy.meta.tabTitle, { label, name: project.name }),
    description: format(copy.meta.tabDescription, {
      label,
      name: project.name,
    }),
    alternates,
    openGraph: openGraph(locale, alternates.canonical as string, project),
  }
}

/** One feature request — `/p/<identifier>/requests/<KEY>`. */
export function requestMetadata(
  locale: Locale,
  project: PublicProjectOverviewDto,
  request: PublicRequestDetailDto,
): Metadata {
  const alternates = projectAlternates(
    locale,
    publicUrlFor(project, `requests/${encodeURIComponent(request.identifier)}`),
  )
  return {
    title: `${request.title} · ${project.identifier}`,
    description: deriveDescription(request.descriptionMd, request.title),
    alternates,
    openGraph: openGraph(
      locale,
      alternates.canonical as string,
      project,
      'article',
    ),
  }
}

/**
 * The request doorway — `/p/<identifier>/requests/new`. Not indexed: it is a
 * hand-off to the app, not a document.
 */
export function requestNewMetadata(
  locale: Locale,
  copy: ProjectCopy,
  project: PublicProjectOverviewDto,
): Metadata {
  return {
    title: format(copy.meta.requestNewTitle, { name: project.name }),
    description: format(copy.meta.requestNewDescription, {
      name: project.name,
    }),
    alternates: projectAlternates(
      locale,
      publicUrlFor(project, 'requests/new'),
    ),
    robots: { index: false, follow: true },
    openGraph: openGraph(
      locale,
      publicUrlFor(project, 'requests/new'),
      project,
    ),
  }
}
