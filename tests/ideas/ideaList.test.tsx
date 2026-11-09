import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import { englishCopy as copy, format } from '@/lib/copy'
import {
  IDEA_CATEGORY_SLUGS,
  hasText,
  ideaCategoryMark,
  sourceMonth,
  type IdeasParams,
  type PublicIdeaDto,
  type PublicIdeaListDto,
  type PublicIdeaTagListDto,
} from '@/lib/ideas'
import {
  IdeaControls,
  countLine,
} from '@/app/[locale]/ideas/_components/IdeaControls'
import {
  BuyCard,
  CategoryMark,
  DirectionCard,
} from '@/app/[locale]/ideas/_components/IdeaCards'
import {
  IdeasEmpty,
  IdeasUnavailable,
} from '@/app/[locale]/ideas/_components/IdeaStates'
import {
  IdeasNavProvider,
  ResultsRegion,
} from '@/app/[locale]/ideas/_components/IdeasNav'
import ideasFixture from '../../e2e/fixtures/ideas.json'
import tagsFixture from '../../e2e/fixtures/ideas-tags.json'

/*
 * The store-backed list (MOTIR-7687, Story MOTIR-7665): the "Find an idea"
 * controls write the URL, the two card shapes render a store idea, the empty
 * and unavailable states, and the copy that left `messages/en.json`.
 */

const list = ideasFixture as PublicIdeaListDto
const tags = tagsFixture as PublicIdeaTagListDto
const EMPTY: IdeasParams = { tags: [] }
const buy = list.items.find((i) => i.kind === 'motir_buys') as PublicIdeaDto
const direction = list.items.find(
  (i) => i.kind === 'direction',
) as PublicIdeaDto
const f = copy.ideas.find

function controls(
  params: IdeasParams,
  over: Partial<{ tags: PublicIdeaTagListDto | null; total: number }> = {},
) {
  return render(
    <IdeasNavProvider>
      <IdeaControls
        params={params}
        total={over.total ?? list.total}
        categories={list.categories}
        tags={over.tags === undefined ? tags : over.tags}
      />
    </IdeasNavProvider>,
  )
}

describe('countLine', () => {
  it('reads by how many ideas the view holds', () => {
    expect(countLine(15, false, f)).toBe(format(f.countAll, { n: 15 }))
    expect(countLine(0, true, f)).toBe(f.countNone)
    expect(countLine(1, true, f)).toBe(f.countMatchOne)
    expect(countLine(3, true, f)).toBe(format(f.countMatch, { n: 3 }))
  })
})

