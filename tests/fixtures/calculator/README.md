# `tests/fixtures/calculator/`

Engine answers for the /price calculator (MOTIR-9685), in the exact shapes of
motir-ai `docs/contract.md` §4d at `version` 2: the categories read, the three
estimate arms (an ordinary plan, Max ×2 with top-ups, a larger pool), the
empty-category answer and three problem+json refusals. Plan keys and names are
the catalog's; credit ranges and prices are illustrative stand-ins. Tests read
their expected figures from these files, never from a literal.
