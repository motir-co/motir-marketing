import { describe, expect, it } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { ProjectJsonLd } from '@/app/[locale]/p/[identifier]/_components/JsonLd'
import { tabMetadata } from '@/app/[locale]/p/[identifier]/projectMetadata'
import { englishCopy } from '@/lib/copy'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'

/*
 * THE CANONICAL, AS RENDERED (MOTIR-4222's second criterion).
 *
 * ⚠️ FROM THE RENDERED VALUES, NOT FROM A SOURCE GREP, and the card asks for
 * that in terms. A grep proves a call site exists; it cannot prove the call was
 * given the right project, and "the canonical names the primary" is a claim
 * about the string a crawler reads.
 *
 * ⚠️ AND THE ANSWER IS THE SAME ON ALL THREE HOSTS, WHICH IS THE POINT. The
 * primary is a property of the PROJECT, so a page served at three addresses
 * emits ONE canonical — the case that would split one project into three
 * entities is the one where it varies.
 *
 * Re-included by MOTIR-10758: the head is built by the Worker's
 * `projectMetadata.ts` from the project the route already read (MOTIR-10753),
 * so the builder is handed that project rather than a mocked read.
 */

const project = (primary: string): PublicProjectOverviewDto => ({
  id: 'proj_1',
  name: 'Prod',
  identifier: 'PROD',
  workspaceName: 'Acme',
  publicOverviewMd: null,
  publicTagline: 'A public plan.',
  publicTags: ['tooling'],
  stats: {
    publicRequests: 1,
    upvotes: 2,
    planned: 3,
    shipped: 4,
    inProgress: 5,
  },
  links: {},
  viewerCanManage: false,
  addresses: { primary, alternates: [] },
})

const PRIMARIES: Array<[string, string, string]> = [
  ['motir.co', 'https://motir.co/p/PROD', 'https://motir.co/p/PROD/board'],
  [
    'a workspace subdomain',
    'https://acme.motir.site/PROD',
    'https://acme.motir.site/PROD/board',
  ],
  [
    'a customer domain',
    'https://roadmap.acme.com',
    'https://roadmap.acme.com/board',
  ],
]

describe.each(PRIMARIES)(
  'a project whose primary is %s',
  (_label, primary, boardUrl) => {
    it('names it in the tab’s canonical AND og:url', () => {
      const meta = tabMetadata(
        'en',
        englishCopy.publicProject,
        project(primary),
        'board',
        'board',
      )

      expect(meta.alternates?.canonical).toBe(boardUrl)
      expect(meta.openGraph?.url).toBe(boardUrl)
    })

    it('names it in every JSON-LD `@id` and `url`', () => {
      const { container } = render(
        <ProjectJsonLd project={project(primary)} fallbackDescription="" />,
      )
      const graph = JSON.parse(
        container.querySelector('script')!.innerHTML,
      ) as Record<string, unknown>

      expect(graph['@id']).toBe(primary)
      expect(graph['url']).toBe(primary)
      // `isPartOf` keeps naming motir.co: the WEBSITE a project is published on
      // is Motir whichever address it answers at, and that is a statement about
      // the publisher rather than about this document.
      expect((graph['isPartOf'] as { url: string }).url).toBe(
        'https://motir.co/',
      )
    })
  },
)
