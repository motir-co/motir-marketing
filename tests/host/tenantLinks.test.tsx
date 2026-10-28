import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import { ProjectHeader } from '@/app/[locale]/p/[identifier]/_components/ProjectHeader'
import { MoreLink } from '@/app/[locale]/p/[identifier]/_components/Rows'
import { ErrorState } from '@/app/[locale]/p/[identifier]/_components/States'
import {
  pagedTabHref,
  type PublicProjectOverviewDto,
} from '@/lib/publicProject'
import { SITE_HOST, type PublicHost } from '@/lib/publicHost'

/*
 * THE RENDERED HREF, ON EACH HOST KIND (MOTIR-4220's third criterion).
 *
 * ⚠️ RENDERED, NOT GREPPED, and the two guards catch different things.
 * `tests/publicProject/standingRules.test.ts` asks the TREE whether a `/p/`
 * literal survives anywhere under `app/[locale]/p/**` — which catches a link that never
 * went through the helper. This asks the DOM what a component actually emitted,
 * which catches one that goes through the helper and passes it the wrong host.
 * A component can pass either guard while failing the other.
 */

const project: PublicProjectOverviewDto = {
  id: 'proj_1',
  name: 'Prod',
  identifier: 'PROD',
  workspaceName: 'Acme',
  publicOverviewMd: null,
  publicTagline: null,
  publicTags: [],
  stats: {
    publicRequests: 1,
    upvotes: 2,
    planned: 3,
    shipped: 4,
    inProgress: 5,
  },
  links: {},
  viewerCanManage: false,
  addresses: { primary: 'https://motir.co/p/PROD', alternates: [] },
}

const APP = 'https://app.test.motir.co'

const WORKSPACE: PublicHost = {
  kind: 'workspace',
  host: 'acme.motir.site',
  origin: 'https://acme.motir.site',
}
const CUSTOM: PublicHost = {
  kind: 'project',
  host: 'roadmap.acme.com',
  origin: 'https://roadmap.acme.com',
}

/** Every href a rendered tree emits, in document order. */
function hrefs(container: HTMLElement): string[] {
  return [...container.querySelectorAll('a[href]')].map((a) =>
    a.getAttribute('href')!,
  )
}

describe.each([
  ['the site', SITE_HOST, '/p/PROD', '/p/PROD/changelog'],
  ['a customer domain', CUSTOM, '/', '/changelog'],
])('%s', (_label, host, overview, changelog) => {
  it('the SITE tabs point at this host; the APP tabs at the app, on every host', () => {
    // MOTIR-6745: Overview and Changelog are pages on this host. Board, Items,
    // Tree and Roadmap are the Visitor's views in the app (MOTIR-6743), so their
    // href is ABSOLUTE on `APP_ORIGIN` whichever address the reader arrived on —
    // never a host-relative path that would 308 off this host.
    render(
      <ProjectHeader project={project} current="changelog" host={host} watch />,
    )

    const nav = screen.getByRole('navigation', { name: 'Project' })
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      overview,
    )
    expect(
      within(nav).getByRole('link', { name: 'Changelog' }),
    ).toHaveAttribute('href', changelog)
    for (const view of ['Board', 'Items', 'Tree', 'Roadmap']) {
      expect(
        within(nav).getByRole('link', { name: new RegExp(`^${view}`) }),
      ).toHaveAttribute('href', `${APP}/p/PROD/${view.toLowerCase()}`)
    }
    expect(screen.getByRole('link', { name: /Watch live/ })).toHaveAttribute(
      'href',
      `${APP}/p/PROD/board`,
    )
  })

  it('the ITEMS PAGER points at this host', () => {
    const { container } = render(
      <MoreLink
        href={pagedTabHref(host, 'PROD', 'items', { cursor: 'w9' }, 'en')}
        label="Load more"
      />,
    )
    expect(hrefs(container)).toEqual([
      host.kind === 'site'
        ? '/p/PROD/items?cursor=w9'
        : host.kind === 'workspace'
          ? '/PROD/items?cursor=w9'
          : '/items?cursor=w9',
    ])
  })

  it('the ERROR state’s feed link points at this host', () => {
    const { container } = render(
      <ErrorState
        title="We could not load the board"
        identifier="PROD"
        host={host}
      />,
    )
    expect(hrefs(container)).toEqual([
      host.kind === 'site'
        ? '/p/PROD/changelog.xml'
        : host.kind === 'workspace'
          ? '/PROD/changelog.xml'
          : '/changelog.xml',
    ])
  })

  it('NO same-origin href carries a /p/ prefix off the site', () => {
    // The criterion, asked of the whole shell at once. The act rail's hand-offs
    // are ABSOLUTE `app.motir.co` URLs and are excluded by that — they are a
    // different host on purpose, and the `return` they carry is asserted below.
    const { container } = render(
      <ProjectHeader project={project} current="board" host={host} />,
    )
    const relative = hrefs(container).filter((h) => h.startsWith('/'))
    // Four since MOTIR-6745: the four app tabs left this host for `APP_ORIGIN`.
    expect(relative.length).toBeGreaterThanOrEqual(4)
    if (host.kind !== 'site') {
      expect(relative.filter((h) => h.startsWith('/p/'))).toEqual([])
    }
  })
})

describe('the hand-off’s RETURN is the site path on every host', () => {
  it.each([
    ['the site', SITE_HOST],
    ['a workspace subdomain', WORKSPACE],
    ['a customer domain', CUSTOM],
  ])('%s', (_label, host) => {
    // ⚠️ THE ONE PATH THAT MUST NOT FOLLOW THE HOST. `actHref` prefixes it with
    // `SITE_ORIGIN`, so a host-relative return would become `motir.co/board` —
    // a URL that does not exist, on every customer domain.
    render(<ProjectHeader project={project} current="board" host={host} />)

    const follow = screen.getByRole('link', { name: /Follow/ })
    const returned = new URL(
      new URL(follow.getAttribute('href')!).searchParams.get('return')!,
    )
    expect(returned.pathname).toBe('/p/PROD/board')
  })
})
