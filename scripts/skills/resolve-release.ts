import {
  SKILLS_RELEASE_PIN,
  isReleaseTag,
  pickSkillsReleaseTag,
} from '../../lib/skillsRelease.ts'

// Prints the `motir-skills` release tag this build installs, and nothing else on
// stdout — `pnpm build` and the CI deploy job capture it into SKILLS_RELEASE_TAG,
// which `next.config.ts` inlines (MOTIR-8802).
//
// Never fails the build: no network, a rate limit or a malformed answer falls
// back to the committed pin, and says so on stderr.

const REPO = 'motir-co/motir-skills'

async function readLatest(token: string | undefined): Promise<Response> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'motir-marketing-build',
  }
  if (token) headers.authorization = `Bearer ${token}`
  return fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers,
    signal: AbortSignal.timeout(8000),
  })
}

async function latestTag(): Promise<string | null> {
  // The repository is public, so a token only buys rate limit. A stale or
  // mis-scoped one answers 401/403 even for public data — retry without it.
  let res = await readLatest(process.env.GITHUB_TOKEN)
  if ((res.status === 401 || res.status === 403) && process.env.GITHUB_TOKEN)
    res = await readLatest(undefined)
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  const body = (await res.json()) as { tag_name?: unknown }
  return isReleaseTag(body.tag_name) ? body.tag_name : null
}

let candidate: string | null = process.env.SKILLS_RELEASE_TAG ?? null
if (!isReleaseTag(candidate)) {
  try {
    candidate = await latestTag()
  } catch (err) {
    console.error(
      `skills release: could not read the latest ${REPO} release (${(err as Error).message}); using the pin ${SKILLS_RELEASE_PIN}`,
    )
  }
}
const tag = pickSkillsReleaseTag(candidate)
console.error(`skills release: installs name ${tag}`)
console.log(tag)
