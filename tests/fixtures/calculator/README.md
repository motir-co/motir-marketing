# `tests/fixtures/calculator/`

Engine answers for the /price calculator (MOTIR-9685), in the exact shapes of
motir-ai `docs/contract.md` §4d at `version` 2: the categories read, the three
estimate arms (an ordinary plan, Max ×2 with top-ups, a larger pool), the
empty-category answer and three problem+json refusals. Plan keys and names are
the catalog's; credit ranges and prices are illustrative stand-ins. Tests read
their expected figures from these files, never from a literal.

`pinned-vector.json` is different in kind: it is not illustrative. It is
motir-core's pinned cross-surface vector (`tests/fixtures/calculatorPinnedVector.json`
there, MOTIR-10156), a recording of the live engine in the current request shape
with its provenance, carried here **byte for byte** so the /price parity test and
the billing tab's test assert one request and one answer. Never edit it: re-record
it in motir-core (`node scripts/record-calculator-pinned-vector.mjs`) and copy the
file over this one unchanged. `tests/seam/pinnedVectorSeamLive.test.ts` (the live
seam lane) fails when the two copies differ. Prettier is told to leave it alone.
