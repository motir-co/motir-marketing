import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * The cases MOTIR-8037's move test renders: the four pages as they read in each
 * state they have, over fixtures that are the same for the snapshot and for the
 * comparison. The snapshot (`api-move-baseline.json`) was captured from the
 * pre-move pages; `apiMove.test.tsx` says how.
 */

export const SPEC = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  components: {
    schemas: {
      ZqThing: {
        type: 'object',
        properties: {
          zqTrellisOffset: { type: 'integer', description: 'Through a ref.' },
        },
      },
    },
  },
  paths: {
    '/api/v1/zq/{zqZeppelinTint}/things': {
      post: {
        operationId: 'createZqThing',
        summary: 'Create a thing',
        description: 'The operation the snapshot renders.',
        'x-motir-permission': 'thing:edit',
        parameters: [
          {
            name: 'zqZeppelinTint',
            in: 'path',
            required: true,
            description: 'The path parameter.',
            schema: { type: 'string', minLength: 1 },
          },
        ],
        requestBody: {
          required: true,
          description: 'The thing to create.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['zqQuorumSemaphore'],
                properties: {
                  zqQuorumSemaphore: {
                    type: 'string',
                    enum: ['zqMarmalade', 'other'],
                    description: 'Required, and a closed enum.',
                  },
                  zqPangolinCadence: {
                    type: 'string',
                    description: 'Optional.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'The created thing.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ZqThing' },
              },
            },
          },
          '422': { description: 'The body did not validate.' },
        },
      },
    },
    '/api/v1/zq/things/{id}': {
      get: {
        operationId: 'getZqThing',
        summary: 'Read a thing',
        responses: { '200': { description: 'The thing.' } },
      },
    },
  },
}

export const CATALOGUE = {
  endpoint: '/api/mcp',
  toolCount: 3,
  groups: [
    {
      permission: 'thing:browse',
      label: 'Browse things',
      gates: 'Read things and their detail.',
      grantedByDefault: true,
      tools: [
        {
          name: 'zqWithArguments',
          title: 'With arguments',
          permission: 'thing:browse',
          summary: 'A tool that takes arguments.',
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: 'object',
            required: ['zqCarillonKey'],
            properties: {
              zqCarillonKey: {
                type: 'string',
                enum: ['zqQuince', 'other'],
                description: 'Required, and a closed enum.',
              },
            },
          },
        },
        {
          name: 'zqWithNoArguments',
          permission: 'thing:browse',
          summary: 'A tool that takes none.',
          annotations: { destructiveHint: true },
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    },
    {
      permission: 'thing:edit',
      label: 'Edit things',
      gates: 'Create and change things.',
      grantedByDefault: false,
      tools: [
        {
          name: 'zqFromAnOlderServer',
          permission: 'thing:edit',
          summary: 'A tool from a server that publishes no schemas.',
        },
      ],
    },
  ],
}

export const PRODUCTION_CATALOGUE = (
  JSON.parse(
    readFileSync('tests/docs/fixtures/mcp-tools.production.json', 'utf8'),
  ) as { catalogue: unknown }
).catalogue

export function stubFetch(document: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status })),
  )
}

/** Tags to spaces, whitespace collapsed, space before punctuation dropped. */
export function normalise(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ ([.,;:)?!])/g, '$1')
    .replace(/\( /g, '(')
}

/**
 * The container's markup without its islands' props. An island carries its
 * props as JSON in `data-props` (MOTIR-10645), and a code pane's props hold its
 * code — whose `>` the tag-stripping regex in {@link normalise} would read as
 * the end of the tag. The words a reader sees are never there.
 */
export function shownHtml(container: HTMLElement): string {
  const shown = container.cloneNode(true) as HTMLElement
  for (const island of shown.querySelectorAll('[data-props]'))
    island.removeAttribute('data-props')
  return shown.innerHTML
}

export interface Capture {
  text: string
  ids: string[]
  payloads: string[]
}

export async function capture(page: unknown): Promise<Capture> {
  const Page = page as (props: unknown) => Promise<never>
  const { container } = render(
    (await resolveAsync(await Page(EN_PAGE))) as never,
  )
  return {
    text: normalise(shownHtml(container)),
    ids: [...container.querySelectorAll('[id]')].map(
      (e) => e.getAttribute('id') ?? '',
    ),
    payloads: [...container.querySelectorAll('pre')].map(
      (pre) => pre.textContent ?? '',
    ),
  }
}
