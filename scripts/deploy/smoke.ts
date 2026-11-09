import { releaseOrigin, smokeRelease } from '../../lib/deploySmoke.ts'

// Smokes the release the deploy job just published, on its own workers.dev
// address (`ORIGIN`, from wrangler's output file) — `ci.yml`'s *Smoke the
// release on its workers.dev address* step runs this as `pnpm smoke:release`.
// Every check retries on the ANSWER as well as the connection (MOTIR-10810);
// `lib/deploySmoke.ts` says why.

try {
  await smokeRelease(releaseOrigin(process.env.ORIGIN))
  console.log('smoke: the release answered every check')
} catch (error) {
  // A GitHub annotation, so the failed check heads the run's summary.
  const message = error instanceof Error ? error.message : String(error)
  console.error(`::error title=Release smoke check failed::${message}`)
  process.exitCode = 1
}
