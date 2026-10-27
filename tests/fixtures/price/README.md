# `tests/fixtures/price/`

`plans.json` is a `GET /v1/public/plans` response (motir-ai `docs/contract.md`
§4e, `PUBLIC_PLANS_API_VERSION` 1) in the exact shape
`src/services/publicPlansService.ts` answers. Plan keys, names and pools are the
catalog's (motir-ai `PlanTier`); the PRICES are illustrative stand-ins, because
the catalog reads them from Stripe and the page must hold none of its own. A
test reads its expected figures from this file, never from a literal.

`plans-b.json` is a second ladder (a renamed, repriced first rung offered on
annual only, a repriced second rung and another top-up rate) for the tests that
show the card follows the read; `plans-unknown-version.json` and
`plans-missing-version.json` are the two answers the page must refuse.
