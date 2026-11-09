/**
 * Which `motir-skills` release every install command on motir.co names.
 *
 * ⚠️ NO HAND-EDITED TAG (MOTIR-8802). This used to be a literal that moved only
 * when somebody remembered, so the setup prompt installed a plugin two releases
 * behind. The tag now has two inputs, and the newer one wins:
 *
 *   - `SKILLS_RELEASE_PIN`, a FLOOR committed here. It is what a build uses when
 *     it cannot reach GitHub, and what tests and `astro dev` render, so the page
 *     is never empty. A build can never name a tag OLDER than this.
 *   - `SKILLS_RELEASE_TAG` in the environment, written by
 *     `scripts/skills/resolve-release.ts` from the repository's latest GitHub
 *     release. `astro build` runs with it set (`package.json`'s `build`), so
 *     every module reads it the same.
 *
 * Dependency-free on purpose: the resolver script imports this file under plain
 * Node, where an `@/` alias or a framework import would not resolve.
 */

/** The floor. Raise it when convenient; nothing breaks if it lags a release. */
export const SKILLS_RELEASE_PIN = 'v0.8.1'

const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/

/** `true` for a plain `vMAJOR.MINOR.PATCH` tag — no pre-release, no build suffix. */
export function isReleaseTag(value: unknown): value is string {
  return typeof value === 'string' && RELEASE_TAG.test(value)
}

function parts(tag: string): [number, number, number] {
  const m = RELEASE_TAG.exec(tag)!
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Negative when `a` is older than `b`, positive when newer, 0 when equal. */
export function compareReleaseTags(a: string, b: string): number {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

/**
 * The tag a build names: the candidate when it is a well-formed release tag at
 * or above the pin, otherwise the pin. A malformed value is ignored rather than
 * rendered, because it would land inside a copy-paste command.
 */
export function pickSkillsReleaseTag(candidate: unknown): string {
  return isReleaseTag(candidate) &&
    compareReleaseTags(candidate, SKILLS_RELEASE_PIN) >= 0
    ? candidate
    : SKILLS_RELEASE_PIN
}