describe('IdeaControls', () => {
  it('draws the unfiltered view: every category chip with its count, "All" pressed, no pills', () => {
    controls(EMPTY)
    const group = screen.getByRole('group', { name: f.categoryGroup })
    const chips = within(group).getAllByRole('link')
    expect(chips).toHaveLength(list.categories.length + 1)
    expect(chips[0]).toHaveAttribute('aria-current', 'true')
    expect(chips[0]).toHaveAttribute('href', '/ideas')
    const legal = within(group).getByRole('link', { name: /Legal/ })
    expect(legal).toHaveAttribute('href', '/ideas?category=legal')
    expect(legal).not.toHaveAttribute('aria-current')
    expect(screen.queryByText(f.activeLabel)).toBeNull()
    expect(screen.getByText(format(f.countAll, { n: list.total }))).toBeTruthy()
  })

  it('presses the chosen category, un-presses it to the rest of the view, and shows its pill', () => {
    controls(
      { category: 'ecommerce', tags: ['smb'], q: 'returns' },
      { total: 1 },
    )
    const group = screen.getByRole('group', { name: f.categoryGroup })
    const on = within(group).getByRole('link', { current: true })
    expect(on).toHaveTextContent('E-commerce')
    expect(on).toHaveAttribute('href', '/ideas?tag=smb&q=returns')
    expect(
      screen.getByRole('link', {
        name: new RegExp(format(f.pillCategory, { label: 'E-commerce' })),
      }),
    ).toHaveAttribute('href', '/ideas?tag=smb&q=returns')
    expect(screen.getByRole('link', { name: f.clearAll })).toHaveAttribute(
      'href',
      '/ideas',
    )
    expect(screen.getByText(f.countMatchOne)).toBeTruthy()
  })

  it('keeps a pressed category the response omits, at count 0, so it can be un-pressed', () => {
    controls({ category: 'education_tools' as never, tags: [] }, { total: 0 })
    const group = screen.getByRole('group', { name: f.categoryGroup })
    const on = within(group).getByRole('link', { current: true })
    expect(on).toHaveTextContent('education_tools0')
  })

  it('adds and removes tags, keeping the others, and labels the tag pills', () => {
    controls({ tags: ['smb'] })
    const group = screen.getByRole('group', { name: f.tags })
    expect(
      within(group).getByRole('link', { name: /Small businesses/ }),
    ).toHaveAttribute('href', '/ideas')
    expect(
      within(group).getByRole('link', { name: /Consumers/ }),
    ).toHaveAttribute('href', '/ideas?tag=smb&tag=consumer')
    expect(screen.getByText(format(f.tagsSelected, { n: 1 }))).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Tag: Small businesses/ }),
    ).toHaveAttribute('href', '/ideas')
  })

  it('draws no tag disclosure when the tags read failed, and falls back to the slug in a pill', () => {
    controls({ tags: ['smb'] }, { tags: null })
    expect(screen.queryByRole('group', { name: f.tags })).toBeNull()
    expect(screen.getByRole('link', { name: /Tag: smb/ })).toBeTruthy()
  })

  it('is a real GET form carrying the other filters, with a clear link for the text', () => {
    controls({ category: 'pets', tags: ['smb'], kind: 'direction', q: 'vet' })
    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('method', 'get')
    expect(form).toHaveAttribute('action', '/ideas')
    const hidden = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type=hidden]'),
    ).map((x) => `${x.name}=${x.value}`)
    expect(hidden).toEqual(['category=pets', 'tag=smb', 'kind=direction'])
    expect(screen.getByRole('link', { name: f.searchClear })).toHaveAttribute(
      'href',
      '/ideas?category=pets&tag=smb&kind=direction',
    )
    expect(screen.getByRole('link', { name: /“vet”/ })).toBeTruthy()
  })

  // The search's canonical address and a plain click on a filter are the
  // Worker page's navigator now, not Next's router: `IdeasNavigator` and its
  // suite (`tests/worker/ideasClient.test.tsx`) own both (MOTIR-10755).
})

