import type { Env } from '../env'

/*
 * THE BUILT SITE'S ASSET SHELL, READ FROM THE BUILD (MOTIR-10753).
 *
 * Every page Astro builds links the same hashed stylesheet, the same island
 * script and the same font preloads (`src/layouts/SitePage.astro`). A page the
 * Worker renders must link exactly those files, and their names change with
 * every build. So the Worker does not guess them: it reads them off a page the
 * build wrote — the English not-found room, which every build has — through
 * the assets binding, once per isolate. A deploy ships a new build and a new
 * isolate together, so the names can never be stale.
 */

export interface AssetShell {
  /** `<link rel="preload" as="font">` hrefs, in the built order. */
  fontPreloads: string[]
  /** `<link rel="stylesheet">` hrefs. */
  stylesheets: string[]
  /** `<script type="module" src>` srcs — the island hydration entry. */
  scripts: string[]
}

/** The page the shell is read from. */
export const SHELL_SOURCE = '/404'

export class AssetShellError extends Error {
  override readonly name = 'AssetShellError'
}

function attributesOf(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of tag.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g))
    attributes[match[1]!.toLowerCase()] = match[2] ?? ''
  return attributes
}

/** The shell a built page links, read from its HTML. */
export function parseShell(html: string): AssetShell {
  const shell: AssetShell = { fontPreloads: [], stylesheets: [], scripts: [] }
  for (const [tag] of html.matchAll(/<link\s[^>]*>/g)) {
    const link = attributesOf(tag.slice(5, -1))
    if (link['rel'] === 'preload' && link['as'] === 'font' && link['href'])
      shell.fontPreloads.push(link['href'])
    if (link['rel'] === 'stylesheet' && link['href'])
      shell.stylesheets.push(link['href'])
  }
  for (const [tag] of html.matchAll(/<script\s[^>]*>/g)) {
    const script = attributesOf(tag.slice(7, -1))
    if (script['type'] === 'module' && script['src'])
      shell.scripts.push(script['src'])
  }
  if (shell.stylesheets.length === 0 || shell.scripts.length === 0)
    throw new AssetShellError(
      `${SHELL_SOURCE} links no stylesheet or no module script — the build that wrote it is not the site's`,
    )
  return shell
}

let cached: Promise<AssetShell> | null = null

/**
 * The shell, read once per isolate. A failed read is not cached, so the next
 * request tries again rather than every request failing until a redeploy.
 */
export function readShell(env: Env, url: URL): Promise<AssetShell> {
  if (cached) return cached
  const read = (async () => {
    const response = await env.ASSETS.fetch(new URL(SHELL_SOURCE, url))
    if (!response.ok)
      throw new AssetShellError(
        `${SHELL_SOURCE} answered ${response.status} from the assets`,
      )
    return parseShell(await response.text())
  })()
  cached = read
  read.catch(() => {
    if (cached === read) cached = null
  })
  return read
}

/** Forget the cached shell — for tests, which build several. */
export function resetShell(): void {
  cached = null
}
