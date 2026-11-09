/**
 * The BASE DOMAIN of the tenant namespace — `motir.site` in production
 * (Story MOTIR-3878 · MOTIR-4220).
 *
 * A workspace claims a label under it (`acme.motir.site`), so this is the
 * suffix every tenant subdomain is built on. `motir-core` has the same accessor
 * on its side of the seam (`lib/publicAddresses/tenantDomain.ts`) reading
 * `MOTIR_PUBLIC_TENANT_DOMAIN`; this one is the RENDERER's half, and the names
 * differ on purpose — the value is inlined into a client bundle here, so it
 * carries the `PUBLIC_` prefix that says so.
 *
 * ── ⚠️ WHY THE ROUTER NEEDS IT AT ALL ────────────────────────────────────
 *
 * The base domain itself is NOT a tenant address. `motir.site` has no row, so
 * the contract 404s it — but answering here means the answer does not depend on
 * the ABSENCE of a row somebody could one day create, and it saves a network
 * hop on a host we already know the answer for. `motir-core`'s `resolveHost`
 * refuses it for the same stated reason; this is that refusal moved one hop
 * earlier, to the only place that can act on it without asking.
 *
 * ── ⚠️ IT THROWS IN PRODUCTION AND DEFAULTS EVERYWHERE ELSE ──────────────
 *
 * The two existing origin modules sit at opposite ends of this and neither one
 * is right here. `lib/appOrigin.ts` throws unconditionally — correct for
 * "somebody else's origin", where a wrong guess ships dead doors. It would be
 * wrong here: it would make `pnpm test` and `next dev` need configuration to
 * run at all, for a variable a local run has no true value for.
 * `lib/siteOrigin.ts` defaults unconditionally — correct for a value with one
 * right answer that is not a secret. It would be wrong here too: a production
 * build that silently took `localhost` as its tenant namespace would treat the
 * real base domain as an unknown tenant host and 404 it, and nothing would go
 * red.
 *
 * So: a DEV/TEST default, and a production build that fails with the variable's
 * name. `localhost` is the honest default rather than a placeholder — in a local
 * run and in the browser lane the tenant namespace really is `*.localhost`
 * (Chromium resolves every label under it to loopback), so `acme.localhost` is a
 * working tenant host with no configuration and no `/etc/hosts` edit.
 *
 * ⚠️ `PUBLIC_` BECAUSE IT IS READ AT BUILD TIME, exactly as the two
 * origins are: it travels in `fly.toml`'s `[build.args]` and the `Dockerfile`'s
 * `ARG`, and a Fly SECRET would arrive after the image that needed it already
 * existed.
 */

export const TENANT_DOMAIN_ENV_VAR = 'PUBLIC_MOTIR_TENANT_DOMAIN'

/** What an unconfigured local run and the browser lane get. See the note above. */
export const DEFAULT_TENANT_DOMAIN = 'localhost'

/** Thrown when the variable is missing in production, or is not a bare host. */
export class MotirTenantDomainError extends Error {
  override readonly name = 'MotirTenantDomainError'

  constructor(reason: string) {
    super(
      `${TENANT_DOMAIN_ENV_VAR} ${reason}. Set it to the base domain tenant ` +
        `subdomains live under, e.g. motir.site. See .env.example.`,
    )
  }
}

/**
 * Validate and normalise a candidate base domain. Exported for the test, and
 * pure — it reads no environment of its own, and takes the production-ness of
 * the build as an argument rather than reading `NODE_ENV` itself.
 */
export function parseTenantDomain(
  raw: string | undefined,
  isProduction: boolean,
): string {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === '') {
    if (isProduction) throw new MotirTenantDomainError('is not set')
    return DEFAULT_TENANT_DOMAIN
  }
  // A BARE host: no scheme, no path, no port. Anything else is a value whose
  // author meant an origin, and a base domain compared against a `Host` header
  // has to be the host alone or it never matches.
  if (
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(
      value,
    )
  ) {
    throw new MotirTenantDomainError(
      `must be a bare hostname with no scheme, port or path (got ${JSON.stringify(raw)})`,
    )
  }
  return value
}

/**
 * Fail a PRODUCTION build whose base domain is missing, from `next.config.ts`.
 *
 * ⚠️ IT IS CALLED FROM THE CONFIG BECAUSE NOTHING ELSE EVALUATES THIS MODULE AT
 * BUILD TIME, and that was measured rather than assumed. `lib/appOrigin.ts`'s
 * throw fails `next build` because every landing component imports it and the
 * landing is PRERENDERED — the module really is evaluated by the compiler. This
 * module's only consumer is `proxy.ts`, which Next BUNDLES without executing:
 * a build with the variable unset completed green (`✓ Compiled`, `ƒ Proxy
 * (Middleware)`) and would have shipped an image whose router treated
 * `motir.site` as an unknown tenant host and 404'd every customer address.
 *
 * `next.config.ts` is the earliest thing a build evaluates and the one place
 * that is guaranteed to run, so the guard is called from there — and asserted by
 * `tests/host/tenantDomain.test.ts`, because a guard nobody exercises is a
 * comment.
 */
export function assertTenantDomainConfigured(isProduction: boolean): void {
  parseTenantDomain(process.env.PUBLIC_MOTIR_TENANT_DOMAIN, isProduction)
}

/**
 * ⚠️ READ THE VARIABLE BY ITS FULL LITERAL NAME — the rule both origin modules
 * record. Next inlines `process.env.X` only where `X` is written out;
 * `process.env[name]` with a variable is left as a runtime lookup.
 */
export const TENANT_DOMAIN: string = parseTenantDomain(
  process.env.PUBLIC_MOTIR_TENANT_DOMAIN,
  process.env.NODE_ENV === 'production',
)