describe('the cards', () => {
  it('a Motir-would-buy card: numbered category eyebrow, a title link that opens it in place, its fields', () => {
    render(
      <ol>
        <BuyCard idea={buy} index={0} params={{ tags: ['b2b-saas'] }} />
      </ol>,
    )
    const card = document.getElementById(`idea-${buy.slug}`) as HTMLElement
    expect(card).toHaveAttribute('data-showcase', 'field')
    expect(card).toHaveTextContent(`01 · ${buy.category.label}`)
    const link = within(card).getByRole('link', { name: buy.title })
    expect(link).toHaveAttribute('href', `/ideas?tag=b2b-saas&idea=${buy.slug}`)
    expect(link).toHaveAttribute('data-idea-link', buy.slug)
    for (const line of buy.capabilities) expect(card).toHaveTextContent(line)
    expect(
      within(card).getByRole('list', { name: copy.ideas.card.tagsAria }),
    ).toBeTruthy()
    expect(card).toHaveTextContent(copy.ideas.needLabel)
  })

  it('cycles the band tones and leaves out empty optional fields', () => {
    const bare: PublicIdeaDto = {
      ...buy,
      capabilities: [],
      tags: [],
      whyMotir: '',
      whoElse: null,
    }
    render(
      <ol>
        <BuyCard idea={{ ...bare, slug: 'b' }} index={1} params={EMPTY} />
        <BuyCard idea={{ ...bare, slug: 'c' }} index={5} params={EMPTY} />
      </ol>,
    )
    expect(document.getElementById('idea-b')).toHaveAttribute(
      'data-showcase',
      'ground',
    )
    expect(document.getElementById('idea-c')).toHaveAttribute(
      'data-showcase',
      'wash',
    )
    expect(document.querySelector('dl')).toBeNull()
    expect(
      screen.queryByRole('list', { name: copy.ideas.card.tagsAria }),
    ).toBeNull()
  })

  it('a direction card: category mark, first source in a new tab, the gap, and the extra sources count', () => {
    const extra: PublicIdeaDto = {
      ...direction,
      evidence: [
        ...direction.evidence,
        { ...direction.evidence[0], url: 'https://example.com/2' },
        { ...direction.evidence[0], url: 'https://example.com/3' },
      ],
    }
    render(
      <ul>
        <DirectionCard idea={extra} params={EMPTY} />
      </ul>,
    )
    const card = document.getElementById(
      `idea-${direction.slug}`,
    ) as HTMLElement
    expect(card.querySelector('[data-mark]')).toHaveAttribute(
      'data-mark',
      ideaCategoryMark(direction.category.slug),
    )
    const source = within(card).getByRole('link', {
      name: direction.evidence[0].sourceName,
    })
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noopener noreferrer')
    expect(card).toHaveTextContent(direction.gap as string)
    expect(card).toHaveTextContent(
      format(copy.ideas.card.moreSources, { n: 2 }),
    )
  })

  it('a direction card with no evidence and no gap draws neither', () => {
    render(
      <ul>
        <DirectionCard
          idea={{ ...direction, evidence: [], gap: null, tags: [] }}
          params={EMPTY}
        />
      </ul>,
    )
    expect(document.querySelector('dl')).toBeNull()
    expect(screen.queryByText(/more sources/)).toBeNull()
  })
  it('draws only the half of the footnote that has text', () => {
    render(
      <ol>
        <BuyCard
          idea={{ ...buy, slug: 'm', whyMotir: 'Because.', whoElse: '' }}
          index={0}
          params={EMPTY}
        />
        <BuyCard
          idea={{ ...buy, slug: 'w', whyMotir: null, whoElse: 'Nobody.' }}
          index={1}
          params={EMPTY}
        />
      </ol>,
    )
    const m = document.getElementById('idea-m') as HTMLElement
    const w = document.getElementById('idea-w') as HTMLElement
    expect(m).toHaveTextContent(copy.ideas.needLabel)
    expect(m).not.toHaveTextContent(copy.ideas.whoLabel)
    expect(w).toHaveTextContent(copy.ideas.whoLabel)
    expect(w).not.toHaveTextContent(copy.ideas.needLabel)
  })

  it('a direction card draws the evidence without a gap, and the gap without evidence', () => {
    render(
      <ul>
        <DirectionCard
          idea={{ ...direction, slug: 'e', gap: '  ' }}
          params={EMPTY}
        />
        <DirectionCard
          idea={{ ...direction, slug: 'g', evidence: [] }}
          params={EMPTY}
        />
      </ul>,
    )
    const e = document.getElementById('idea-e') as HTMLElement
    const g = document.getElementById('idea-g') as HTMLElement
    expect(e).toHaveTextContent(copy.ideas.more.evidenceLabel)
    expect(e).not.toHaveTextContent(copy.ideas.more.gapLabel)
    expect(g).toHaveTextContent(copy.ideas.more.gapLabel)
    expect(g).not.toHaveTextContent(copy.ideas.more.evidenceLabel)
  })
})

