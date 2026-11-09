// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * THE BROWSER LANE RUNS THE WORKER, AND EVERY SPEC IT HELD OUT (MOTIR-10758).
 *
 * MOTIR-10649 served the static build alone and left nineteen spec files out
 * by name. This story put the Worker in front of the build and re-included
 * each one. Playwright passes a run whose file was deleted (there is simply
 * one spec fewer), so this suite is the check that a re-included spec stays:
 * each file must exist and hold a test, and the config must hold no
 * `testIgnore` that could quietly take one out again.
 */

const REINCLUDED = [
  'acceptance-ideas.spec.ts',
  'acceptance-ideas-categories.spec.ts',
  'acceptance-ideas-localized.spec.ts',
  'acceptance-public-project.spec.ts',
  'acceptance-read-pages-move.spec.ts',
  'acceptance-public-address.spec.ts',
  'project-acts.spec.ts',
  'project-crawl.spec.ts',
  'project-detail.spec.ts',
  'project-overview.spec.ts',
  'project-tabs.spec.ts',
  'acceptance-eleven-languages-live.spec.ts',
  'acceptance-docs-eleven-languages-live.spec.ts',
  'smoke-live.spec.ts',
  'locale-links-live.spec.ts',
  'not-found-live.spec.ts',
  'landmark-live.spec.ts',
  'languageSwitcher-live.spec.ts',
  'acceptance-legal-binding-english-live.spec.ts',
  // The two specs this story added: the Worker runs for the live surface only,
  // and the rules it applies before any page, measured over HTTP.
  'worker-invocation.spec.ts',
  'worker-edge-rules.spec.ts',
]

const config = readFileSync('playwright.config.ts', 'utf8')

describe('the browser lane', () => {
  it.each(REINCLUDED)('runs %s, which holds a test', (file) => {
    const path = `e2e/specs/${file}`
    expect(existsSync(path), `${path} is gone`).toBe(true)
    expect(readFileSync(path, 'utf8')).toMatch(/\btest\(/)
  })

  it('leaves no spec out by name', () => {
    expect(config).not.toMatch(/\btestIgnore\b/)
  })

  it('serves the build with the Worker in front, pointed at the stub', () => {
    expect(config).not.toContain('--assets dist')
    expect(config).toContain('--var MOTIR_APP_ORIGIN:${STUB_ORIGIN}')
    expect(config).toContain('tee ${WORKER_LOG}')
  })
})
