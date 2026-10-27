# syntax=docker/dockerfile:1
#
# motir-marketing on Fly.io — the production image (MOTIR-1455).
#
# Modelled on motir-core's Dockerfile, minus everything that repo needs and this
# one does not: no Prisma, no migration lane, no worker process group, no
# design-system workspace build. What is kept is the shape the host decided —
# `output: 'standalone'`, one long-running Node process, HOSTNAME=0.0.0.0 —
# per `motir-core/docs/decisions/marketing-site-hosting.md` Q1.

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── build ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# ⚠️ A BUILD ARG, NOT A FLY SECRET, AND THE DIFFERENCE IS NOT A PREFERENCE.
# `NEXT_PUBLIC_*` is INLINED by `next build`, so this value has to exist HERE,
# in the builder stage — a Fly secret is a runtime environment variable and
# arrives hours too late, after an image has already been built with the doors
# pointing at `undefined`. `fly.toml`'s `[build.args]` is what supplies it on a
# release; `.env.example` documents it for local development.
#
# Deliberately NO DEFAULT. `lib/appOrigin.ts` throws when it is unset, which
# fails this layer with the variable's name — the one moment the mistake is
# cheap. A default here would make that guard unreachable and let a
# misconfigured deployment ship a landing page whose every button leads to a
# domain that is not serving (MOTIR-1152, acceptance criterion 4).
ARG NEXT_PUBLIC_MOTIR_APP_ORIGIN
ENV NEXT_PUBLIC_MOTIR_APP_ORIGIN=${NEXT_PUBLIC_MOTIR_APP_ORIGIN}

# The tenant namespace's base domain (MOTIR-4220). Same reasoning as the origin
# above — inlined by `next build`, so it has to arrive as a build ARG — and
# `lib/tenantDomain.ts` fails the build when it is missing here, which is the
# only moment the mistake is cheap. Its value travels in `fly.toml`'s
# `[build.args]`.
ARG NEXT_PUBLIC_MOTIR_TENANT_DOMAIN
ENV NEXT_PUBLIC_MOTIR_TENANT_DOMAIN=${NEXT_PUBLIC_MOTIR_TENANT_DOMAIN}

# motir-ai's public origin, for /price (MOTIR-8382). Inlined by `next build` for
# the calculator island; its value travels in `fly.toml`'s `[build.args]`.
ARG NEXT_PUBLIC_MOTIR_AI_ORIGIN
ENV NEXT_PUBLIC_MOTIR_AI_ORIGIN=${NEXT_PUBLIC_MOTIR_AI_ORIGIN}

# The `motir-skills` release the docs install commands name (MOTIR-8802): the
# latest GitHub release, resolved here so a rebuild is all a release needs. A
# network failure falls back to the committed floor rather than failing the image.
RUN SKILLS_RELEASE_TAG="$(node scripts/skills/resolve-release.ts)" pnpm next build --webpack

# ── runner ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# ⚠️ HOSTNAME MUST be 0.0.0.0, and omitting it FAILS SILENTLY. Next's standalone
# server binds the CONTAINER HOSTNAME by default: the process logs "✓ Ready",
# every health signal looks correct, and nothing outside the container can reach
# it — on a first deploy it presents as a networking problem and is debugged as
# one. Learned on motir-core's spike (MOTIR-2383); inherited here rather than
# re-learned.
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone bundle carries its own minimal node_modules; static and public
# are NOT included by Next and must be copied alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