describe('a new category of Story MOTIR-8273', () => {
  const silver: PublicIdeaDto = {
    ...direction,
    slug: 'silver-test-idea',
    category: { slug: 'silver_economy', label: 'Silver economy' },
  }
  const factory: PublicIdeaDto = {
    ...direction,
    slug: 'factory-test-idea',
    category: { slug: 'manufacturing', label: 'Manufacturing' },
  }

  it('a direction card in silver_economy draws the record mark, one in manufacturing the decision mark', () => {
    render(
      <ul>
        <DirectionCard idea={silver} params={EMPTY} />
        <DirectionCard idea={factory} params={EMPTY} />
      </ul>,
    )
    const silverCard = document.getElementById('idea-silver-test-idea')!
    expect(silverCard.querySelector('[data-mark]')).toHaveAttribute(
      'data-mark',
      'record',
    )
    expect(silverCard).toHaveTextContent('Silver economy')
    const factoryCard = document.getElementById('idea-factory-test-idea')!
    expect(factoryCard.querySelector('[data-mark]')).toHaveAttribute(
      'data-mark',
      'decision',
    )
  })

  function withSilver(params: IdeasParams) {
    return render(
      <IdeasNavProvider>
        <IdeaControls
          params={params}
          total={1}
          categories={[
            ...list.categories,
            { slug: 'silver_economy', label: 'Silver economy', count: 1 },
          ]}
          tags={tags}
        />
      </IdeasNavProvider>,
    )
  }

  it('draws a Silver economy chip linking to its filter view', () => {
    withSilver(EMPTY)
    const group = screen.getByRole('group', { name: f.categoryGroup })
    const chip = within(group).getByRole('link', { name: /Silver economy/ })
    expect(chip).toHaveAttribute('href', '/ideas?category=silver_economy')
    expect(chip).toHaveTextContent('Silver economy1')
    expect(chip).not.toHaveAttribute('aria-current')
  })

  it('presses the chip and shows its pill when that category is chosen', () => {
    withSilver({ category: 'silver_economy', tags: [] })
    const group = screen.getByRole('group', { name: f.categoryGroup })
    const on = within(group).getByRole('link', { current: true })
    expect(on).toHaveTextContent('Silver economy')
    expect(
      screen.getByRole('link', {
        name: new RegExp(format(f.pillCategory, { label: 'Silver economy' })),
      }),
    ).toHaveAttribute('href', '/ideas')
  })
})

describe('the states', () => {
  it('no match: a way back to every idea', () => {
    render(<IdeasEmpty />)
    expect(
      screen.getByRole('heading', { name: copy.ideas.empty.title }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: copy.ideas.empty.action }),
    ).toHaveAttribute('href', '/ideas')
  })

  it('unavailable: a status with a retry of the same view', () => {
    render(<IdeasUnavailable retryHref="/ideas?category=pets" />)
    expect(screen.getByRole('status')).toHaveTextContent(copy.ideas.error.title)
    expect(
      screen.getByRole('link', { name: copy.ideas.error.action }),
    ).toHaveAttribute('href', '/ideas?category=pets')
  })

  it('the results region is not busy at rest', () => {
    render(
      <IdeasNavProvider>
        <ResultsRegion>
          <p>x</p>
        </ResultsRegion>
      </IdeasNavProvider>,
    )
    expect(screen.getByText('x').parentElement).not.toHaveAttribute('aria-busy')
  })
})

describe('the helpers the page leans on', () => {
  it('gives every category a mark, and an unknown one the ground mark', () => {
    for (const slug of IDEA_CATEGORY_SLUGS) {
      expect(['field', 'decision', 'record', 'ground']).toContain(
        ideaCategoryMark(slug),
      )
    }
    expect(ideaCategoryMark('legal')).toBe('field')
    expect(ideaCategoryMark('ai_infrastructure')).toBe('ground')
    expect(ideaCategoryMark('astrology')).toBe('ground')
    render(<CategoryMark slug="pets" />)
  })

  it('gives the nine categories of Story MOTIR-8273 their group marks', () => {
    for (const slug of [
      'entertainment_media',
      'hospitality_travel',
      'mobility',
      'energy_climate',
      'manufacturing',
      'local_services',
    ]) {
      expect(ideaCategoryMark(slug)).toBe('decision')
    }
    for (const slug of [
      'social_community',
      'silver_economy',
      'independent_work',
    ]) {
      expect(ideaCategoryMark(slug)).toBe('record')
    }
  })

  it('reads a source date as its month, and nothing for none', () => {
    expect(sourceMonth('2025-10-14')).toBe('October 2025')
    expect(sourceMonth(null)).toBeNull()
  })

  it('treats an empty or blank string as no text', () => {
    expect(hasText('a')).toBe(true)
    expect(hasText('  ')).toBe(false)
    expect(hasText('')).toBe(false)
    expect(hasText(null)).toBe(false)
    expect(hasText(undefined)).toBe(false)
  })
})

describe('the copy', () => {
  it('no idea lives in messages/en.json any more', () => {
    const en = JSON.parse(
      readFileSync(join(process.cwd(), 'messages', 'en.json'), 'utf8'),
    ) as { ideas: Record<string, unknown> & { more: Record<string, unknown> } }
    expect(en.ideas.items).toBeUndefined()
    expect(en.ideas.more.ideas).toBeUndefined()
  })
})
