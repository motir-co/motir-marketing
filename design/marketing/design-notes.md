# motir.co landing — three entry doors, one idea box (`design/marketing/`)

**Subtask:** MOTIR-1143 · 8.3.3 (`type: design`) · **Story:** MOTIR-656 (8.3 Marketing site + brand
mark) · **Epic 8 · Launch readiness.** **Repository: `motir-marketing`.**

The public front door at **motir.co**, for **all three** of Motir's genuinely different first-time
visitors. It opens on a **symmetric fork** — _start something new_ and _I have an existing project_
as two **co-equal** doors, side by side — and adds _Start free — project management only_ as a
**tertiary** door: a nav entry plus a single line under the hero.

**This asset is the ROUTING CONTRACT MOTIR-1152 builds to.** Every door is a cross-origin hand-off
into `app.motir.co`; the marketing site draws **no** connect, import-source, index, generate or chat
UI of its own. Those live downstream in 7.15 / 7.17 / 7.3 and are owned by their own designs.

**Asset files (three):** `design-notes.md` (this file, the AREA's note) · `landing.mock.html` (the
source of truth — standalone, re-stating the shipped `--el-*` values so it paints without a Tailwind
build, exactly as `motir-core/design/onboarding-entrance/*.mock.html` does) · `landing.png`
(full-page Playwright chromium export, light theme, `deviceScaleFactor: 2`, re-exported with
**`pnpm design:render design/marketing/landing.mock.html`** — the section _"Re-exporting a `.png`"_
below).

> **⚠️ The note is `design-notes.md`, NOT `landing.design-notes.md` — and this is a mechanism, not a
> style preference.** MOTIR-1143's acceptance criterion asked for three files "sharing a basename";
> the design-result publisher cannot see a note named that way. `classifyDesignPath` in
> `motir-core/scripts/upload-design-assets.mjs` matches the mock and the export on SUFFIX
> (`.mock.html`, `.png`) but the note on **exact basename** — `path.basename(filePath) === 'design-notes.md'`
> — so `landing.design-notes.md` classifies as `null`, lands in `ignored`, and is never published,
> while its two siblings publish normally. The card would get the pictures and none of the words.
>
> It is also the convention 44 of motir-core's 45 areas already follow: ONE `design-notes.md` per
> AREA, with the mock and the export sharing a per-surface basename. The criterion was amended on the
> record; the defect in the classifier and the one non-conforming file it strands are **MOTIR-3750**.

---

## ⚠️ A design board's CHROME owes AA — DECIDED for `motir-marketing` 2026-08-30 (MOTIR-3985)

> **⚠️ THIS SECTION IS AREA-WIDE.** It governs BOTH assets in `design/marketing/` and every asset
> added here afterwards, which is why it sits above the per-surface documents rather than inside
> either of them. The rest of this file is `landing.*` and then `design-showcase.*`; this is the rule
> both are held to.

**A design board's own annotation chrome — the panel captions, the `viewport …` rules, the
measurement lines, the marks a re-measurement uses to strike a superseded figure — owes WCAG 1.4.3
exactly as the product surface it presents does. There is no doc-annotation exemption in this
repository, and none is to be introduced.**

### What both mocks used to claim, and why it was not a small thing

Each asset's token block carried a sentence about which raw values it owns, ending _"…the
doc-annotation scaffold (sheet, captions, ref chips, viewport rulers), which is **not product
UI**."_ It was written to explain the raw HEXES and it was read as an AA exemption for the INK — and
a header comment is where the next author of an asset here would have found it, believed it, and
inherited it.

**motir-core asked exactly this question and answered the other way.** MOTIR-3054 —
_"the design tree's OTHER 277 failing ink/surface pairs: decide whether a mock's board CHROME owes
AA, then sweep or codify"_ — decided **no exemption**, swept all 277 sites across 51 assets, and
shipped the guard over both the utility-class and the stylesheet layer (motir-core PR #2133;
`docs/decisions/design-board-chrome-aa.md`; `motir-core/tests/theme/inkContrastMockScan.ts` run by
`vitest.design.config.ts`).

**This repository ADOPTS that answer.** Two repositories in one project holding opposite answers to
one accessibility question is the defect; the sites are only how it became visible. The three
arguments carry over unchanged and are worth restating here rather than cited, because the next
reader of THIS file is the one who needs them:

1. **The board is read by a person.** Yue accepts Stories from these `.png` exports (Principle #18),
   so the annotation layer is the surface the product's own review happens on. _"Not product UI"_ is
   true, and it is not a reason to make something harder to read.
2. **A structural exemption costs more than compliance and fails silently.** Marking the annotation
   layer (`data-mock-chrome` or similar) is an edit to every annotation plus a standing authoring
   obligation, and a marker is INHERITED — the moment a product element sits under a marked wrapper,
   or an author copies a marked panel as a starting point, the guard goes quiet on the product
   surface. Swapping the ink is one token per rule.
3. **motir-core's decision is spent for any future decline on these grounds.** A later boundary here
   may be declined for SIZE or for a measured property of a population — not on the grounds that a
   board's chrome sits outside the product's contract. That question is answered.

### The population, and how it was measured

**54 sites, all light-theme; the dark arm was 0.** Every element carrying its own text node was
loaded in headless chromium and read for its resolved `color` against its effective background — the
nearest ancestor with a non-transparent fill, composited — then ruled against 1.4.3 at that element's
OWN size and weight (large text = ≥24px, or ≥18.66px at weight ≥700). It answers _"what does this
asset paint?"_ rather than _"what did I think to ask about?"_, which is the property a `PAIRS` list
cannot have.

| file                        | selector                        | ink → surface            | ratio    | sites  |
| --------------------------- | ------------------------------- | ------------------------ | -------- | ------ |
| `design-showcase.mock.html` | `p.rule` (10px/600)             | `#787671` → `#f4f3f1`    | 4.09     | 12     |
| `design-showcase.mock.html` | `span.note` 6 + `code` 5 (13px) | `--el-text-muted` → same | 4.09     | 11     |
| `design-showcase.mock.html` | `p.measure` 5 + `code` 1 (11px) | same                     | 4.09     | 6      |
| `design-showcase.mock.html` | `strong` (13px/700)             | same                     | 4.09     | 3      |
| `design-showcase.mock.html` | `b` (11px/700)                  | `#1aae39` → same         | **2.65** | 2      |
| `design-showcase.mock.html` | `s` (11px/500)                  | `#e03131` → same         | 4.07     | 1      |
| `landing.mock.html`         | `code` 8 + `span.note` 5 (13px) | `--el-text-muted` → same | 4.09     | 13     |
| `landing.mock.html`         | `p.rule` (10px/600)             | same                     | 4.09     | 3      |
| `landing.mock.html`         | `strong` (13px/700)             | same                     | 4.09     | 3      |
|                             |                                 |                          |          | **54** |

`#f4f3f1` is the mocks' doc-annotation SHEET (`body { background: … }`) — a raw scaffold colour, not
an `--el-*` surface — so nothing in the token layer could have been adjusted to fix this. `#787671`
is `--el-text-muted`'s resolved light value, reached in `.rule` as a raw hex and everywhere else
through the token; every `code` / `strong` / `b` / `s` entry INHERITS its ink from the `.rule` /
`.note` / `.measure` rule above it, which is why five rules fix fifty-four sites.

**Re-measured after the sweep: `54 → 0`.** The scan reports one remaining entry in the whole area and
it is not one of these — the `☾` glyph at 3.85 on `--el-page-bg` in the dark panel, already
dispositioned below as a decorative glyph beside its own text label (its accessible name is the word,
and it clears 1.4.11's 3:1 for non-text). (**The LANE reports TWO**, because it models `opacity` and
this scan did not — see § _The lane_ below. The second is `landing.mock.html`'s `disabled` submit
button, exempt under 1.4.3's _Incidental_ clause, and it was never one of the 54.) **The measurement is what closed this, not the edit**: a
sweep verified by reading the diff would have missed that `code` and `strong` inherit rather than
declare.

### What changed — five rules

`--el-text-secondary` (`#5d5b54`) is the annotation ink, at **6.13:1** on the sheet. It is the same
ink motir-core's sweep moved to, for the same reason: it clears AA on every surface either asset has,
so it is right wherever an annotation lands. `.doc-head p` already used it, so the assets were
already half-consistent with the answer they denied.

| rule                                 | was                                               | is                         |
| ------------------------------------ | ------------------------------------------------- | -------------------------- |
| `design-showcase` `.panel-cap .note` | `var(--el-text-muted)`                            | `var(--el-text-secondary)` |
| `design-showcase` `.rule`            | `#787671` (a raw hex duplicating the muted token) | `var(--el-text-secondary)` |
| `design-showcase` `.measure`         | `var(--el-text-muted)`                            | `var(--el-text-secondary)` |
| `landing` `.panel-cap .note`         | `var(--el-text-muted)`                            | `var(--el-text-secondary)` |
| `landing` `.rule`                    | `var(--el-text-muted)`                            | `var(--el-text-secondary)` |

### ⚠️ The `b` and `s` marks, dispositioned BY NAME — they were a 1.4.1 failure as well as a 1.4.3 one

`.measure b` and `.measure s` are the two entries a caption-only sweep leaves behind, and they are
the two the card asked to name. They mark a measurement's CURRENT figure and its SUPERSEDED one:

```css
/* before */
.measure b {
  color: #1aae39;
} /* 2.65:1 on the sheet */
.measure s {
  color: #e03131;
  text-decoration: none;
} /* 4.07:1, and the LINE switched OFF */
```

**The green was the worst pair in either asset at 2.65:1, and the red is the more interesting
defect.** `<s>` means struck-through, and the rule explicitly REMOVED the line — so a superseded
figure was marked by hue alone. That is 1.4.1 (use of colour), independent of the ratio, on a mark
whose whole job is to say _"this number is no longer true"_; and it sat inside a panel whose own
caption reads _"weight 600 carries it without colour (1.4.1)"_.

**Both marks now rest on something other than hue, which is why neither took a darker green or red.**
Inventing `#157f2b` would have cleared 1.4.3 and left 1.4.1 exactly where it was — and a mark that
carries meaning is not scaffold decoration, so it may not be a raw hue at all (the
never-invent-a-colour rule: a palette token flips with `data-palette`, an invented hex does not).

| mark                        | now                                                                              | why it reads                                         |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `b` — the LIVE figure       | `var(--el-text)`, 15.69:1                                                        | `<b>` is bold; the weight is the signal              |
| `s` — the SUPERSEDED figure | `var(--el-text-secondary)`, 6.13:1, `text-decoration: line-through` **restored** | the line is the signal — the one `<s>` already meant |

### The `.fold::after` rule — measured, and it CLEARS

`design-showcase.mock.html` draws its fold line as generated content: `.fold::after`, _"FOLD —
900px"_, 10px/700, `#e03131`, over the white `.frame`. **`document.querySelectorAll('*')` cannot
reach a pseudo-element**, so the element scan above never measured it — a blind spot that reads as a
verdict if nobody says so. A separate `getComputedStyle(el, '::after')` probe returns **4.51:1 on
`#ffffff`**, clearing 1.4.3 by 0.01, and it is paired with a 2px dashed border rather than resting on
hue. It is left as it stands. **That it clears by 0.01, on a raw hex nothing measures, belongs to the
lane** — MOTIR-4001's acceptance criteria carry it.

### The lane — it EXISTS now (MOTIR-4001), and a PORT of motir-core's guard would have been GREEN on all 54

**⚠️ REWRITTEN 2026-08-30 (MOTIR-4001). This section used to read _"this repository has NONE"_ and
end with an authoring obligation held by this file. The lane has landed; the finding that made it a
card rather than a copy is kept, because it is the reason the lane looks the way it does.**

`pnpm test:design` — `vitest.design.config.mts` → `tests/design/inkContrast.test.ts`, run by
`ci.yml`'s **`design-guards`** job, which is a `needs` gate on `deploy`. It loads each
`design/marketing/*.mock.html` in headless chromium, walks every element carrying its own text node
**and every `::before` / `::after`**, reads the resolved `color` against the effective background
(compositing ancestor fills and `opacity`), and rules at that site's OWN size and weight. It is total
by construction — it starts from the elements, so a raw hex is measured exactly like a token.

**It runs on EVERY branch prefix, because `ci.yml` has no path filtering at all** — every job here
runs on every pull request. That is the difference from motir-core, whose `changes` job skips the app
lanes on a `design/*` diff and therefore needs an always-on lane to carry its design guards. If path
filtering is ever added here, `design-guards` must be exempt from it.

**The evidence is a FIXTURE, not this tree.** The 54 sites are swept, so a spec that only scanned
`design/marketing/**` would be green on the day it shipped and green if it abstained — and abstaining
is exactly what the obvious lane does. `tests/design/fixtures/board-chrome-pre-sweep.mock.html` is a
reduction of both mocks as they stood at `248e17a^`, and the spec asserts the lane goes RED on all
six of its sites by name, including the `::after` one.

**And the obvious lane does not work, which is the finding rather than the excuse.** Copying
motir-core's `inkContrastMockScan.ts` reports **zero** of the 54: its `ownSurface` resolves a
background only from a `var(--el-*)`, then rules it against a list of `--el-*` NAMES, so a raw
`#f4f3f1` sheet resolves to `null` and every element abstains. Two of the sites were not a `--el-*`
INK either. **A guard whose blind spot is exactly the population it was installed for reads as a
clean bill of health**, which is worse than no guard.

**jsdom is not the cheap substitute either, and it was probed rather than assumed**: it applies the
class cascade for `color`, then drops the `font:` SHORTHAND (`.rule` reads back `16px`/`normal`, so
every large-text call is wrong) and `background: var(--el-page-bg)` (`.frame` reads back transparent,
so the surface walk resolves the sheet where the asset paints white). Both failures under-report
silently. That is why the lane costs a browser — `playwright` (chromium headless shell), the same
devDependency the `.png` re-export needs (**MOTIR-4003**, which consumes this pin).

#### The two sites the lane measures below 4.5:1 and does NOT fail on

Both are dispositioned **in the spec**, matched on file + selector + text + the measured ratio, so an
allowance cannot widen by accident: change the ink, the size or the markup and the entry stops
matching, which fails the lane rather than quietly covering something new.

| site                                                                                     | ratio | why it is not a 1.4.3 failure                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `design-showcase.mock.html` `span.i` — the `☾` glyph on `--el-page-bg` in the dark panel | 3.85  | A decorative glyph beside its own text label, so the accessible name is the word; it clears 1.4.11's 3:1 for non-text. The same disposition recorded above.                                                                          |
| `landing.mock.html` `button.btn.primary` — `Starting…`, `disabled` + `aria-busy`         | 2.64  | An INACTIVE user-interface component, which 1.4.3 exempts by name under _Incidental_. The DECLARED pair clears AA at **6.57:1** (`#ffffff` on `#5645d4`); the 2.64 is what `.btn[disabled] { opacity: 0.72 }` composites it down to. |

**⚠️ The second one is a site the sweep never saw, and that is a property of the SCAN rather than of
the asset.** MOTIR-3985 measured declared pairs and did not model `opacity`, so it read that button
at 6.57 and it was never in the 54. It is recorded here because the alternative — a lane that reports
a number nobody has explained — is how a disposition becomes an unexplained red that the next author
silences.

**The authoring rule the lane now enforces, restated so it can be read without running anything:** an
annotation on the sheet takes `--el-text-secondary`, and a mark that carries state carries it in
weight, a line or a shape — never in hue alone.

---

## ⚠️ The asset convention — TWO files per surface, and a change is a DELTA mock (MOTIR-5493)

> **⚠️ THIS SECTION IS AREA-WIDE, AND IT IS THE CONVENTION FOR EVERY `design/<area>/` IN THIS
> REPOSITORY.** It supersedes every "three files" / "the `.png` is required" sentence below that
> predates 2026-09-14; those stay as records of how the assets they describe were made. The decision
> is `motir-core` `docs/decisions/design-result.md` AMENDMENT 4.

- **A design surface is TWO files:** the area's `design-notes.md` + `<surface>.mock.html`. **No
  `.png` export is required**, and no new one is committed with a design card. A `.pen` source is not
  accepted. Existing exports stay as records; nothing deletes or updates them.
  `tests/design/designThreeFileSet.test.ts` fails an area that ships an asset with no
  `design-notes.md`, and fails any `.pen`.
- **A change to an existing design is a NEW delta mock** — `<surface>--<change>.mock.html` beside the
  surface it amends, holding **only the panels that change**, plus a new `##` section in this
  `design-notes.md` citing the section and mock it amends. The existing mock is not edited: it is the
  record of its moment, and every run renders what ships before it builds.
- **The design result is published ONLY when an open work item is `blocked_by` the design card.** Then
  `publish_design_result` carries the mock(s) as `mock` and this notes file as the one `note_file` —
  no `image`, no `noteMd`, both of which the server refuses. A design nothing waits on publishes
  nothing; its pull request is its review.

## ⚠️ Re-exporting a `.png` — `pnpm design:render` (MOTIR-4003) — an OPTIONAL tool since MOTIR-5493

> **⚠️ THIS SECTION IS AREA-WIDE**, like the one above it. It governs BOTH assets in
> `design/marketing/` and every asset added here afterwards.

~~**Change a `.mock.html`, re-export its `.png`** — the export is the third file of the asset set and a
mock whose export lags is an incomplete asset.~~ **Superseded (MOTIR-5493): the export is no longer part
of the asset set.** The renderer stays for anyone who wants to look at a mock as an image, and for the
legacy exports already committed. The command is one line, from the repository root:

```
pnpm design:render design/marketing/<surface>.mock.html    # writes the .png
pnpm design:render --verify design/marketing/*.mock.html   # reports, writes nothing
```

**Run it AFTER `pnpm format`** on the mock: prettier reformats the markup, so a PNG rendered from the
pre-format source is not an export of what lands.

**Both _asset files_ lines used to say only what the export WAS** — _"full-page Playwright chromium export,
`deviceScaleFactor: 2`"_ — and until MOTIR-4001 added the `playwright` devDependency there was no
browser in this repository at all, so every design card here reached down an absolute path into a
SIBLING repository's `node_modules/.pnpm` for motir-core's chromium and re-derived the viewport by
reading the committed PNG's width and halving it. `scripts/design/render-design-mock.ts` is that
process, committed: it takes the viewport from the committed export rather than from a remembered
number, and it pins the light theme, the full-page capture and `deviceScaleFactor: 2` so they are not
re-typed from this sentence.

**What it adds beyond convenience is a BASELINE, and that is the reason it is a script rather than a
paragraph.** Before writing anything it renders the mock **as it stands at `HEAD`** and compares that
to the committed `.png`, which separates a pixel change YOU made from a pixel change the ENVIRONMENT
made — indistinguishable in a 2.3 MB binary diff:

| verdict | what it means for the diff you are about to show a reviewer                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| `EXACT` | the baseline is byte-identical, so the new PNG differs by exactly your edit                                     |
| `DIMS`  | same dimensions, different bytes — a renderer-build difference, nothing reflowed                                |
| `DRIFT` | different height: the committed export predates an environment change, and the height delta belongs to that gap |

**Measured on `origin/main` at `be86ebb`, 2026-08-30** (`pnpm design:render --verify` on an unmodified
tree): `design-showcase.mock.html` is **`EXACT`** at `1440@2x`, `2880×7916`; `landing.mock.html` is
**`DIMS`** at `1320@2x`, `2640×14860`. Both are the verdicts MOTIR-4003 recorded, re-derived here
against the merged tree rather than the branch they were first taken on.

**`deviceScaleFactor` is PINNED at 2, not searched** — the convention both _asset files_
lines state. An asset
committed at another scale has an ODD export width, which a 2x render cannot produce; the tool reports
`FAIL` for it and `tests/renderDesignMock.test.ts` names it before that happens. **A NEW asset has no
baseline to recover the viewport from**, so it is the one case where the width is stated:
`pnpm design:render --width 1320 design/marketing/<new>.mock.html`.

---

## Designed against shipped reality

Nothing on this page ships yet — `motir-marketing`'s `app/page.tsx` is a deliberate one-paragraph
scaffold (MOTIR-1455) with `robots: disallow: /`, and its own comment says _"Do not grow this file
into the landing; replace it there."_ But almost everything the page COMPOSES from already ships, so
the mock is built from those real sources rather than from a mental model of them:

| what                  | read from                                                                                                                                                                            | how it is used here                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The hero's vocabulary | `motir-core/design/onboarding-entrance/onboarding-entrance.mock.html` + its `.png`, **rendered and read**, not summarised                                                            | The idea Card, its accent border + `--shadow-elevated`, the mono field label, the 7-row textarea, the footer row with the ArrowRight primary Button, and the `OR` divider are the entrance's, element for element |
| The eyebrow chip      | the same asset's _Build with AI_ chip                                                                                                                                                | Same tint, same size, same `Sparkles` glyph — **and this page is the propagation target** the entrance's notes name (below)                                                                                       |
| The brand lockup      | `motir-core/design/brand/design-notes.md` §3 (the reference `.brand-lockup` CSS, copied verbatim) + `motir-core/design/brand/wave-band-24.svg` (the generated path, copied verbatim) | The top bar and the footer. `--brand-size` 26 px in the bar, 22 px in the footer                                                                                                                                  |
| The public chrome     | `motir-core/app/(public)/explore/_components/ExploreTopBar.tsx` and `ExploreFooter.tsx`                                                                                              | The bar's `--el-surface-soft` fill + hairline + `py-3` rhythm; the footer's four-column grid, its uppercase column headings and its legal rows                                                                    |
| The nav's own items   | `ExploreTopBar`'s shipped set                                                                                                                                                        | `Explore · Docs · Sign in · Start free` — the card's requested nav IS this bar's set minus the two non-resolving labels (`Product`, `Pricing`), which render as dead text there and are simply absent here        |
| The tokens            | `motir-core/packages/design-system/theme.css` on `origin/main` (Tier 0 · Tier 1 dark · Tier 3 `--el-*`)                                                                              | Every colour and every radius in the mock, light AND dark, restated at its resolved value                                                                                                                         |
| The icons             | `lucide-react@1.16.0` `dist/esm/icons/*.mjs`                                                                                                                                         | `Sparkles`, `ArrowRight`, `GitBranch`, `LayoutGrid`, `Bot`, `GitFork`, `CircleAlert`, `LoaderCircle`, `Menu` — the CURRENT paths, at `viewBox="0 0 24 24"`, stroke 2, round caps                                  |
| The idea's own bound  | `motir-core/lib/onboarding/pendingIdea.ts`                                                                                                                                           | `MAX_PENDING_IDEA_LENGTH = 2000`, and `normalizePendingIdea()` **truncates** past it — which is why the box draws a counter (see _Door 1's states_)                                                               |

**The two things the page will render from are already distributable.** `@motir/design-system@0.1.0`
is on public npm (tokens + `Button` / `Card` / `Pill` / `SectionLabel`), and `@motir/brand` ships the
lockup's `.brand-*` presentation (MOTIR-1456, `done`). MOTIR-1152 installs both; it does not re-cut
either.

**⚠️ What is drawn here is NOT the copy.** MOTIR-1144 owns the landing's words and was running
concurrently with this pass. Everything in the mock is placeholder **at the specified register** —
"agents", never "hosted coding agents"; no `repo` jargon outside the import row, whose audience
self-selects as having a codebase; the three-pillar name used in full. Treat the mock as the layout
and the hierarchy; take the words from 1144.

---

## Hierarchy — TWO co-equal doors, then one tertiary

### ⚠️ REVISED 2026-08-28 (Yue). Doors 1 and 2 are CO-EQUAL. The prior reasoning is kept below.

> _"'I have an existing project' should be first-class, it should be as important as the 'I have a
> new idea' — new project."_

This reverses the hierarchy the first draft of this asset shipped, which made the idea box primary
and import a secondary row under an `OR`. **It is a decision, not a finding** — it sits above the
rung-1 evidence below, which argued the other way and is preserved rather than deleted, because a
future reader who finds that research and does not know it was overruled will quietly re-demote
door 2.

**What "co-equal" is expressed as, so it cannot erode one attribute at a time.** The two doors share
every treatment that carries weight: the same grid track and width, the same `--el-accent` border,
the same `--shadow-elevated`, the same `<h2>`, the same tinted icon tile, the same primary `Button`.
**The `OR` divider is GONE** — a divider is precisely what makes one side an alternative to the
other. Neither door is "the fold"; a visitor arrives already belonging to one of them, and the page
must not tell them which is the real way in.

**Door 2 EARNS the weight rather than being padded to fill it.** A card holding one line of prose
beside a card holding a text area reads as secondary however it is styled. So the existing-project
door draws its three real sources — **your codebase · Jira · Linear or Plane** — as three focusable
rows, which is the same information the old row compressed into a sentence, at the weight the
decision asks for. That also enumerates the products, which the import-copy rule requires anyway.

**⚠️ THE SEAM THIS OPENED — RESOLVED 2026-09-04 by MOTIR-4370.** The shipped `/onboarding` entrance
(MOTIR-1461) is **idea-first with import demoted to a secondary row** — Yue's own call on 2026-07-01,
after the research below. A visitor now meets a symmetric fork on motir.co and, one click later, a
demoted import row inside the app. Visual continuity between the two properties is one of this
card's stated constraints, so **either the entrance takes the same revision or the asymmetry needs a
reason on the record**. ~~Flagged for MOTIR-1461~~ — **carried to MOTIR-4370, which ruled on it**;
this asset could not decide another surface's design, and did not. (The original pointer named a
subtask whose story had already shipped, so nothing in the tree was holding the question open — which
is the defect MOTIR-4370 was filed to record.)

**THE RULING (2026-09-04, MOTIR-4370): the asymmetry STANDS.** This landing keeps its symmetric fork;
the `/onboarding` entrance keeps its idea-first shape with import as a secondary row. Neither surface
is changed to match the other, and the same ruling is written into
`motir-core/design/onboarding-entrance/design-notes.md`.

**Why THIS surface is right to be symmetric.** It is met by a visitor who has committed to nothing. A
fork is the honest thing to show someone still deciding — and this page is also answering _what Motir
is_, where the co-equal import door is the point of the answer: Motir is not only an idea-first
builder. That is the reasoning already recorded below, and the ruling keeps it.

**Why the ENTRANCE is right to be idea-first.** It is reached by a reader who has already chosen the
idea path, by name, at the door — the in-app door is a button reading "Plan a new project with AI"
(`motir-core/app/(authed)/_components/ProjectSwitcher.tsx` and
`motir-core/app/(authed)/_components/ProjectsEmptyState.tsx`, via `startNewAiProjectAction`), and this
landing's own idea door carries the typed idea across in the `motir_pending_idea` cookie, which makes
the entrance render its carried-idea panel — a panel that drops the import row entirely. Re-offering a
symmetric fork there re-asks a question the reader answered with the click. The 2026-07-01 width
constraint also still holds and still differs between the two: the entrance's centred column is ~660px
(~310px a side), while this page's fork sits in a 1080px container (~510px a side).

**What the ruling does NOT settle.** Door 2 emits `?intent=import`, and nothing on the motir-core side
reads it, so a visitor who picks the import door lands on the entrance's DEFAULT panel rather than its
import branch. **That is a routing gap, not a design asymmetry**, and MOTIR-3846 owns it — the same
owner the door table below already names. This ruling assumes it lands; if it is ever abandoned, the
asymmetry is worth revisiting, because the import door would then contradict itself one screen later.

### The rung-1 evidence, kept — it argued for idea-first and was OVERRULED

Gathered and recorded in `motir-core/design/onboarding-entrance/design-notes.md` (2026-07-01) for the
same question one surface downstream:

- **Idea-first products lead with ONE prompt and demote every other path.** Lovable, Bolt, v0,
  Replit and Firebase Studio all open on a single "describe your app" box and treat "import an
  existing repo" as a secondary affordance; Firebase Studio separates a primary App Prototyping
  agent from a quieter import path.
- **Two co-equal cards is the pattern for SOURCE pickers, not idea entrances.** Vercel and Railway
  show _Import Git Repository_ beside _Deploy a Template_ — but both sides start from an existing
  artifact, and neither asks for a long idea.
- **PM tools put "start free" in the NAV.** Linear and Jira both do.

**Only the first two are overruled, and only for THIS surface.** Motir is not only an idea-first
builder — it is also the destination for a team that already has a codebase, or work items in Jira,
Linear or Plane, and that is a different business than Lovable's. The mirror is evidence about
idea-first BUILDERS; the decision is that motir.co is not only one.

**The third point still stands and is why door 3 is unchanged.** A third co-equal card would make
"project management only" one of three equal things Motir is. It is not: it is the way in for
somebody who wants neither AI door, and it needs to be findable, not promoted — a nav entry plus one
line, which is the convention Linear and Jira already use.

**One objection the entrance raised does NOT carry over.** It rejected a two-up fork partly because
"a half-width column can't hold a long first idea" — true of its own 660px centred column (~310px a
side). This page's fork sits in a **1080px** container, so each door is ~510px, wider than the
entrance's own full-width box. The constraint was about width, and this surface has it.

**What door 3 fixes.** MOTIR-655 (8.2, the non-AI team first-run) has existed for months and
**nothing anywhere routed into it from the public web**. The landing drew two doors for three
journeys, so a visitor who wanted the PM tool had to already know that the app's sign-up URL exists —
which is the one thing a marketing site exists to spare them.

---

## The three doors — the routing contract

Every door leaves motir.co for `app.motir.co`. **SHIPPED** means the receiving half exists on
motir-core's `origin/main` today; **NOT READ YET** means the parameter is specified here and nothing
in motir-core reads it (see the disposition below the table).

| #     | door                                                | who it is for                                                  | placement                                             | target                                                                                                                  | lands on                                                                                                                                 |
| ----- | --------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Start something new** (CO-EQUAL)                  | starting fresh, wants AI planning                              | the LEFT door of the fork                             | POST the idea to the pre-auth draft receiver (MOTIR-1458), then `https://app.motir.co/sign-in?draft=<id>` **· SHIPPED** | the `/onboarding` entrance pre-fills its **carried** panel (MOTIR-1462), which reads the `motir_pending_idea` cookie the receiver plants |
| **2** | **I have an existing project** (CO-EQUAL)           | already has a codebase, or work items in Jira, Linear or Plane | the RIGHT door of the fork, drawing its three sources | `https://app.motir.co/sign-in?intent=import` **· NOT READ YET** (owner: **MOTIR-3846**)                                 | the `/onboarding` entrance's EXISTING branch → 7.15 (repo) / 7.17 (Jira · Linear · Plane)                                                |
| **3** | **Start free — project management only** (TERTIARY) | wants the PM tool, no AI planning                              | a nav entry **and** one line under the hero           | `https://app.motir.co/sign-up?intent=tracker` **· NOT READ YET** (owner: **MOTIR-3639**)                                | the 8.2 team first-run (MOTIR-655)                                                                                                       |

**Verified on `origin/main`, 2026-08-28:**

- `motir-core/app/(auth)/sign-in/page.tsx` reads `next` and `draft`, and renders for a signed-in reader **only**
  when `?draft=` is present — the comment on that file explains why (a Server Component cannot set
  the cookie, so bouncing first would drop the idea somebody typed here). Door 1's whole chain is
  real.
- **`?intent` is read nowhere.** `git grep -n "intent" origin/main -- 'app/(auth)' 'lib/onboarding'`
  returns one hit, the word _intentionally_ in a comment. `/sign-up` reads `next` alone and says so.

**The ownership sweep, PER ROW rather than per table (MOTIR-3746's own criterion — one row having an
owner is what makes the others invisible):**

| #   | parameter         | read on motir-core `origin/main`?          | owning card                      |
| --- | ----------------- | ------------------------------------------ | -------------------------------- |
| 1   | `?draft=<id>`     | **YES** — `sign-in/page.tsx` reads `draft` | MOTIR-1458 (`done`) · MOTIR-1462 |
| 2   | `?intent=import`  | no                                         | **MOTIR-3846**                   |
| 3   | `?intent=tracker` | no                                         | **MOTIR-3639**                   |

Every row now has an owner. **When MOTIR-3846 and MOTIR-3639 ship, flip their `NOT READ YET` markers
to `SHIPPED` here** — the marker is this document's own claim about motir-core, and a claim nobody
re-reads is how the gap this table records got made in the first place.

**Disposition — doors 2 and 3 are specified as the card specifies them, and the gap is FILED, not
absorbed.** The `?intent=tracker` parameter has an owner (**MOTIR-3639**, _8.2.10 Carry the tracker intent
across the auth round trip_); the import parameter had none, which is **MOTIR-3746** — and now has **MOTIR-3846**, the import twin of 3639, carved on 2026-08-28. Both doors
DEGRADE gracefully in the meantime and MOTIR-1152 should ship them that way: without the parameter a
visitor lands on the `/onboarding` entrance's default panel, which already draws the import row, or
on `/sign-up`, which already creates the account. So the link is never dead — it just skips one
click less than it should. **Do not "fix" this by silently rewriting the doors to `?next=`**: the
parameter is the contract, and the card that reads it is scheduled work.

---

## ACCESS PATH — every entrance to this page, and every exit from it

### INBOUND (how a person reaches motir.co)

- **The address bar / a search result / a directory listing.** motir.co is the apex; there is no
  in-product door to it, and the site is the first Motir surface most visitors ever see. The SEO
  entity signals that make the search arrival work — `Organization` + `WebSite` JSON-LD, the root OG
  image, `robots`, the sitemap — are **MOTIR-1154**'s, not drawn here.
- **The `robots.txt` on the scaffold today says `disallow: /`** and flipping it is MOTIR-1154's
  explicitly. Until it flips, the only inbound path is a typed URL or a shared link.
- **From inside the app:** nothing. `app.motir.co` never links back to the marketing root — the
  brand lockup in motir-core's own chrome goes to `/`, which is the app's session-aware redirect
  (MOTIR-3367), not to motir.co.

### OUTBOUND (what this page can send you to — the point of the card)

| affordance                                                       | goes to                                                  | owner                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Door 1 — **Start planning**                                      | pre-auth draft POST → `app.motir.co/sign-in?draft=<id>`  | MOTIR-1458 (receiver, `done`) · MOTIR-1462 (carried panel, `done`) |
| Door 2 — **Import**                                              | `app.motir.co/sign-in?intent=import`                     | 7.15 / MOTIR-930 (wizard design) · 7.17 (Jira / Linear / Plane)    |
| Door 3 — **Start free** (nav + hero line)                        | `app.motir.co/sign-up?intent=tracker`                    | MOTIR-655 (8.2 team first-run) · MOTIR-3639 (the intent hand-off)  |
| Nav — **Sign in**                                                | `app.motir.co/sign-in`                                   | shipped                                                            |
| Nav — **Explore**                                                | `app.motir.co/explore`                                   | Story 6.13 (the project square), shipped                           |
| Nav — **Docs**                                                   | `app.motir.co/docs`                                      | Story 11.4, shipped                                                |
| Nav — **Design**                                                 | `motir.co/design` — the ONE internal destination         | MOTIR-1043 (the public design showcase), shipped 2026-08-29        |
| Open-core block — **Motir on GitHub**                            | `github.com/moooon-B-V/motir-core`                       | —                                                                  |
| Footer — Start free · Sign in                                    | the bar's own two doors, repeated at the foot            | as the bar                                                         |
| Footer — Explore projects · Docs · GitHub                        | `app.motir.co/explore` · `/docs` · the source repository | as the bar, plus the repository                                    |
| Footer — Privacy Policy · Terms of Service · All legal documents | `app.motir.co/legal/*`                                   | MOTIR-1134, shipped                                                |
| Directory badges                                                 | outbound to Product Hunt / G2 / GitHub / AlternativeTo   | **MOTIR-1156** (8.3.9) fills the slots; this asset draws them      |

### ⚠️ What this page explicitly does NOT draw

**No connect UI. No import-source picker. No index or generate step. No chat.** Door 2 is a
marketing entry point and nothing more: the repository connection, the source selection, the code
read and the generate step are all owned by the 7.15 migrate wizard (design **MOTIR-930**,
orchestration MOTIR-931) and by 7.17 for Jira, Linear and Plane. Door 1 draws an idea box, not the
discovery chat — the conversation is 7.3's surface and begins after auth. Re-drawing any of it here
would duplicate a design that already exists and would drift from it the day it changes.

**And no pricing page, no product page, no blog.** ⚠️ **CORRECTED 2026-08-30 (MOTIR-4028) — this
paragraph used to say the footer _"names them as plain labels, exactly as `ExploreFooter` already does
for the pages that do not resolve"_, and the page shipped the opposite rule.**
`app/_components/SiteFooter.tsx` states it in its own header: _"EVERY ITEM HERE RESOLVES, AND THE ONES
THAT DO NOT ARE ABSENT RATHER THAN DRAWN AS LABELS"_ — it applies to the footer the rule this asset
already applied one section up, where `Product` and `Pricing` are dropped from the nav because they
"render as dead text there". So there is no pricing, product or blog row at all, in the page or in this
asset; when those pages land they arrive with their own strings and their own links. Never as dead links
a crawler would follow into a 404, and now not as dead labels either.

---

## Surfaces / panels (inspect every panel)

### Panel 1 — the landing, desktop, light (1280)

- **Top bar.** The 26 px horizontal brand lockup at the extreme left (glyph
  `--el-accent-on-surface`, wordmark `--el-text`, the §3 proportions: `0.72 ×` and `0.33 ×` the
  glyph box). Nav — `Explore`, `Docs`, `Design` — as `--el-text-secondary` at 13.5 px / 400.
  **`Design` is the ONE internal destination in this bar** (`motir.co/design`, MOTIR-1043); every
  other item leaves the origin, which is why the page makes it a `next/link` and the rest plain
  anchors. Its current-page treatment is not drawn here — motir.co's root is never that page — and
  lives in `design-showcase.mock.html`. Right cluster: `Sign in` as a
  ghost `Button`, `Start free` as a primary `Button` with `ArrowRight`. `--el-surface-soft` fill on
  an `--el-border` hairline, matching `ExploreTopBar`.
- **Hero, centred, 720 px column.** The _Build with AI_ eyebrow chip on `--el-tint-lavender`; a
  serif `<h1>` at 46 px / 1.1 / `-0.02em`; a 16 px lede in `--el-text-secondary` naming the three
  pillars in one sentence.
- **The FORK — doors 1 and 2, co-equal.** A two-column grid at equal width. Each door is a `Card`
  on an `--el-accent` border with `--shadow-elevated`, opening with a tinted icon tile + `<h2>` +
  one line, and closing on a footer row divided by an `--el-border-soft` hairline with a primary
  `Button`. **Door 1** carries the mono field label and the textarea; **door 2** carries its three
  source rows. They stretch to equal height. One hint line, centred, sits under both.
- **Door 3's second half** — one centred line: _"Just want project management? **Start free** — boards,
  sprints and a backlog, with no AI in the way."_ `Start free` is an `--el-link` text link.
- **The three pillars**, on an `--el-surface-soft` band. The band opens on a centred head of three
  parts — a mono **eyebrow** (11 px / 600, uppercase, 0.06em, `--el-text-secondary`), a serif `<h2>`
  and a lede — then a 3-column grid of `Card`s, each with a tinted 40 px icon tile (lavender / sky /
  mint), an ordinal, an `<h3>` and two lines of body. The three are named exactly: **AI planning ·
  project management · agent orchestration.** (The eyebrow is MOTIR-4000's; the asset drew the `<h2>`
  and the lede alone until 2026-08-30, while the page had shipped all three since `b3c2836`.)
- **Open-core framing**, a full-width row under the pillars: a peach `GitFork` tile, the GPL-3.0
  statement, and a link to the source. It is not a fourth pillar and is not drawn as one.
- **Social proof / directory badges**, a quiet centred band: a mono caption and four dashed **slots**.
  The slots are drawn; what goes in them is MOTIR-1156's.
- **Footer**, four columns on `--el-surface-soft`, mirroring `ExploreFooter`: a brand column of the
  22 px lockup and **two** paragraphs — the platform tagline, then the open-source line — followed by
  **PRODUCT** (Start free · Sign in) · **RESOURCES** (Explore projects · Docs · GitHub) · **LEGAL**
  (Privacy Policy · Terms of Service · All legal documents), then a legal strip reading
  _"© 2026 moooon B.V. · Motir is a product of moooon B.V."_ Eight links, every one of which resolves.
  (Until 2026-08-30 this asset drew `PRODUCT · EXPLORE · COMPANY`, twelve links of which four
  resolved, and a one-line brand block — MOTIR-4028.)

### Panel 2 — the landing, mobile (390)

Everything reflows to one column — the footer included, which is what the page does below the `sm`
breakpoint (`grid gap-8 … sm:grid-cols-2`), so the brand block and all three columns stack. **All
three nav links — `Explore`, `Docs`, `Design` — collapse behind the menu button, together with
`Sign in`; the two things that survive into the bar are the brand and `Start free`** — door 3's nav
half is the last thing to go, not the first, because it is the only door in the bar. The open panel
is deliberately not drawn: it is those same four items in a stack, and this board is about the BAR.
The doors keep their order and their weighting: the idea box is still the fold, the import row still
sits under the `OR`, the tertiary line still reads as a line. The pillars stack under the same
three-part band head — the eyebrow survives the reflow, as it does on the page — the open-core row
follows them, and the badge band draws its four slots.

**⚠️ This board used to ABBREVIATE, and an abbreviation is indistinguishable from a claim
(MOTIR-4028).** It drew two-thirds of a footer, three badge slots, no band lede, no open-core row and
its own shortened pillar bodies — none of which the page does at 390. A reader cannot tell a board
that omits an element from a page that does not have one, which is the same defect as the missing nav
entry one line up, so the mobile board now draws everything the desktop board draws.

### Panel 3 — door 1's four states

| state             | what it draws                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **empty (rest)**  | The textarea holds focus on load; the visible focus ring is a 2 px `--el-accent-on-surface` outline at 2 px offset. **Submit is ENABLED on an empty idea** — the box is a head-start, not a gate, exactly as the `/onboarding` entrance decided. The counter is present but `visibility: hidden`, so revealing it later never reflows the footer row. |
| **typing**        | The counter appears on the first keystroke, reading `<n> / 2000`.                                                                                                                                                                                                                                                                                     |
| **submitting**    | The button LABEL changes to _Starting…_ beside a spinning `LoaderCircle`, the control takes `aria-busy`, and the textarea is disabled so a second submit cannot double-POST the draft.                                                                                                                                                                |
| **submit-failed** | A `role="alert"` banner between the textarea and the footer: an `--el-danger` hairline over `--el-danger-surface` with `--el-danger-on-surface` ink and a `CircleAlert` glyph. **The typed idea is never cleared** — the banner says so. Two exits: _Try again_, and _Continue to Motir_ → `app.motir.co/sign-up`.                                    |

**Why the 2000-character counter is not decoration.** `motir-core/lib/onboarding/pendingIdea.ts`
sets `MAX_PENDING_IDEA_LENGTH = 2000` and `normalizePendingIdea()` **truncates** rather than rejects.
A visitor who pastes four thousand characters silently loses half of them somewhere between this box
and the discovery chat, and the only place that can be made visible is here. The `textarea` also
carries `maxlength="2000"` so the browser enforces the same bound the server will.

**Why the failure state is drawn at all.** Door 1's submit is a **cross-origin POST between two
different origins on two different Fly apps**. It can fail for reasons that have nothing to do with
the visitor — CORS, a cold machine, a network blip — and a hero that draws only the happy path
leaves that moment to be improvised by whoever implements it, at the exact instant a first-time
visitor has just typed the most valuable thing they will type all session.

### Panel 4 — dark theme

The same surface with no second design: every colour is the same token resolving to its Tier-1 dark
value. The panel exists because one measured constraint only shows up there (below).

### Panel 5 — the routing map

The three doors as rows, each with its exact target URL and its landing surface, and each stamped
`SHIPPED` or `NOT READ YET`. This panel is the routing contract in one picture; the table above is
the same thing in prose.

---

## Primitives composed (no hand-rolling)

| Element                         | Shipped primitive / pattern                                                 | Token role                                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand lockup (bar, footer)      | `BrandMark` / `@motir/brand` `.brand-lockup` — the §3 reference CSS, copied | glyph `--el-accent-on-surface`; wordmark `--el-text` on `var(--font-sans-source)`, the raw FACE variable, **never `--font-sans`** (three `[data-type]` blocks re-point the role token and would re-letter the mark) |
| Top bar                         | the `ExploreTopBar` header pattern                                          | `--el-surface-soft` fill, `--el-border` bottom hairline, `--spacing-card-padding` inline                                                                                                                            |
| `Start free` / `Start planning` | `Button` `variant="primary"`, `rightIcon={<ArrowRight/>}`                   | `--el-accent` / `--el-accent-text`; `--radius-btn`, `--height-btn-md` (`--height-btn-sm` in the bar)                                                                                                                |
| `Sign in`                       | `Button` `variant="ghost"`                                                  | `--el-text`; `--el-muted` hover fill                                                                                                                                                                                |
| The two fork doors              | `Card`, one grid track each                                                 | `--el-page-bg` on an `--el-accent` border + `--shadow-elevated`; `--radius-card`. **Identical on both — that identity IS the co-equality**                                                                          |
| Idea box (door 1)               | `Card` + `textarea`, continuing the entrance                                | transparent input fill; `--el-border-soft` footer hairline                                                                                                                                                          |
| Source rows (door 2)            | option rows, as the entrance's import row                                   | `--el-page-bg` on `--el-border` (→ `--el-border-strong` + `--el-surface-soft` on hover), `--radius-input`                                                                                                           |
| Idea field label                | mono uppercase label                                                        | **`--el-text-muted`** — see the deliberate divergence below                                                                                                                                                         |
| Character counter               | mono inline label                                                           | `--el-text-muted`                                                                                                                                                                                                   |
| Door icon tiles                 | tinted squares                                                              | `--el-tint-lavender` (door 1) / `--el-tint-sky` (door 2); ink `--el-text-strong`; `--radius-control`                                                                                                                |
| `Build with AI` eyebrow         | badge chip (as on the entrance)                                             | `--el-tint-lavender` bg, `--el-text-strong` ink, `--radius-badge`, `--spacing-chip-x/y`                                                                                                                             |
| Door-3 line                     | inline text link in body copy                                               | `--el-link`; underline on hover                                                                                                                                                                                     |
| Pillar cards                    | `Card`                                                                      | `--el-page-bg` on `--el-border`, `--shadow-subtle`, `--spacing-card-padding`                                                                                                                                        |
| Pillar icon tiles               | tinted squares                                                              | `--el-tint-lavender` / `--el-tint-sky` / `--el-tint-mint`; ink `--el-text-strong`; `--radius-control`                                                                                                               |
| Open-core row                   | `Card` + tinted tile                                                        | `--el-tint-peach` tile; `--el-link` on the source link                                                                                                                                                              |
| Directory badge slots           | dashed placeholder chips                                                    | `--el-surface` fill, `--el-border-strong` dashed edge, `--radius-control`                                                                                                                                           |
| Footer                          | the `ExploreFooter` grid                                                    | `--el-surface-soft` band, `--el-border` top hairline, uppercase `--el-text-secondary` headings                                                                                                                      |
| Error banner (state D)          | callout box + `CircleAlert`                                                 | `--el-danger-surface` fill, `--el-danger` hairline, `--el-danger-on-surface` ink, `--radius-input`                                                                                                                  |

Icons are **lucide** at `viewBox="0 0 24 24"`, stroke 2, round caps, matching every shipped surface.

### Colour + shape rules (mock === component)

- Every product colour resolves to an `--el-*` token, or to a `color-mix()` whose inputs are both
  tokens (`--el-danger-on-surface`). **No invented hues.** The only raw values in the file are the
  non-semantic elevation shadows and the doc-annotation scaffold (the sheet, panel captions, ref
  chips, viewport rulers), which are not product UI.
- Shape flows through element-semantic tokens — `--radius-card` / `-btn` / `-input` / `-control` /
  `-badge` / `-kbd`, `--spacing-card-padding` / `-chip-x` / `-chip-y`, `--height-btn-md` /
  `-btn-sm` — never a raw `rounded-md` / `p-2` / `h-9`, so a `data-style` swap re-shapes the page.
- The mock declares the `--el-*` layer TWICE, once at `:root` for light and once on a `.dark` class
  for dark, because `--el-*` are declared with `var(--color-*)` in the real stylesheet and `var()`
  substitutes at the DECLARING element — a nested `data-theme="dark"` alone flips nothing (the
  MOTIR-3592 shape). Restating the resolved values is what lets Panel 4 sit beside Panel 1 in one
  static file.

### One deliberate divergence from the entrance, on the record

The `/onboarding` entrance paints its `YOUR IDEA` field label `--el-text-faint`. **This asset uses
`--el-text-muted` instead.** `theme.css`'s own comment on `--el-text-faint` is unambiguous: it
_"NEVER CARRIES TEXT WCAG MEASURES — 2.37–2.82:1 on every surface in BOTH themes"_, and it is for
decorative glyphs and disabled text, both of which WCAG exempts. A field label is active
informational text and is neither. `--el-text-muted` is 4.54:1 on the white card, which is the token
the same comment names for exactly this case. The visual difference is a half-step of grey; the
difference in kind is that one of them is measurable.

---

## Accessibility

Measured from the literal token values in `packages/design-system/theme.css` (`motir` palette), both
themes. Text takes WCAG 1.4.3's **4.5:1**; a focus indicator and a graphical object take 1.4.11's
**3:1**.

| element                                                                  | ink → surface                                    | light                | dark                  | bar              |
| ------------------------------------------------------------------------ | ------------------------------------------------ | -------------------- | --------------------- | ---------------- |
| `<h1>`, pillar headings, import-row title                                | `--el-text` → page                               | 17.40:1              | 17.42:1               | ≥4.5 ✓           |
| lede, hints, nav, footer body                                            | `--el-text-secondary` → page                     | 6.80:1               | 7.35:1                | ≥4.5 ✓           |
| pillar body, nav on the bar, pillars eyebrow, footer legal strip [^band] | `--el-text-secondary` → `--el-surface-soft`      | 6.51:1               | 6.94:1                | ≥4.5 ✓           |
| eyebrow chip ink                                                         | `--el-text-strong` → `--el-tint-lavender`        | 9.54:1               | 11.71:1               | ≥4.5 ✓           |
| icon-tile glyphs (sky / mint / lavender)                                 | `--el-text-strong` → the tint                    | 10.17 / 10.43 / 9.54 | 11.61 / 11.29 / 11.71 | ≥3 ✓             |
| primary Button label                                                     | `--el-accent-text` → `--el-accent`               | 6.57:1               | 4.99:1                | ≥4.5 ✓           |
| brand glyph                                                              | `--el-accent-on-surface` → `--el-surface-soft`   | 6.29:1               | **5.76:1**            | ≥3 ✓ (graphical) |
| door-3 text link                                                         | `--el-link` → page                               | 4.94:1               | 7.59:1                | ≥4.5 ✓           |
| idea field label, counter                                                | `--el-text-muted` → `--el-page-bg`               | 4.54:1               | **7.35:1** [^muted]   | ≥4.5 ✓           |
| error banner ink                                                         | `--el-danger-on-surface` → `--el-danger-surface` | **5.77:1**           | **4.75:1**            | ≥4.5 ✓           |
| focus ring                                                               | `--el-accent-on-surface` → page                  | 6.57:1               | **6.11:1**            | ≥3 ✓             |

[^muted]:
    **CORRECTED 2026-08-29 (MOTIR-3874), and it is not a version move — the row's two cells were
    measured on two different surfaces.** `--el-text-muted` → `--el-page-bg` is **4.54:1 light /
    7.35:1 dark**; the **6.67:1** that stood here is that ink on **`--el-surface`**, whose own light
    arm is **4.17:1 — under AA**. `.idea` is `background: var(--el-page-bg)`, so `--el-page-bg` is
    the surface this row is about and the corrected numbers both pass. Identical on 0.1.0 and 0.1.1,
    so nothing about the pin caused it; it surfaced because MOTIR-3874 re-ran every row of this
    table against the installed package rather than only the rows it expected to have moved. **The
    4.17 is worth carrying forward**: `--el-text-muted` on a raised surface is the class motir-core
    swept and guarded in MOTIR-2477, and nothing in this repository guards it.

[^band]:
    **The legal strip and the pillars eyebrow JOINED this row on 2026-08-30 (MOTIR-3984); both were
    `--el-text-muted` on the same band and both shipped.** See the section directly below.

### ⚠️ The MUTED ink on the BAND — the pair this page SHIPPED and no list measured (MOTIR-3984, 2026-08-30)

**The same pair as the showcase half's section of the same name, one surface over, and in RUNTIME CODE
rather than in an asset** — so unlike MOTIR-3874 and MOTIR-3931 this one was live on motir.co, on every
route the site has, rather than a picture a future card would have built from.

`--el-text-muted` at 11–12px on `--el-surface-soft` is **4.34:1** in the light `motir` palette. 1.4.3
asks 4.5:1 of text that size, and `motir` is the palette a first-time visitor is served. `theme.css`
states the figure at the token's own declaration and adds the rule in its own words — _"a muted caption
belongs inside a card, never on a panel"_ (MOTIR-2455). **Two elements painted it:**

| element                             | file                                 | its band                      | ratio    |
| ----------------------------------- | ------------------------------------ | ----------------------------- | -------- |
| the footer's legal strip, 12px      | `app/_components/SiteFooter.tsx`     | the footer's own `.foot` band | **4.34** |
| the pillars section's eyebrow, 11px | `app/_components/Pillars.tsx`        | `app/page.tsx`'s band section | **4.34** |
| _(the mock's own `div.legal`, ×2)_  | `design/marketing/landing.mock.html` | `footer.foot`                 | **4.34** |

**Both moved to `--el-text-secondary`** — 6.51:1 on that band, the ink the rest of the footer and the
pillar bodies already use — rather than onto a card surface, which is what the showcase half did and is
right there because the rail's rows are a card-shaped thing. A legal strip and a section eyebrow are not.
The `.ord` line inside each pillar KEPT `--el-text-muted`: it sits in a `Card` on `--el-page-bg` at
4.54:1, and leaving it is what makes the rule legible as two columns rather than as a sentence.

**The mock and the component moved in ONE pull request, and the order matters.** Until the component
changed, `landing.mock.html` was CORRECT about what shipped — so correcting the asset first would have
made it draw a page that did not exist, which is the exact defect MOTIR-3931 was filed about, inverted.
`landing.png` is re-exported with them, at the same 1320 × `deviceScaleFactor: 2` viewport as before
(2640 × 14762 both times — the geometry is a control on the re-export). **It is `2640 × 14860` as of
MOTIR-4000**: the eyebrow costs a 16.5 px line box plus an 8 px margin, so **24.5 CSS px per board** and
`2 × 24.5 × 2 = 98` device px in a two-board export. The control still holds and is what makes that
arithmetic a reading rather than a story — re-rendering the UNMODIFIED mock from `origin/main` returns
`2640 × 14762`, the committed dimensions, with different bytes (`sha256` `5aeaf19d…` committed against
`60687ca3…` re-rendered): MOTIR-4003's `DIMS`, a renderer-build difference with no reflow. So the height
in this diff is the element, and nothing else is.

#### ⚠️ AND THE SAME QUESTION ASKED OF THE WHOLE PAGE RETURNED TWENTY — swept 2026-08-30 (MOTIR-4028)

The eyebrow was found by asking _"is this ONE element in the asset?"_. **The instrument that answers
it for the whole page is a two-directional STRICT text diff** — the production build and the mock
board both loaded in headless chromium, every VISIBLE element carrying its own text node collected
with its resolved size / weight / family / transform / tracking / ink, the two sets compared on
EXACT normalised text:

```
$ node treeDiff2.mjs http://127.0.0.1:3428/ design/marketing/landing.mock.html "section.panel:nth-of-type(1)" 1280
```

| ref                                        | shipped | mock board | in the SHIPPED page, absent from the board |
| ------------------------------------------ | ------- | ---------- | ------------------------------------------ |
| `origin/main` `be86ebb`, before            | 61      | 68         | **20**                                     |
| this diff, after                           | 61      | 65         | **0**                                      |
| `origin/main` `be86ebb`, 390 board, before | 57      | 53         | 21                                         |
| this diff, 390 board, after                | 57      | 63         | **0**                                      |

The twenty were **1** element the asset never gained (the `Design` nav entry), **8** footer
divergences (a different column SET, 12 links against 8, a one-line brand block against two
paragraphs) and **11** strings the site had re-written since the asset was drawn. Every one is
resolved by moving the ASSET to the page: the shipped copy, footer and nav are the specification,
and no runtime file is touched.

**What survives on the mock side is the doc-annotation chrome and nothing else** — four elements per
board, the same four: the panel NUMBER, the panel CAPTION, the panel NOTE and the `viewport …` rule.
They are the board's own scaffolding and have no counterpart in a page.

**Exact equality is load-bearing, and this is the sentence to keep.** A first pass matched loosely
(`a.includes(b) || b.includes(a)`) and reported **4**; the same data under exact equality reports 21.
`Docs` matched `Documentation`, `Explore projects` matched `Explore`, `All legal documents` matched
`All legal`. **A matcher that matches MORE than the claim under-reports** — here by a factor of five.

**And a board that ABBREVIATES is making a claim it does not know it is making.** The 390 board drew
two-thirds of a footer, three badge slots, no band lede and no open-core row, plus its own shortened
pillar bodies. None of those is a re-written string, so a diff of the desktop board never sees them
and a reader cannot tell an omission from a page that does not have the element. That is the same
defect as the missing nav entry, in the direction nothing measures, so the 390 board now draws
everything the page draws at 390 — including the ONE-column footer the page reflows to there.

**The export, and why its height is attributable.** Re-rendered at the same 1320 × `deviceScaleFactor: 2`
viewport, light, full page:

| render                                                       | dimensions         | `sha256` (12)  |
| ------------------------------------------------------------ | ------------------ | -------------- |
| the committed `landing.png` (MOTIR-4000's)                   | `2640 × 14860`     | `026e19bb198f` |
| re-render of the UNMODIFIED `origin/main` mock (the control) | `2640 × 14860`     | `5486d9fae077` |
| this diff                                                    | **`2640 × 16628`** | `5d2f18c1988a` |

The control reproduces the committed DIMENSIONS and not the committed BYTES — MOTIR-4003's `DIMS`
verdict, a renderer-build difference with no reflow — so the height in this diff is the content and
nothing else. **The renderer changed because the repository now HAS one:** MOTIR-4001 added
`playwright` as a devDependency here, whose chromium is **151.0.7922.34**, where every earlier design
card in this area borrowed `motir-core`'s at **148.0.7778.0**. MOTIR-4000 predicted this control would
report `EXACT` after its own re-export; it reports `DIMS`, and the browser version is why.

#### ⚠️ THE CARD SAID ONE ELEMENT AND THE SITE PAINTED TWO — and the reason is the third occurrence of one shape

MOTIR-3984 was filed naming **the footer alone** (_"One element is on the wrong ink"_), and both sites
predate it by two days — `git log --diff-filter=A` dates them both to `b3c2836` (2026-08-28,
MOTIR-1152), so the enumeration was **wrong when it was written** rather than drift. It was taken by
scanning the MOCK and reading the footer, and the mock **does not draw the pillars eyebrow at all**, so
that element could not appear in the count however carefully the scan was run.

**That is the same failure this section is about, one level up.** A pair list is written by whoever
already knows which pairs to write; an asset scan can only measure what the asset happens to depict; and
this a11y table — which had a row for the muted ink on `--el-page-bg` and none for it on the band —
certified the question that prompted it and stayed silent about the rest. Three instruments, three
different populations, all of them green.

**So the guard moved onto the ELEMENTS of the shipped pages.** `tests/aaMatrix.test.ts` now renders `/`
and `/design`, reads every ink/surface pair they put on screen (`tests/support/paintedInks.ts`), and
rules each against the same 10-palette × 2-theme matrix — so a pair nobody thought of is measured
exactly like one somebody did. Its `PAIRS` list also gained `--el-text-muted` / `--el-text-eyebrow` /
`--el-text-helper` against `--el-surface-soft`, `--el-surface` and `--el-muted`, carrying a `below-AA`
verdict: the three are aliases of one value, and a pair the site must NOT paint is now stated rather
than expressed by being absent from a list, where it was indistinguishable from one nobody considered.
Those rows are themselves asserted to still fail, so a republish that lifts them turns the file red
instead of leaving a ban that has quietly become folklore.

**The element scan, run over this asset after the change** (headless chromium, every text-bearing
element ruled at its own size and weight, the harness of _How this asset was measured_): **0 findings in
the product layer**, down from 2. The 19 that remain are the doc-annotation scaffold — the panel
captions, the `viewport …` rules, the measurement lines, at 4.09:1 — which are MOTIR-3985's, together
with the 35 in the showcase mock.

> **⚠️ THOSE 19 ARE GONE — MOTIR-3985 swept them the same day, and the sentence above is kept as the
> record of what the count WAS.** The scan over this asset on `origin/main` at `c470db2` returns **0
> findings, light and dark**; the same harness against the pre-sweep mock (`git show
3035904:design/marketing/landing.mock.html`) returns **19**, all light, all at 4.09:1. That second
> run is the control: a scan that reports zero is only worth the reading if it can still be made to
> report something.

#### ⚠️ AND THE ASSET WAS MEASURED GREEN FOR AN ELEMENT IT DID NOT DRAW — repaired 2026-08-30 (MOTIR-4000)

The paragraph above is the third occurrence of one shape and it names the instrument correctly. **What
it could not say is that its own instrument had the same hole**: `div.band-head` drew `<h2>` and `<p>`
only, in both boards, so the eyebrow `app/_components/Pillars.tsx` opens the band with was not in the
asset, was therefore not in the population the element scan walks, and could not appear in any count
however carefully the scan was run. **The scan reported 0 and the number was correct**; the SET it was
correct about was not the set the sentence was about.

**MOTIR-4000 draws it, in both boards** — `.band-head .band-eyebrow`, 11px/600 mono, uppercase, 0.06em,
`--el-text-secondary`, the string `A vibe project` from `messages/en.json`. Every value is read off the
RENDERED component (production build, `getComputedStyle`), not off its Tailwind classes: `11px` /
`600` / `JetBrains Mono` / `uppercase` / `0.66px` / `rgb(93, 91, 84)` / `16.5px` line box / `8px`
bottom margin, and the mock reads back the same nine values in both boards. It is `--el-text-secondary`
and not `--el-text-muted` for the reason the component's own comment gives, and it clears at **6.51:1**
on the band.

**The number that shows the repair is the POPULATION, not the findings.** Findings went `0 → 0` — the
eyebrow was never an AA defect. The scanned population went **242 → 244**: two elements the instrument
could not previously see, which is the entire content of the fix.

**And the same question, asked once of the whole page, returns twenty more.** A two-directional strict
text diff of the SHIPPED landing (production build, 1280) against this board reports **21** elements the
site paints and the asset does not — the eyebrow, and twenty others: the `Design` nav entry `/design`
gained on 2026-08-29, a footer whose column set and link set are both different, and eleven strings the
copy has since re-written. Those twenty are **MOTIR-4028**, not this card. Two notes on the measurement,
because both are the difference between a number and a guess: it was run with EXACT text equality, and
the same data under a substring matcher reports **4**; and the count is dated — a later run that answers
anything but 20 should date the difference rather than absorb it.

### ⚠️ The measured constraint this design routed around — RETIRED 2026-08-29 (MOTIR-3874)

> **The three rows above marked in bold moved because the PACKAGE moved, not because anything was
> re-measured more carefully.** ~~`--el-accent-on-surface` as TEXT on `--el-surface-soft` is 4.41:1
> in the dark theme — under AA. That is the exact pairing `ExploreTopBar` ships for its
> `aria-current` nav item at 13.5 px semibold, which is not WCAG large text. So the landing's top bar
> paints no accent-coloured text at all.~~ **On the pinned `@motir/design-system@0.1.1` that pair is
> `5.76:1` and passes AA** — MOTIR-3745's `color-mix()` lift, published by MOTIR-3872. The
> prohibition is gone with its premise; see _The nav entry_ below for what replaced the treatment it
> shaped.

**Nothing on THIS page changes, and that is a property of the page rather than of the number.**
motir.co is the root: none of its nav items is ever the current page, so there was nothing to mark
here either way. The nav is `--el-text-secondary` (6.94:1 dark), the CTA is a filled `Button` (white
on `--el-accent`, 4.99:1 dark), and the brand glyph keeps `--el-accent-on-surface` — which is now
5.76:1 rather than 4.41:1, and was never at risk anyway as a graphical object at 3:1.

**The motir-core defect was FILED, not absorbed: MOTIR-3745** — `done` — together with the reason
nothing caught it (`motir-core/tests/theme/inkContrastLint.test.ts` had a faint arm, a muted arm and a danger
arm, and no accent arm, so this ink was unmeasured on every surface in every palette). The publish +
pin that carried the fix here is **MOTIR-3872**, and the correction to this asset is **MOTIR-3874**.
**MOTIR-1152 may now use the accent ink for a current nav item** — and on this page still has no
item to mark.

### The rest of the a11y contract

- **Exactly one `<h1>`** per page — the hero headline. Heading order is `h1` → `h2` (**each of the
  two fork doors**, the pillars' band heading, the footer's column headings) → `h3` (each pillar, the
  open-core row); no level is skipped and none is chosen for its size. **The two doors take the SAME
  level, and that is a co-equality requirement rather than a formatting one** — a screen-reader user
  navigating by heading meets two peers, which is the whole decision expressed in the one channel
  where the visual treatment does not reach.
- **The brand lockup's accessible name comes from the visible wordmark**, and the glyph is
  `aria-hidden` — never both, per the brand notes §8. It is a lockup, so it is decorative + visible
  text, not an `aria-label`.
- **Door 2's three sources are real links, each its own focusable row** with a visible ring, not one
  card with a single target — a co-equal door that is one big click target while its peer is a rich
  form is not co-equal in the tab order either.
- **Every icon in the page is `aria-hidden`**: each one sits beside text that carries the meaning.
  The mobile menu button, which has no visible label, takes `aria-label="Menu"`.
- **The idea textarea has a real `<label for>`**, not a placeholder standing in for one — the
  placeholder is an example, and it disappears the moment somebody types.
- **Focus is always visible**: a 2 px `--el-accent-on-surface` outline at 2 px offset on every
  interactive element, including the import row (a link styled as a card) and the two links inside
  the error banner.
- **No state is carried by colour alone.** Submitting changes the button's LABEL as well as its
  glyph; the error banner carries an icon and a sentence as well as a red edge; the badge slots are
  dashed and captioned rather than merely tinted.
- **Reduced motion:** the only animation in the page is the submit spinner, and it is disabled under
  `prefers-reduced-motion: reduce`, leaving the static glyph and the changed label — which is why
  the label change is not optional.
- **Dark parity holds** — every row of the table above passes in both themes, and Panel 4 renders
  the dark theme so the claim is looked at rather than asserted.
- **Images:** the page draws no photography or logos of its own. The directory badges (MOTIR-1156)
  will each be an image and each owes real `alt` text naming the directory — recorded here because
  the slots are drawn here and the images are not.

---

## Which card owns each destination (connect, don't duplicate)

| Destination / element shown                      | Owner (design → build)                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| This layout, its three doors, its states         | **MOTIR-1143 (this asset) → MOTIR-1152 (build)**                         |
| The words on it                                  | MOTIR-1144 (8.3.4)                                                       |
| The pre-auth idea hand-off                       | MOTIR-1458 (`done`) → the entrance's carried panel, MOTIR-1462 (`done`)  |
| The `/onboarding` entrance the hero hands off to | MOTIR-1461 (design) / MOTIR-1462 (router)                                |
| The import wizard behind door 2                  | 7.15 / MOTIR-815, design MOTIR-930 · 7.17 / MOTIR-817                    |
| The no-AI first-run behind door 3                | MOTIR-655 (8.2) · the intent hand-off, MOTIR-3639                        |
| The brand mark and its lockup CSS                | MOTIR-1139 (design) / MOTIR-1150 (applied) / MOTIR-1456 (`@motir/brand`) |
| The tokens and primitives                        | MOTIR-1524 → `@motir/design-system@0.1.0`                                |
| The directory badges' content                    | MOTIR-1156 (8.3.9)                                                       |
| SEO entity signals, root OG, `robots`, sitemap   | MOTIR-1154 (8.3.7)                                                       |
| The repo, the domain, the Fly app, CI            | MOTIR-1455 (`done`)                                                      |

---

## Open findings this design surfaced (filed, not deferred)

| finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | card                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| ~~`motir-marketing` is provisioned but **not connected to Motir**, so `targetRepo` is refused and a merge in this repository moves no card~~ — **CLOSED: 3743 `done`; pins and `link_pull_request` both work here, see below**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **MOTIR-3743** (pre-existing; this card is `relates_to` it)                                    |
| ~~`?intent=import` has **no reader and no owning card**~~ — **CORRECTED 2026-08-28: it has an owner, MOTIR-3846**, carved from this finding; the twin's is MOTIR-3639. Still NOT READ on `origin/main` until 3846 ships                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **MOTIR-3746** → **MOTIR-3846**                                                                |
| ~~`--el-accent-on-surface` is **4.41:1 on `--el-surface-soft` in dark** (`ExploreTopBar`'s current-page nav item), and the ink lint has no accent arm~~ — **CLOSED: 3745 `done`, published as 0.1.1 by 3872, pinned here; 5.76:1 on the pinned version**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | **MOTIR-3745** → **MOTIR-3872** → **MOTIR-3874**                                               |
| This repository runs **no design-result publish lane**, and a `<name>.design-notes.md` basename is invisible to the classifier in either repository — **but a lane is no longer how a result is published; see below**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **MOTIR-3750**                                                                                 |
| ~~**This asset does not draw the pillars EYEBROW `app/_components/Pillars.tsx` ships** (`div.band-head` has `h2` + `p` only, in both boards) — so the element scan of the mock is structurally unable to see anything that element carries~~ — **CLOSED 2026-08-30: both boards draw it; the scan's population went 242 → 244 and its findings stayed 0**                                                                                                                                                                                                                                                                                                                                                                                  | **MOTIR-4000** (filed by MOTIR-3984, `blocked_by` MOTIR-3985 — both re-exported `landing.png`) |
| ~~**And the same question asked of the WHOLE page returns twenty more** — the `Design` nav entry (`/design`, shipped 2026-08-29), a footer whose column set (`PRODUCT · RESOURCES · LEGAL` against the asset's `PRODUCT · EXPLORE · COMPANY`), link count (8 against 12) and brand block all differ, and eleven strings the copy has since re-written~~ — **CLOSED 2026-08-30: re-measured at `origin/main` `be86ebb` as exactly **20**, the same members; the shipped-side list of BOTH boards is now empty and the scan's population went 244 → 252 with its findings unchanged.** Measured, not asserted: a strict two-directional text diff of the production build against the board, EXACT equality (a substring matcher reports 4). | **MOTIR-4028** (filed by MOTIR-4000, `blocked_by` it — both re-export `landing.png`)           |

**⚠️ AND THE MISSING LANE NO LONGER STOPS A DESIGN RESULT REACHING THE CARD (MOTIR-3874).** MOTIR-3780
retired the branch-derived publisher in every repository: the AGENT publishes, by naming its own card
in a **`publish_design_result`** MCP call, so a repository with no lane is not a repository whose
design results cannot be published. Measured here rather than assumed — this card's own result
published from this repository at `2026-08-29T11:42:47Z`, five assets, evidence
`cmteba0wu0070hvn8i4rfe5yb`. **So a design card in `motir-marketing` OWES that call — when an open work item is `blocked_by` it (MOTIR-5493; a design nothing waits on publishes nothing)**, and MOTIR-3750
is now only about the classifier's basename rule. (There is no MCP read-back door for a published
result — `get_work_item` carries no field for it — so the receipt id the call returns is the evidence
a run can quote; the reviewer reads the result on the card in Motir.)

**⚠️ CORRECTED 2026-08-29 (MOTIR-3874) — MOTIR-3743 IS `done`, AND THE PARAGRAPH BELOW NOW READS
BACKWARDS FOR THE ONE RUNNER IT WAS WRITTEN FOR.** ~~Consequence of MOTIR-3743 for this repository,
worth stating where the next runner will read it: until `motir-marketing` is connected, no card in it
can carry a `targetRepo` pin, `link_pull_request` is refused, and the `Motir / work item link` check
never runs — so **a merge here closes nothing, and every card delivered in this repository has to be
transitioned by hand.** That is four cards in Story 8.3 today (MOTIR-1143, MOTIR-1144, MOTIR-1152,
MOTIR-1154).~~

**`motir-marketing` is connected. `targetRepo` pins are accepted and `link_pull_request` WORKS
here** — measured, not assumed: MOTIR-3872 pins `targetRepo: motir-marketing`, and its card carries a
delivery row for `moooon-B-V/motir-marketing#13` (`linkedManually: true`), which merged at
`10:33:36Z` and took the card to `done` at `10:33:38Z` — the status sync, two seconds later, with
nobody transitioning anything. **So a run in this repository MUST call `link_pull_request` after
`gh pr create`**, exactly as in motir-core; the stale paragraph above told it the opposite, and a
skipped link is the one omission nothing recovers from (the title/branch parse was retired by
MOTIR-3674). A card here still has to be transitioned by hand only if its pull request was never
linked.

---

## Notes for MOTIR-1152 (the build)

1. **Install, do not re-cut.** `@motir/design-system@0.1.0` (tokens, `Button`, `Card`, `Pill`,
   `SectionLabel`) and `@motir/brand` (the lockup + `.brand-*`). Replace
   `motir-marketing/app/globals.css` entirely — its own comment says _"Nothing here should be carried
   forward."_
2. **Replace `app/page.tsx`, do not grow it.** The scaffold says so in its first line.
3. **The 2000-character bound is a contract, not a nicety** — `maxlength` on the control and the
   counter in the footer row, both matching `MAX_PENDING_IDEA_LENGTH`.
4. **Draw all four idea-box states.** The failure state is the one that gets dropped, and it is the
   one a cross-origin POST guarantees you will meet.
5. **Ship doors 2 and 3 with their specified `?intent` parameters** and let them degrade — see the
   disposition above. Do not rewrite them to `?next=` on your own authority.
6. **Do not mark a nav item current in accent ink on the soft bar** (MOTIR-3745).
7. **`robots: disallow: /` stays** until MOTIR-1154 flips it. The landing shipping is not the same
   event as the landing being indexable.
8. **The output target is `output: 'standalone'` + the `Dockerfile`**, not a static export — the Fly
   host implies it (`docs/decisions/marketing-site-hosting.md`), and that constraint belongs to this
   card rather than to MOTIR-1455.
9. **Copy comes from MOTIR-1144**, not from this mock.

## Notes for MOTIR-1144 (the copy)

> **⚠️ THE DIRECTION REVERSED ON 2026-08-30 (MOTIR-4028), and this section is now a SHAPE brief, not a
> source of strings.** `messages/en.json` exists and has shipped; the words on the page are its words.
> **So every string this asset renders that the page also renders is now the SHIPPED string, taken from
> the catalogue or the rendered page and never re-written here** — a mock is product COPY, not a sketch,
> and a reader who transcribes a re-written line into a catalogue has shipped it. The bullets below say
> what each slot has to DO (how long, what register, what it must name); they no longer say what it says.
> The instrument that keeps the two in step is the strict text diff above (§ _AND THE SAME QUESTION ASKED
> OF THE WHOLE PAGE_) — it goes non-zero the moment either side moves.

The layout fixes the shape of what the words have to do, and it is worth having in hand:

- **One `<h1>`, ~6 words**, serif, at 46 px — it wraps to two lines on mobile at ~30 px.
- **A lede of ~2 lines / 56 ch max**, which is where the three-pillar name lands in full.
- **A textarea placeholder that is a worked EXAMPLE**, long enough to show what a good first idea
  looks like — the entrance's is the register to match, and it ends by promising follow-up
  questions.
- **One hint line under the idea box**, ~1 line.
- **Door 2:** a title of ~6 words and a description of ~2 lines that names repositories _and_ Jira /
  Linear / Plane. This is the ONE place `repo` / code / GitHub language is allowed.
- **Door 3:** a single sentence, ~14 words, with `Start free` as the link inside it. It must read as
  an aside, not as a pitch.
- **Three pillar bodies of ~2 lines each**, headed exactly _AI planning_ · _Project management_ ·
  _Agent orchestration_.
- **One open-core paragraph**, ~2 lines, naming GPL-3.0.
- **Terminology:** _agents_, never _hosted coding agents_ — a person can run their own. And agents do
  **all kinds** of work (design, decisions, content, tests, code), so _"takes over the work"_, never
  _"coding agent"_. Outside the import row, no developer jargon at all: a non-technical founder must
  not meet the word _repo_ on the way in.

### ⚠️ Two BANNED words, and this asset shipped both before they were caught

Both are standing rules that predate this card, and both were violated in the first draft of this
mock. They are recorded here because MOTIR-1144 writes the final copy and MOTIR-1152 renders it, and
either can reintroduce them.

- **"tracker" — never customer-facing.** The two customer-facing product names are **Motir** (the
  project-management product) and **Motir AI** (planning + agents). Door 3 is
  _"Start free — project management only"_, and its hero line reads _"Just want project
  management?"_. **The word survives ONLY as a code identifier** — the `?intent=tracker` query
  parameter in the routing table below, the `scaled-tracker` org flag, the
  `tracker_monthly` / `tracker_annual` Stripe price keys. Never as a rendered label.
  ⚠️ **MOTIR-1143's own card body still calls door 3 _"Start free — just the tracker"_** — the card
  is wrong, not this asset; it is flagged for amendment.
- **"issue" — say "work item".** The open-core block originally read _"issues, boards, sprints"_ and
  now reads _"work items, boards, sprints"_.
- **And when copy describes importing, ENUMERATE the products** — _"work items from Jira, Linear or
  Plane"_ — never _"import your tracker"_ or _"a codebase or a tracker"_.

**The check is mechanical, so run it rather than reading for it:**

```
grep -niE 'tracker|\bissues?\b' design/marketing/*
```

Every surviving hit must be a code identifier (`?intent=tracker`) or prose about the rule itself. A
hit in rendered copy, in a mock's markup or in this file's own prose is a defect.

---

# motir.co/design — the public design showcase (`design-showcase.*`)

**Subtask:** MOTIR-3861 · 8.3.14 (`type: design`) · **Story:** MOTIR-656 (8.3 Marketing site + brand
mark) · **Epic 8 · Launch readiness.** **Repository: `motir-marketing`.**

The public page at **motir.co/design** where a visitor switches Motir's three design axes and
watches the whole site restyle. It is a **marketing / credibility surface**, not a token reference:
the argument it makes is _"the design system Motir gives you is the one Motir wears."_

**Asset files (three):** this section of `design-notes.md` (the AREA's note) ·
`design-showcase.mock.html` (the source of truth — standalone, re-stating the shipped `--el-*`
values so it paints without a Tailwind build, exactly as `landing.mock.html` does) ·
`design-showcase.png` (full-page Playwright chromium export, `deviceScaleFactor: 2`, re-exported
with **`pnpm design:render design/marketing/design-showcase.mock.html`** — the area-wide section
_"Re-exporting a `.png`"_ above).

> **⚠️ The note is a SECTION of `design-notes.md`, not `design-showcase.design-notes.md`** — the
> convention this area already states above, ONE `design-notes.md` per AREA with the mock and the
> export sharing a per-surface basename.
>
> **⚠️ MOTIR-3861's criterion 1 justifies that basename by citing `classifyDesignPath` in
> `motir-core/scripts/upload-design-assets.mjs`. That file no longer exists** —
> `git ls-tree -r origin/main -- scripts/upload-design-assets.mjs` in motir-core returns empty; it
> was deleted by MOTIR-3797 on 2026-08-29 at 02:44, about forty minutes after this card was
> authored, as part of MOTIR-3780 retiring the CI publisher in favour of the agent calling
> `publish_design_result`. **The requirement is unchanged and the reason for it has changed**: the
> basename no longer decides whether a note publishes (the agent declares `kind: 'note_file'`
> explicitly), so what now enforces it is the area convention alone. The criterion was satisfied as
> written; only its citation is stale.

---

## How this asset was measured

**Nothing in this section was read off a file.** The surface this page composes into already ships,
and so does every control it draws, so this pass followed _design-against-shipped-reality_ by
rendering the real thing first and drawing to that:

1. **The real components were server-rendered.** `StylePicker`, `PalettePicker`, `TypePicker`,
   `ThemeSegmentedControl`, `AxisField`, `StyleVignette` and the primitives were imported from the
   INSTALLED `@motir/design-system` and put through `renderToStaticMarkup`, so the mock's markup is
   the package's own, class for class.
2. **The real CSS was compiled.** `app/globals.css` — the actual file, with its two `@import`s and
   two `@source` lines — was compiled with this repository's own `@tailwindcss/postcss`.
3. **Both were loaded in headless chromium**, and every token value in the mock's token block was
   read with `getComputedStyle(document.documentElement).getPropertyValue()` under each
   `data-theme`. The contrast figures below are computed from those resolved values.

**The measurement pipeline has a control**: on `@motir/design-system@0.1.0` — the version this asset
was drawn against — `--el-accent-on-surface` on `--el-surface-soft`, dark, `motir` returns
**4.41:1**, MOTIR-3745's own independently recorded number, to the digit. A second control: the light
`--el-tint-lavender` arm fails on exactly **four** palettes, which is MOTIR-3774's title. Numbers
here are trustworthy to the extent those two reproduce. **Both still reproduce on 0.1.0 — and both
are answers about a version this repository no longer installs**; the re-measurement against the
pinned 0.1.1 is the section directly below.

### ⚠️ Re-measured against the PINNED `@motir/design-system@0.1.1` (MOTIR-3874, 2026-08-29)

Everything above was measured against **0.1.0**. MOTIR-3872 published **0.1.1** and re-pinned this
repository to it, so every number this asset states about `--el-accent-on-surface` — and, for a
different reason, `--el-danger-on-surface` — was a measurement of a version the site no longer
serves. **They were re-taken, not re-reasoned.** This is the command, in full, so the numbers are
checkable rather than merely quoted:

```js
// measure-3874.mjs — run from a checkout that has @playwright/test:
//   node measure-3874.mjs "$(node -p "require.resolve('@motir/design-system/theme.css')")"
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const PAIRS = [
  [
    '--el-accent-on-surface',
    '--el-surface-soft',
    'nav current item / brand glyph',
  ],
  ['--el-accent-on-surface', '--el-surface', 'menu current item (panel 4)'],
  ['--el-accent-on-surface', '--el-page-bg', 'focus ring'],
  ['--el-accent-on-surface', '--el-tint-lavender', 'selected chip'],
  ['--el-danger-on-surface', '--el-danger-surface', 'error banner ink'],
]
const PALETTES = [
  null,
  'cobalt',
  'graphite',
  'evergreen',
  'spectrum',
  'amber',
  'sienna',
  'garnet',
  'citrine',
  'candy',
]

// ⚠️ color-mix() computes to `color(srgb <0-1> …)`. Reading those floats as
// 0-255 reports a FIXED theme as catastrophically broken (see the harness note).
const parse = (s) => {
  const rgb = s.match(/^rgba?\(([^)]+)\)/)
  if (rgb)
    return rgb[1]
      .split(/[,\s/]+/)
      .slice(0, 3)
      .map((n) => parseFloat(n) / 255)
  const srgb = s.match(/^color\(srgb ([^)]+)\)/)
  if (srgb)
    return srgb[1]
      .trim()
      .split(/[\s/]+/)
      .slice(0, 3)
      .map(parseFloat)
  throw new Error('unparsed colour: ' + s)
}
const lum = (c) => {
  const [r, g, b] = c.map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p)
  return +((x + 0.05) / (y + 0.05)).toFixed(2)
}

// Tailwind v4's `@theme` declares its custom properties on :root; a browser
// skips the unknown at-rule, so rename it. Nothing else is touched.
const css = readFileSync(process.argv[2], 'utf8').replace('@theme {', ':root {')
const tokens = [...new Set(PAIRS.flat().filter((t) => t.startsWith('--')))]
const file = new URL('./_measure-3874.html', import.meta.url)
writeFileSync(
  file,
  `<!doctype html><html><head><style>${css}</style></head><body>${tokens.map((t) => `<div data-t="${t}" style="color:var(${t})"></div>`).join('')}</body></html>`,
)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(file.href)
for (const theme of ['light', 'dark']) {
  for (const pal of PALETTES) {
    // Read the RESOLVED ink off a real element's `color` — never the var() chain.
    const v = await page.evaluate(
      ({ theme, pal }) => {
        const h = document.documentElement
        h.setAttribute('data-theme', theme)
        pal
          ? h.setAttribute('data-palette', pal)
          : h.removeAttribute('data-palette')
        return Object.fromEntries(
          [...document.querySelectorAll('[data-t]')].map((el) => [
            el.dataset.t,
            getComputedStyle(el).color,
          ]),
        )
      },
      { theme, pal },
    )
    for (const [ink, surf, label] of PAIRS) {
      const r = ratio(v[ink], v[surf])
      console.log(
        `${theme.padEnd(5)} ${(pal ?? 'motir').padEnd(9)} ${label.padEnd(30)} ${ink} on ${surf} = ${r}${r < 4.5 ? '  ✗ AA' : ''}`,
      )
    }
  }
}
await browser.close()
```

**What it returns on the two versions, `motir` palette** (the full run covers all ten):

| pair                                                    | 0.1.0     | 0.1.1 (pinned) |
| ------------------------------------------------------- | --------- | -------------- |
| `--el-accent-on-surface` → `--el-surface-soft`, dark    | 4.41 ✗ AA | **5.76** ✓     |
| `--el-accent-on-surface` → `--el-surface-soft`, light   | 6.29      | 6.29           |
| `--el-accent-on-surface` → `--el-surface`, dark         | 4.24 ✗ AA | **5.54** ✓     |
| `--el-accent-on-surface` → `--el-page-bg`, dark         | 4.67      | **6.11**       |
| `--el-accent-on-surface` → `--el-tint-lavender`, dark   | 3.59 ✗ AA | **4.70** ✓     |
| `--el-danger-on-surface` → `--el-danger-surface`, dark  | —         | **4.75** ✓     |
| `--el-danger-on-surface` → `--el-danger-surface`, light | —         | **5.77** ✓     |

**The ten-palette sweep, both arms, reproduces MOTIR-3872's own result exactly** — which is this
section's third control: `--el-accent-on-surface` on `--el-tint-lavender` goes **light 4/10 → 0/10**
(evergreen 4.19 → 4.72, amber 4.00 → 4.67, sienna 4.13 → 4.69, candy 4.29 → 4.73) and **dark 1/10 →
0/10** (`motir` 3.59 → 4.70); on `--el-surface-soft`, **dark 1/10 → 0/10** (`motir` 4.41 → 5.76) and
light was already 0/10.

**`--el-danger-on-surface` has an em dash, not a number, in the 0.1.0 column because the token did
not exist there** — `grep -c 'el-danger-on-surface' theme.css` returns **0** on 0.1.0 and names the
`color-mix(in srgb, var(--el-danger) 70%, var(--el-text))` declaration on 0.1.1. `landing.mock.html`
declared it anyway (copied from motir-core `main`, ahead of the publish), which is why the row
appeared in the table at all. A harness run against 0.1.0 answers **17.05 / 14.90** for it — the
contrast of an UNDEFINED custom property, i.e. of the initial ink against the surface. **That pair of
plausible, AA-passing numbers is what an unresolved token looks like from inside a green run**, and
it is the reason this section reports the absence rather than the measurement.

**And the mock's own copy of that token was wrong in DARK for a third reason, neither staleness nor
absence:** `--el-danger-on-surface` is a `color-mix()` over `var(--el-text)`, and `--el-*` are
substituted where they are **declared**, so the single `:root` declaration kept its LIGHT resolution
inside the `.dark` subtree. The fix is to restate the mix in the dark block — the same pairing the
package documents for `[data-theme='light']` + `data-appearance-scope`. **A self-contained mock
inherits that trap along with the values it copies.**

> **⚠️ A contrast harness must parse `color()`.** A first run of the palette sweep reported the
> current motir-core theme as 10/10 failing in dark. That was the harness: the fixed inks are
> `color-mix()`, which computes to `color(srgb 0.567 0.519 0.910)`, and the parser read those 0–1
> floats as 0–255. **A fixed theme and a catastrophically broken one are one parser bug apart**, so
> whoever writes MOTIR-1043's AA matrix should assert the harness against a known pair before
> trusting a red cell.

### ⚠️ The MUTED inks — the pair this asset DREW and never measured (MOTIR-3931, 2026-08-30)

**The rule, in `theme.css`'s own words at the token's declaration:**

> _"⚠️ AA-SAFE ONLY ON THE WHITE PAGE/CARD, and by 0.04 (4.54:1). On `--el-surface` it is 4.17, on
> `--el-muted` 4.12, on `--el-surface-soft` 4.34 — all under AA. **A muted caption belongs inside a
> card, never on a panel.** (MOTIR-2455; light theme is the binding one — every ink clears AA on
> dark.)"_

**And this asset drew exactly the arrangement that rule forbids** — the axis `help` lines and the
rail's `lead` at 12px in `--el-text-muted`, directly on the `--el-surface-soft` band. 12px is not
WCAG large text, so 1.4.3 asks 4.5:1 and the pair returns **4.34:1**.

**Why the sweep above missed it, which is the part worth keeping.** That harness has a control that
reproduces MOTIR-3745's and MOTIR-3774's numbers to the digit, and it returned 0/10 on everything it
measured. Its `PAIRS` list was five entries — four `--el-accent-on-surface` and one
`--el-danger-on-surface` — because the question that prompted it was MOTIR-3872's accent-ink
question. **The pair the asset paints on its own rail was never in the list**, and a sweep that
returns 0/10 on the pairs it measures reads as a clean bill of health for the surface. This is the
second time in two days, after MOTIR-3874: an asset correct about the pairs it measured and wrong
about a pair it drew, because the measured set was chosen by the question rather than by the
elements on the page.

**So `PAIRS` gains the three muted inks against every surface this asset paints them on** — and,
because the three are aliases of one value (`--el-text-muted`, `--el-text-eyebrow` and
`--el-text-helper` all resolve to `var(--color-muted-foreground)`), all three are stated rather than
one, so a later reader who reaches for `-eyebrow` or `-helper` meets the number too:

```js
// Appended to the PAIRS list of the harness above; PALETTES and the rest unchanged.
const PAIRS = [
  // …the five accent / danger entries above…
  ['--el-text-muted', '--el-page-bg', 'muted caption on the page'],
  ['--el-text-muted', '--el-card', 'muted caption inside a Card — the rail'],
  ['--el-text-muted', '--el-surface', 'muted caption on a raised panel'],
  [
    '--el-text-muted',
    '--el-surface-soft',
    'muted caption on the rail BAND / vignette / footer',
  ],
  [
    '--el-text-muted',
    '--el-muted',
    'muted caption on the segmented-control trough',
  ],
  ['--el-text-eyebrow', '--el-page-bg', 'overline on the page'],
  ['--el-text-eyebrow', '--el-card', 'overline inside a Card'],
  ['--el-text-eyebrow', '--el-surface', 'overline on a raised panel'],
  ['--el-text-eyebrow', '--el-surface-soft', 'overline on the rail BAND'],
  ['--el-text-eyebrow', '--el-muted', 'overline on the trough'],
  ['--el-text-helper', '--el-page-bg', 'form hint on the page'],
  ['--el-text-helper', '--el-card', 'form hint inside a Card'],
  ['--el-text-helper', '--el-surface', 'form hint on a raised panel'],
  ['--el-text-helper', '--el-surface-soft', 'form hint on the rail BAND'],
  ['--el-text-helper', '--el-muted', 'form hint on the trough'],
]
```

**What it returns, on the pinned `@motir/design-system@0.1.1`, over all ten palettes in both
themes.** All three inks return identical figures, because they are one value:

| ink (all three)                       | `--el-page-bg` | `--el-card` | `--el-surface` | `--el-surface-soft` | `--el-muted` |
| ------------------------------------- | -------------- | ----------- | -------------- | ------------------- | ------------ |
| **light, `motir`** (the binding cell) | 4.54 ✓         | 4.54 ✓      | **4.17 ✗**     | **4.34 ✗**          | **4.12 ✗**   |
| **light, the ten-palette sweep**      | 0/10           | 0/10        | **1/10**       | **1/10**            | **1/10**     |
| **dark, `motir`**                     | 7.35 ✓         | 7.35 ✓      | 6.67 ✓         | 6.94 ✓              | 6.67 ✓       |
| **dark, the ten-palette sweep**       | 0/10           | 0/10        | 0/10           | 0/10                | 0/10         |

**The failing cell is `motir` alone, light only — 1/10, not 10/10.** The other nine palettes lift the
muted ink far enough to clear AA on every surface. That is worth stating precisely, because `motir`
is the DEFAULT: the one palette that fails is the one a first-time visitor is served.

**The control:** `--el-text-muted` on `--el-card` returns **4.54**, which is `theme.css`'s own quoted
figure to the digit, and `--el-surface` / `--el-surface-soft` / `--el-muted` return **4.17 / 4.34 /
4.12**, which are the three numbers in that same sentence. The harness is trustworthy to the extent
those four reproduce, and they do.

#### The scan a PAIRS list cannot do — walk the RENDERED asset, not a list of pairs

A pair list still has to be written by somebody who already knows which pairs to write, which is the
exact failure this section is about. **So the pairs above were not trusted to be complete.** The
mock was loaded in headless chromium and EVERY element carrying its own text node was read for its
resolved `color` and its effective background — the nearest ancestor with a non-transparent fill —
and ruled against 1.4.3 at that element's own size and weight. It answers _"what does this asset
paint?"_ rather than _"what did I think to ask about?"_

| what it found, light                                       | sites  | ratio     | disposition                                  |
| ---------------------------------------------------------- | ------ | --------- | -------------------------------------------- |
| `.rail-head .lead`, 12px/600, muted on `--el-surface-soft` | 5      | **4.34**  | FIXED — the rows moved into a `Card`         |
| `.axis-hd .help`, 12px/400, muted on `--el-surface-soft`   | 6      | **4.34**  | FIXED — same                                 |
| `.vig .mini`, 11px, muted on `--el-surface-soft`           | 6      | **4.34**  | FIXED — the component paints neither (below) |
| `.foot`, 12.5px, muted on `--el-surface-soft`              | 1      | **4.34**  | FIXED — `SiteFooter` ships secondary (below) |
| the board's own ANNOTATION chrome on the `#f4f3f1` sheet   | **35** | 2.65–4.09 | NOT this card — filed, see below             |

| what it found, dark                                              | sites | ratio | disposition                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.seg button[aria-checked] .i` — the `☾` glyph on `--el-page-bg` | 1     | 3.85  | NOT a 1.4.3 failure: a decorative glyph beside its own text label, so the accessible name is the word. It clears 1.4.11's 3:1 for non-text. Recorded because a scan that reports it and says nothing invites the next reader to re-derive the answer |

**The product layer is now 0 findings in both themes.** The 35 remaining were the doc-annotation
scaffold — the panel captions, the `viewport …` rules, the measurement lines — which this mock's own
token block then called out as _"not product UI"_.

**⚠️ THAT CLAIM WAS CONTRADICTED BY motir-core AND THE CONTRADICTION IS NOW RESOLVED — those 35 are
FIXED (MOTIR-3985, 2026-08-30).** MOTIR-3054 asked exactly this question of motir-core's design
tree — _"does a design board's own chrome owe AA?"_ — and answered **yes**, shipping the guard over
both the utility-class and stylesheet layers (motir-core PR #2133, _"a design board's chrome owes
AA"_). This repository ADOPTED that answer and swept its own board: **the 35 here plus 19 in
`landing.mock.html`, 54 sites, `54 → 0` on this same scan.** The decision, the argument, the full
population and the `b`/`s` disposition are the AREA-WIDE section at the top of this file, § _A design
board's CHROME owes AA_. The mock's token block no longer asserts an exemption; the lane that would
enforce it is MOTIR-4001, and why a PORT of motir-core's guard would not have caught any of this is
stated there.

#### What was CHANGED, and why each is the asset matching what ships rather than a taste call

1. **The axis rows moved into a `Card`.** `.rail` keeps the `--el-surface-soft` band — that band is
   the layout and it is what ships — and `.rail-inner` now carries `--el-card` + `--el-border` +
   `--radius-card`. `--el-card` resolves to the same `#ffffff` as `--el-page-bg` (measured, and now
   stated in the mock's token block, which had no `--el-card` at all), so all three muted inks return
   to **4.54:1** with the band untouched. `app/_components/DesignShowcase.tsx` ships precisely this —
   a `bg-(--el-surface-soft)` section wrapping a `Card` — and its own header block explains the
   arrangement as a measurement. **The asset had been drawing the thing the build had to work
   around**; it now draws the build. The four narrow state panels gained the same `.rail-inner`
   wrapper the two full boards already had, so the rail is one structure everywhere in the asset.
2. **`.vig` moved to `--el-surface` and `.mini` to `--el-text-secondary`.** Not a preference: the
   package's `StyleVignette` (`dist/components/theme/StyleVignette.js`) is `bg-(--el-surface)`, and
   **every string inside it is `--el-text` or `--el-text-secondary` — it paints `--el-text-muted`
   nowhere.** The mock had invented both halves of a failing pair the component does not draw.
3. **`.foot` moved to `--el-text-secondary`.** `app/_components/SiteFooter.tsx` ships
   `--el-text-secondary` for its body text on that same `--el-surface-soft` band; the mock painted the
   whole footer muted.

**The fold was re-measured, because the `Card` costs height.** Padding + border add **26px** to every
rail instance. The table in _The measured fold_ below is the re-taken one; both viewports still clear
their criterion, with the headroom stated so a later change can see how much is left.

**What this asset still does NOT claim.** `--el-text-muted`'s values belong to motir-core and are
deliberate (MOTIR-2455 chose them and wrote the constraint). Nothing here asks for a republish, and
whether `AxisField` should REFUSE to render a muted caption outside a card — i.e. whether the package
owes a guard rather than every consumer owing a `Card` — is motir-core's question, filed there.

---

## Designed against shipped reality

| what                  | read from                                                                                      | how it is used here                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The bar               | `app/_components/SiteHeader.tsx`, **rendered**, not summarised                                 | The mock's bar is that component's structure plus exactly ONE new `<a>`; nothing else in the bar moves                                 |
| The four controls     | `@motir/design-system` `dist/components/theme/AppearancePickers.js`, SSR-rendered + screenshot | The rail's chips, their selected treatment, the `role="radiogroup"` / `role="radio"` shape and the segmented control are the package's |
| The per-style preview | the package's `StyleVignette`, SSR-rendered                                                    | The Style previews row. It is a substantial mini-app preview, not a swatch — drawn as what it really is                                |
| The token grid        | the package's `TokensSpecimen`                                                                 | The `--el-*` grid. The real export is ~170 KB of markup; the mock draws a representative slice and NAMES the export the build mounts   |
| The tokens            | `@motir/design-system@0.1.1` `theme.css`, **as installed here** (0.1.0 until MOTIR-3874)       | Every colour and radius, light AND dark, restated at its resolved value                                                                |
| The axis membership   | the package's own `STYLE_IDS` / `PALETTE_IDS` / `TYPE_IDS` at runtime                          | **11 / 10 / 6** — counted from the modules, not from a card. Re-measured on the pinned 0.1.1 (MOTIR-3874): unchanged                   |

**⚠️ Read the INSTALLED package, never motir-core's `packages/design-system/`.** ~~The two have
diverged, and the divergence is a filed defect — see _Planning flags_.~~ **AMENDED 2026-08-29
(MOTIR-3872): they no longer diverge** — `@motir/design-system@0.1.1` is published, this repository
pins it, and its `theme.css` is byte-identical to motir-core `origin/main`. **The instruction is
unchanged and is not a consequence of the divergence:** read the INSTALLED package, because a
version that is published and a version that is merged are different things, and the next merge into
motir-core re-opens the gap with nothing to announce it. Restating motir-core's values here would
have drawn a site that does not exist.

---

## ACCESS PATH — how a visitor reaches this page

**This page is the site's first internal second route, and that is the fact that generates its one
new pattern.** Until now motir.co had exactly one page.

- **INBOUND:** the **`Design` entry in `SiteHeader`'s nav**, beside `Explore` and `Docs` — drawn in
  panels 1, 2, 3 and 4. It is the ONLY door; there is no in-product link to it and the landing does
  not otherwise change.
- It is also the site's first `next/link` to somewhere other than `/` (every other destination in
  the bar is a different ORIGIN and stays a plain `<a>`).
- **OUTBOUND:** nothing new. The page's own controls change attributes; they navigate nowhere.

---

## The nav entry, and the current-page treatment — RE-DECIDED 2026-08-29 (MOTIR-3874)

`SiteHeader.tsx` carries a load-bearing comment: _"motir.co is the root, so no nav item here is ever
the current page and there is nothing to mark … Do not reintroduce the pattern by marking an item
current."_ **It states TWO things, and this page has now ended both of them, one card apart.** The
premise — that no item is ever current — is what a second route ends. The prohibition — no
accent-coloured text — rested on MOTIR-3745: that ink measured **4.41:1** on the bar in dark, under
AA. **MOTIR-3872 published the fix as `@motir/design-system@0.1.1` and pinned this repository to it,
and the same probe on the same pair now returns 5.76:1.**

**So the treatment is the SHIPPED one**, byte for byte what `ExploreTopBar` renders for its
`aria-current` item — `text-[13.5px] font-semibold text-(--el-accent-on-surface)`:

| element             | token                                 | dark on `--el-surface-soft` | light  | bar        |
| ------------------- | ------------------------------------- | --------------------------- | ------ | ---------- |
| current item        | `--el-accent-on-surface` + `font-600` | **5.76:1**                  | 6.29:1 | AA 4.5:1 ✓ |
| the other items     | `--el-text-secondary`                 | 6.94:1                      | 6.51:1 | AA 4.5:1 ✓ |
| menu panel (narrow) | the same pair, on `--el-surface`      | **5.54:1**                  | 6.03:1 | AA 4.5:1 ✓ |

**Why the invented treatment goes rather than stays alongside.** ~~`--el-text` + `font-600` (16.44:1
dark) plus a 2 px `--el-accent` rule under it (3.63:1, WCAG 1.4.11's 3:1 for a graphical object)~~
was **not a taste call and never claimed to be** — it existed only because the accent ink failed AA,
and it said so in its own comment. Its premise is gone, and a pattern that outlives its reason is
just a pattern the app does not have: motir.co's public bar and app.motir.co's public bar would
differ, for a reason no reader could reconstruct. **`font-weight: 600` is retained and is the whole
of WCAG 1.4.1 here** — a non-colour channel carries the state, exactly as the shipped bar relies on.

**What this costs, stated rather than glossed:** the dark contrast drops from 16.44:1 to 5.76:1. That
is 1.28× AA rather than 3.7×, and it is the number the app itself ships at. **The margin was never
the goal — matching the product was**, and the asset's own governing rule is that the public chrome
is read from `ExploreTopBar` rather than invented beside it.

**⚠️ AND THE LESSON IS THE CARD'S, NOT THE COLOUR'S.** This asset did not merely show 0.1.0's ink; it
**reasoned from it**, and a rationale reads exactly the same after its number has flipped. The tell
was in the writing all along — _"a MEASUREMENT, not a taste call"_ names its own expiry condition. A
self-contained mock copies the token layer to buy independence, and a copy has no mechanism that
tells it the original moved; **publishing a package is precisely the event that moves the original.**

**It is drawn in BOTH places** the nav exists: the desktop bar and the `md:hidden` menu panel
(panel 4). The panel is easy to miss — it is rendered by a separate branch in the same component —
and a current-page treatment that exists only on desktop is a bug the build card would have to be
told about, so it is drawn rather than described.

**`aria-current="page"` carries it to assistive technology**, which is the half the visual treatment
cannot do.

---

## Surfaces / panels (inspect every panel)

- **Panel 1 — desktop, light (1440 × 900).** The arrival state: bar → axis rail → composed
  specimen → footer. Carries the measured fold line.
- **Panel 2 — desktop, dark (1440).** The same document under `data-theme="dark"`, with a
  non-default style selected so the **Reset to default** control is present.
- **Panel 3 — the nav entry**, both themes, with the contrast measured under each.
- **Panel 4 — narrow (390 × 844).** Two frames: the `md:hidden` menu panel carrying the current-page
  treatment, and the rail in its narrow form.
- **Panel 5 — the grammar.** Three deliberately distant cells.
- **Panel 6 — the states the page actually has.** Arrival · an axis mid-change · off-default.

---

## The axis rail

**Layout — a full-width band under the bar, on `--el-surface-soft`, holding a `Card` in which four
fields are stacked.** It is composed from the package's own `AxisField`
(`border-b border-(--el-border-soft) py-4`), one per axis, each holding an `AxisRadioGroup` of chips;
the theme control and Reset sit on the rail's own header row, right-aligned, inside the same `Card`.

**⚠️ THE `Card` IS A MEASUREMENT, NOT A CONTAINER SOMEBODY LIKED (MOTIR-3931).** `AxisField` renders
its `help` line and `AxisNote` at `text-xs text-(--el-text-muted)`, and that ink on the
`--el-surface-soft` band is **4.34:1** — under the 4.5:1 that 1.4.3 asks of 12px text, in the light
theme of the DEFAULT `motir` palette. `--el-card` resolves to the same `#ffffff` as `--el-page-bg`,
so the rows return to **4.54:1** while the band the whole layout is built on stays exactly where it
is. The full measurement, and the scan that found three more sites the same pair was drawn on, is
§ _The MUTED inks_ above. The band is not decoration: it is the region that visibly restyles, which
is the page's entire argument.

**Why a full-width band and not a sidebar:** measured, not preferred. The Style axis is **11** chips
of real words (`Swiss / Minimal-Flat`, `Hand-Drawn / Indie`) and Palette is **10** with a swatch
each. At 1440 the three groups occupy 2 + 2 + 1 wrapped rows; in a 280px sidebar the Style group
alone wraps to nine rows and the rail stops fitting any viewport.

**Scroll behaviour: the rail does NOT stick.** The page's argument is that the WHOLE document
restyles — bar and footer included — so pinning the controls over a scrolling specimen would keep
the one region a visitor most needs to see changing (the chrome) out of view. The rail is short
enough to return to, and the page is not long.

**Narrow (< `md`): each axis becomes ONE horizontally scrolling row** (`flex-nowrap` +
`overflow-x-auto`), rather than wrapping. This is forced by measurement: 11 style chips WRAP to six
rows at 390px, which is ~190px of rail for one axis and pushes the specimen off the fold. As one
scrolling row the axis is **31px** and all four fit. Measured in isolation at a true 390 viewport:
`document.scrollWidth === 390`, so the page itself never scrolls horizontally — only the chip rows do.

### The measured fold

Both taken by rendering the frame at the true viewport and reading `getBoundingClientRect()`
offsets from the frame's top edge.

**⚠️ RE-MEASURED 2026-08-30 (MOTIR-3931) — the `Card` costs 26px per rail.** Padding (12 + 12) plus
its 1px borders. Both viewports still clear the criterion; the numbers below are the re-taken ones,
with the superseded pair beside them so the cost is legible rather than merely absorbed.
**The `was` column is this pass's own run against `origin/main`, not the figures the previous table
printed** — those read from a 1px-higher origin, so every number here sits 1px lower than its
predecessor for a reason that has nothing to do with the change. Comparing a re-measurement against
someone else's origin is how a 1px method difference gets reported as a regression, so both columns
come from one script.

| viewport       | bar    | axis rail              | page lede | first composed section  | fold | headroom          |
| -------------- | ------ | ---------------------- | --------- | ----------------------- | ---- | ----------------- |
| **1440 × 900** | 1 → 58 | 58 → **405** (was 379) | 433 → 548 | 574 → **847** (was 821) | 900  | **53** (was 79)   |
| **390 × 844**  | 1 → 54 | 54 → **434** (was 408) | 452 → 510 | 536 → **602** (was 576) | 844  | **242** (was 268) |

**Above the fold in both: the whole rail AND a whole composed section**, which is the criterion.

**⚠️ 53px is the number to watch.** At 1440 the headroom is now under one line of body text, so the
next element added to the rail — a fifth axis, a second header row, a banner above the bar — takes
the first composed section below the fold and falsifies the criterion. It is stated here rather than
left to be re-derived, because the re-derivation is a browser run and the temptation is to assume the
margin that used to be there.

---

## Decision — a visitor's choice PERSISTS across motir.co, and Reset discharges it

`ThemeProvider` writes `data-theme` / `-style` / `-palette` / `-type` onto `document.documentElement`
and persists each to `localStorage` under `motir.theme.*`; `themeInitScript` — already blocking in
this site's `<head>` — re-applies them on every motir.co page load. **So a visitor who picks
Neo-Brutalism here sees the LANDING in Neo-Brutalism afterwards.**

**DECIDED: keep it.** Reverting on navigation would contradict the page's own claim. The page says
_this is the system your product wears_; a demo that forgets the moment you leave it is a preview,
and the argument it makes is weaker than the one the persistence makes for free — the visitor
returns to the landing and finds their choice already applied to a page they had already seen.

**What discharges the surprise is the affordance, not a warning.** A **Reset to default** control
sits in the rail header and is **present whenever any of the four axes is off its default** (panels
2 and 6c); absent at arrival (panel 6a), because a reset with nothing to reset is noise. Defaults
are `warm-editorial` / `motir` / `motir` / `system`, from the package's own `THEME_DEFAULTS`.

---

## The matrix, honestly

**11 styles × 10 palettes × 6 pairings × 2 themes = 1,320 cells.** Not drawable, and drawing forty
of them would still not be a proof.

What panel 5 draws is the **grammar** — that the three axes are independent and each changes a
different property:

- **`neo-brutalism`** — a distant STYLE: 0px radii, heavy border, hard-offset shadow. Shape moves;
  colour does not.
- **`graphite`** — a distant PALETTE: colour moves; shape does not.
- **`mono-technical`** — a pairing that re-types the entire UI, headlines included.

Plus the default in **light** (panel 1) and **dark** (panel 2). **The remaining cells are generated
by the same three attributes and are asserted by MOTIR-1043's AA-matrix criterion, not by more
panels** — which is the right division: a machine can check 1,320 cells and a reader cannot.

---

## The states this page actually has

**It fetches nothing.** There is no loading state and no error state, and this asset says so rather
than leaving it unasked. `EmptyState` and `ErrorState` appear in the composed specimen as
_specimens of the primitives_, never as states of this page.

Three real states, drawn in panel 6: **arrival** (every axis default, no Reset) · **mid-change** (the
pressed chip, with selection and focus as separate signals — `aria-checked` and the focus ring) ·
**off-default** (Reset present). Plus the narrow rail (panel 4).

---

## Primitives composed — every element, and the export it maps to

Checked against `@motir/design-system`'s own barrel **as installed in this repository**
(`node_modules/@motir/design-system/dist/index.js`), never against motir-core's source.
**Re-measured on the pinned 0.1.1, 2026-08-29 (MOTIR-3874): 70 exports** — it was **68** on 0.1.0,
when this section was written. Command:
`node -e "import('@motir/design-system').then((m) => console.log(Object.keys(m).length))"`. Every
export the table below names is present on 0.1.1; the count is stated for both versions rather than
renumbered, because a count with no version beside it is a measurement of nothing.

| drawn element                    | export it maps to                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| the four rail fields             | `AxisField` (+ `AxisNote` for the per-axis line MOTIR-3862 writes)                                                                 |
| the Style / Palette / Type chips | `StylePicker` · `PalettePicker` · `TypePicker`, each over `AxisRadioGroup`                                                         |
| light / dark / system            | `ThemeSegmentedControl`                                                                                                            |
| Reset to default                 | `Button` (`variant="outline"`, `size="sm"`)                                                                                        |
| the attribute writer             | `ThemeProvider` + `useTheme`; `themeInitScript` already in `app/layout.tsx`                                                        |
| the axis membership + defaults   | `STYLE_IDS` · `PALETTE_IDS` · `TYPE_IDS` · `STYLE_REGISTRY` · `PALETTE_REGISTRY` · `TYPE_REGISTRY` · `THEME_DEFAULTS`              |
| per-style previews               | `StyleVignette`                                                                                                                    |
| the `--el-*` grid                | `TokensSpecimen`                                                                                                                   |
| specimen controls                | `Button` · `Card` · `Pill` · `Input` · `Textarea` · `FormField` · `Segmented` · `Switch` · `SectionLabel` · `Combobox` · `Spinner` |
| specimen overlays                | `Tooltip` · `Popover` · `Modal`                                                                                                    |
| the toast specimen               | **`ToastProvider` + `useToast`** — see below                                                                                       |
| class merging                    | `cn` · `buttonVariants`                                                                                                            |

**Three corrections to the card's own list, each verified against the barrel:**

1. **There is no `Toast` export.** The card names one; the package exports **`ToastProvider`** and
   the **`useToast`** hook (the component is internal). A build that writes `import { Toast }` fails.
2. **The registries are `STYLE_REGISTRY` / `PALETTE_REGISTRY` / `TYPE_REGISTRY`** (plus the
   `*_IDS` arrays), not `STYLES` / `PALETTES` / `TYPOGRAPHY` as the card's context refs say.
3. **`StylePicker` renders 11 chips, not 9** — see _Planning flags_.

**Named and deliberately NOT drawn:** `Sidebar`, `CommandPalette`, the charts and `IssueTypeIcon`
live only in motir-core and are unreachable here, exactly as the card says.

> **⚠️ For whoever builds this: `Tooltip`, `Popover` and `Modal` render nothing under SSR** — 45, 21
> and 0 bytes respectively, because each is state- or portal-driven. Their OPEN state in this mock is
> drawn from their source rather than captured from a render, and is the one place in this asset
> where the _render, don't read_ rule could not be followed. Verify those three in a browser.

---

## Planning flags

1. **✅ RESOLVED 2026-08-29 by MOTIR-3872 — kept as a record, because the paragraph below is what
   the mock's dark inks and its rejected-treatment note were drawn against.**
   `@motir/design-system@0.1.1` is published and this repository now pins it; the same sweep over the
   INSTALLED package returns **0/10 on both arms**, and the control on `--el-surface-soft` (dark,
   `motir`) moved **4.41 → 5.76**. The published `theme.css` is byte-identical to motir-core
   `origin/main`, so the divergence this section describes no longer exists.
   **✅ AND MOTIR-3874 CLOSED THE TWO THINGS THAT STILL PREDATED THE PUBLISH — 2026-08-29.** They
   were: the mocks inlining `--el-accent-on-surface: #7b6ce5` for dark (0.1.0's value), and the
   current-page nav treatment being justified by _"NEVER `--el-accent-on-surface` as TEXT here:
   4.41:1 in dark, under AA"_. **What was decided:**
   1. **Both mocks now carry `color(srgb 0.567059 0.519529 0.910039)`** — 0.1.1's lifted ink,
      measured off the installed package, not converted from a hex. Every `--el-*` either mock
      declares was checked against the installed 0.1.1 the same way: **0 mismatches** across
      `landing.mock.html` and `design-showcase.mock.html`, light and dark. Two further corrections
      fell out of that sweep and are recorded in _Re-measured against the PINNED …_ above:
      `--focus-ring-color` did **not** move and stays `#7b6ce5` (the two tokens were one colour on
      0.1.0 and are two now), and `landing.mock.html`'s `--el-danger-on-surface` is re-declared
      inside `.dark` because a `color-mix()` over `var(--el-text)` keeps its light resolution in a
      nested subtree.
   2. **The current-page treatment is now `--el-accent-on-surface` at `font-weight: 600`** — the
      pairing `ExploreTopBar` ships — replacing the `--el-text` + 2 px `--el-accent` rule the retired
      4.41 forced. 5.76:1 dark, 6.29:1 light; `font-weight` remains the non-colour channel for WCAG
      1.4.1. The reasoning, its cost, and what MOTIR-1043 must now do to `SiteHeader.tsx`'s comment
      are in _The nav entry_.
      **This flag is closed. Build to the asset as it stands.**

   ~~**⚠️ `motir.co` serves a design system that fails AA in five cells — filed as MOTIR-3872, and it
   BLOCKS MOTIR-1043.** `@motir/design-system@0.1.0`, which this repository pins, predates **both**
   accent-ink fixes (MOTIR-3745, MOTIR-3774). Measured over all 10 palettes: **light 4/10 fail**
   (evergreen 4.19, amber 4.00, sienna 4.13, candy 4.29) and **dark 1/10 fail** (`motir`, the
   DEFAULT palette, 3.59) for `--el-accent-on-surface` on `--el-tint-lavender` — which is the
   package's own SELECTED-CHIP treatment, i.e. the rail on this very page. The same sweep over
   motir-core `origin/main` returns **0/10 on both arms**: the fixes exist and were never published
   to npm. MOTIR-1043's criterion _"AA holds … for every style × palette pair … reported as a
   matrix"_ is **unsatisfiable until the package is republished and the pin bumped.**
   **The mock draws the selected chip as it really is**, low contrast included, rather than quietly
   repainting it — an asset that hides the defect would let the build card ship it.~~

2. **The style count is 9 in two cards and 11 in the package.** MOTIR-3861 says _"`StylePicker` (9
   styles)"_ and MOTIR-1043 says _"9 styles · 10 palettes · 6 type pairings — the same membership as
   motir-core `origin/main`"_. Measured from the installed module, `STYLE_IDS.length === 11`:
   `warm-editorial`, `soft-playful`, `swiss-minimal-flat`, `neo-brutalism`, `glassmorphism`,
   `cybercore-y2k`, `aurora`, `3d-immersive`, `neumorphism`, `hand-drawn-indie`, `retrofuturism`.
   Palette (10) and Type (6) are correct. **It is a layout input, not a trivium** — two extra chips
   are what make the Style axis wrap to a second row at 1440 and what forced the narrow-viewport
   scrolling row — so a rail drawn to "9" would have been wrong at both viewports.
   **Re-measured 2026-11-09 (MOTIR-10783), for the pin moving to `@motir/design-system@0.22.0`: 19 /
   14 / 10** — styles / palettes / pairings, the lengths of `STYLE_IDS`, `PALETTE_IDS` and `TYPE_IDS`
   that MOTIR-10773 read out of the published 0.22.0 tarball installed from the public registry (not
   motir-core's design-system source; see _Designed against shipped reality_). All three axes are
   larger than the figure above. The figure above stays the record of the population this asset was
   drawn at: the mock's rail of 11 style chips, 10 palettes and 6 pairings, its fold table and its
   wrap rows are unchanged and re-taken nowhere in this change, and nothing here says how the rail
   lays out at 19 / 14 / 10.
3. **The `theme.css` block counts in MOTIR-1043 are wrong for every version.** It says 35
   `[data-palette]`, 109 `[data-style]`, 9 `[data-type]`. Measured on 0.1.0 (the version installed
   when this was written): **23 / 107 / 9**. **Re-measured on the pinned 0.1.1, 2026-08-29
   (MOTIR-3874): 23 / 112 / 9** — which is what motir-core `origin/main` returned then and returns
   now, the two having been byte-identical since the publish. Command, so the set is checkable rather
   than the number: `grep -o "\[data-palette=[^]]*\]" theme.css | wc -l`. Only `[data-type]` matches
   the card. Nothing in this asset depends on those numbers; the build card should not either.
4. **MOTIR-1043 also needs the three missing typefaces before its Type axis is honest** — its own
   body says so, and this asset assumes it: panel 5's `mono-technical` cell cannot render truthfully
   until IBM Plex Mono is loaded. Not a new finding, restated because this asset draws the cell.

---

## Out of scope — who owns what

- **The words are MOTIR-3862's.** Every string in the mock is placeholder at the specified register:
  never _tracker_, never _issue_ for a work item, the three pillars in full where positioning is
  stated. The nav LABEL (`Design` here) is that card's too — the mock's is a placeholder that
  happens to be the obvious one.
- **The build is MOTIR-1043's.** This card ships three files and no code: no route, no component,
  no font loader, no `sitemap.ts` line.
- **The landing is not redrawn.** The only change this asset specifies to an existing surface is the
  single nav entry and the current-page treatment it forces.
- **The package fix was MOTIR-3872's**, in motir-core and then this repository's pin — `done`
  2026-08-29. **Bringing THIS asset back onto the pinned version is MOTIR-3874's**, which is the
  card that re-measured the numbers above and re-decided the current-page treatment.

---

## Notes for MOTIR-1043 (the build)

- The bar gains **one** `<a>`, as a `next/link`, with `aria-current="page"` when active. **Rewrite
  the component's ⚠️ comment — do not merely delete it, and do not keep it.** ~~Its prohibition (no
  accent-coloured text) survives; only its premise (nothing is ever current) does not.~~ **AMENDED
  2026-08-29 (MOTIR-3874): BOTH halves are now retired** — the premise by this page, the prohibition
  by 0.1.1's ink (4.41:1 → 5.76:1). The replacement comment should record what the pin buys, so the
  next reader does not re-derive the old rule from the old number: the current item is
  `--el-accent-on-surface` at `font-weight: 600`, which is `ExploreTopBar`'s own pairing.
- **The current-page treatment changed after this asset's first export.** Build to _The nav entry_
  section and to `design-showcase.mock.html` as they stand now — weight + accent ink, no rule. A
  `--el-text` + 2 px `--el-accent` rule anywhere in a diff for this card is the retired treatment.
- The rail is four `AxisField`s; do not hand-roll the chips — `StylePicker` / `PalettePicker` /
  `TypePicker` already render them, keyboard behaviour included (arrow keys move within the
  radiogroup, and only the selected chip is in the tab order).
- **Reset** sets all four axes back to `THEME_DEFAULTS` and is conditional on any being off default.
- `lib/sitemapEntries.ts` (the sitemap moved here in MOTIR-8844) gains its `/design` line in the same change — the file's own comment asks for it.
- **Before the AA matrix can pass, MOTIR-3872 must land.** Assert the contrast harness against a
  known pair first (see _How this asset was measured_).

---

## The language switcher in the site header

**Subtask:** MOTIR-7947 (`type: design`) · **Story:** MOTIR-7737 (motir.co in eleven languages) ·
**Builds it:** MOTIR-7953. **Delta mock:**
[`site-header--language-switcher.mock.html`](site-header--language-switcher.mock.html) — it holds
only the panels that change. It amends the site header as shipped in
`app/_components/SiteHeader.tsx`; no earlier mock in this area draws that bar's right cluster, so
none is edited.

**Design system: Motir Design (branch a).** `package.json` depends on `@motir/design-system` 0.13.0
and `app/globals.css` imports `@motir/design-system/theme.css`, so the mock is generated with the
package's `renderMock` (axes `hand-drawn-indie` · the default palette · `grotesk`, light) from the
real `buttonVariants`, the header's own class constants and `lucide-react` glyphs. Colour is `--el-*`
only and shape is the shape tokens only; the board passes `pnpm test:design`.

### What changes, in one paragraph

The bar gains one control: a **ghost button** in the right cluster, directly before Sign in, reading
the Languages glyph + the current language's **endonym** + a chevron. It opens an end-aligned list of
the eleven languages as **links** — each one is the address of the page being read, in that
language. When the bar runs out of room it gives way in a fixed order, and the language control
folds into the Menu panel as its own section. Nothing else on the bar moves.

### The trigger (panels 1–4)

| element                 | spec                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| control                 | `<button type="button">`, `buttonVariants({ variant: 'ghost', size: 'md' })` + `gap-1.5 px-(--spacing-control-x) text-[15px] font-medium text-(--el-text)` — the same family as Sign in, so it reads as chrome, not a call to action |
| glyph                   | `Languages` (lucide), `size-4`, `text-(--el-text-secondary)`, `aria-hidden`                                                                                                                                                          |
| label                   | the endonym of the CURRENT locale, wrapped in `<span lang="<code>">` so a 日本語 label on an English page is shaped as Japanese                                                                                                      |
| chevron                 | `ChevronDown`, `size-3.5`, `text-(--el-text-secondary)`; rotated 180° while open                                                                                                                                                     |
| accessible name         | `aria-label` = `nav.language.label` → **"Language: {language}"** with the endonym interpolated, so a screen reader announces what the button is for and not just "English"                                                           |
| state                   | `aria-haspopup="true"`, `aria-expanded`, `aria-controls="language-menu"`; open and hover take `bg-(--el-surface-soft)`; focus-visible is the bar's outline, `outline-(--el-accent-on-surface)`                                       |
| over the hero (panel 2) | unchanged: a ghost button carries no fill at rest, so it lies on the wave field exactly as the nav and Sign in do                                                                                                                    |

### The open list (panels 3, 4, 6)

- **A group of links, not a listbox.** `<div id="language-menu" role="group" aria-label="{nav.language.menuLabel}">`
  holding eleven `<a>`. Choosing a language is a navigation to a different document, so the
  entries are ordinary links: they work without JavaScript, open in a new tab, and are crawlable,
  which is also what the hreflang work (MOTIR-7956) wants from them.
- **Container** — ProductsMenu's popover vocabulary: `absolute top-[calc(100%+8px)] right-0 z-40`,
  `rounded-(--radius-card) border border-(--el-border) bg-(--el-page-bg) p-1 shadow-(--shadow-elevated)`,
  `min-w-[13rem]`. **End-aligned** to the trigger, because the trigger sits at the right edge of the
  bar and a start-aligned list would run off the page at the narrow end of rung B.
- **Order** — `en zh ja ko de fr es it nl pl pt`, the story's locale order, the same on every page.
  Not alphabetised by endonym: an order that changes with the reader's language is an order nobody
  learns.
- **Row** — `grid grid-cols-[minmax(0,1fr)_16px] gap-3 rounded-(--radius-control) px-(--spacing-control-x) py-(--spacing-control-y) text-[15px]`,
  hover `bg-(--el-surface-soft)`, focus-visible `outline-2 outline-(--el-accent-on-surface)`.
- **Each entry** carries `lang="<code>"` and `hreflang="<code>"`, and its text is that language's
  endonym in its own script. `lang` is what makes the system pick regional glyph forms for 中文 vs
  日本語 vs 한국어 on a page whose own font set does not cover them.
- **The current language** — `aria-current="true"`, `font-semibold text-(--el-accent-on-surface)` and
  a trailing `Check` in `--el-accent-on-surface` (`aria-hidden`). Weight + accent ink is the bar's own
  current-item pairing (_The nav entry_ above), so the list does not invent a second one; the check is
  there because the list is read in isolation, away from the nav that teaches the pairing.
- **Behaviour** — opens on click / Enter / Space; Escape closes it and returns focus to the trigger;
  a pointerdown outside closes it — ProductsMenu's own rules, so the two popovers in one bar behave
  alike. Tab moves through the links in order (panel 3, right).

### Where each entry points

| where the reader is                                                    | the entry for `<code>` points at                                                                                                                      | how it takes effect                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| motir.co, any page                                                     | the SAME page with the locale prefix swapped: English unprefixed, every other locale under `/<code>` (e.g. `https://motir.co/de/products/ai-planner`) | the address IS the language (MOTIR-7948's `as-needed` prefix) |
| a public-project host (`acme.motir.site`, a customer domain — panel 6) | the SAME path, no prefix: the address keeps its shape                                                                                                 | the remembered-choice cookie, read by `proxy.ts` (MOTIR-7951) |

**Every choice also remembers itself.** A visitor who picks Deutsch and later types the bare
`motir.co` should land in German, so a choice writes the locale cookie MOTIR-7951 reads. On motir.co
the link alone is enough to show the right page; on a tenant host it is the ONLY signal. **Flagged
for MOTIR-7953:** to keep the tenant entries working without JavaScript, point them at a small
route handler that sets the cookie and redirects back to the same path, rather than relying on an
`onClick` that sets it — the mock draws the destination, not that mechanism.

### When the bar runs out of room — the give-way ladder (panel 1)

The bar already holds more than it has room for between the md breakpoint and the widest desktop,
and German and Japanese run longer than English. So instead of fixed breakpoints the bar has a
**ladder**, always climbed down in the same order, and the width at which each rung starts is
**measured per locale**:

| rung  | what the bar shows                                                                            |
| ----- | --------------------------------------------------------------------------------------------- |
| **A** | brand · nav · Copy setup prompt · language trigger · Sign in · Start free                     |
| **B** | Copy setup prompt leaves — it is also in the hero and on the docs pages                       |
| **D** | brand · Start free · Menu. The nav, Sign in and the language control fold into the Menu panel |

**Measured** (Playwright chromium on the mock, Space Grotesk / JetBrains Mono / Noto Sans JP loaded,
the bar's `--spacing-card-padding` both sides). Each number is the narrowest viewport at which the
rung fits without overflow:

| locale                    | A from | B from | D below |
| ------------------------- | ------ | ------ | ------- |
| English                   | 1442px | 1226px | 1226px  |
| Deutsch                   | 1646px | 1401px | 1401px  |
| 日本語 (placeholder copy) | 1559px | 1244px | 1244px  |

- **There is no rung C.** Dropping the endonym to a two-letter code bought 35–44px in all three
  locales — too little to be worth a third state, and a code reads worse than a name. The trigger
  shows the endonym whenever it is in the bar.
- **Start free never leaves** and **Sign in leaves only with the nav**: the conversion action stays
  on screen at every width, and Sign in is always one tap away in the Menu panel.
- **The ladder also fixes a defect the bar has today.** Measured without the switcher, the shipped
  English bar needs 1043px of content from the md breakpoint (768px) up, and 1260px once Copy setup
  prompt joins at xl — so it overflows between 768px and ~1100px, and between 1280px and ~1316px.
  Rung D below the measured width replaces the `md:` / `xl:` breakpoints, which is what removes it.
- **For MOTIR-7953 (the mechanism):** the per-locale widths live beside the locale list as data
  (`{ en: { a: 1442, b: 1226 }, … }`) and are applied as **static** class strings per locale
  (`min-[1442px]:inline-flex`, …) so Tailwind can see them. A test renders the bar per locale with
  each catalogue's real copy and fails when a stored width no longer matches the measurement — a
  translator who lengthens a label then gets a red check, not a wrapped bar. The numbers above are a
  starting point measured on placeholder German and Japanese copy; the catalogue cards replace them.

### The Menu panel's language section (panel 5)

`#site-menu` gains a section after Sign in, so it is the last thing in the panel and does not push
the products or nav down:

- `<section aria-labelledby="site-menu-language">`, separated by `border-t border-(--el-border) pt-3 mt-1`.
- **Heading** — `<h2>` with the Languages glyph and `nav.language.heading` → **"Language"**, in the
  products menu's group-label style: `font-(family-name:--font-mono) text-[11px] tracking-[0.1em] uppercase text-(--el-text-secondary)`.
- **List** — `<ul>` in **two columns** (`grid-cols-2 gap-x-3 gap-y-1`), the same eleven links in the
  same order, with the same `lang` / `hreflang`. Two columns keep the section to six rows at 390px.
- **Row** — `rounded-(--radius-control) px-(--spacing-control-x) py-(--spacing-control-y) text-[16px]`.
  **The current entry** takes `bg-(--el-surface-soft) font-semibold text-(--el-accent-on-surface)` + the
  check: the panel is a long list, and a fill finds the current row faster than ink alone.
- The panel's own comment calls it a declared rung-1 fill; adding a section does not change that.

### Copy

| key (`messages/<locale>.json`) | English              | used by                          |
| ------------------------------ | -------------------- | -------------------------------- |
| `nav.language.label`           | Language: {language} | the trigger's `aria-label`       |
| `nav.language.menuLabel`       | Choose a language    | the open list's `aria-label`     |
| `nav.language.heading`         | Language             | the Menu panel's section heading |

**The endonyms are not catalogue strings.** English, 中文, 日本語, 한국어, Deutsch, Français, Español,
Italiano, Nederlands, Polski, Português are the same on every page, so they live in a constant beside
the locale list, not in eleven catalogues. German and Japanese nav copy in the mock is a placeholder
that shows the length problem; the catalogue cards own the real wording.

### Script and fonts

On a page in a Latin locale the CJK endonyms in the list fall outside the loaded font set and render
in the reader's system fallback. That is accepted: they are eleven short words, the `lang` on each
entry makes the system choose the right regional forms, and loading three CJK fonts on every English
page to draw three words is the wrong trade. On a CJK page the page's own font (MOTIR-7952) covers its
own endonym, and the Latin endonyms fall back to the grotesk.

### Out of scope

- The locale routing, detection, fonts, catalogues and hreflang are their own cards (MOTIR-7948,
  7951, 7952, 7949/7950, 7956). This asset draws the control and where its entries point.
- No footer switcher. One control, in one place, keeps one current-language truth on the page.

## The language switcher, revision 2 — a globe at the right edge

**Subtask:** MOTIR-7947 (`type: design`), second revision · **Builds it:** MOTIR-7953.
**Amends:** § _The language switcher in the site header_ above and its mock
[`site-header--language-switcher.mock.html`](site-header--language-switcher.mock.html).
**Delta mock:**
[`site-header--language-switcher--globe.mock.html`](site-header--language-switcher--globe.mock.html).
It holds only the panels that change.

**Why it changed.** The first version was sent back with _"is it a good design to put the language
in the middle?"_ and _"use the global icon, don't need to show the language once it's selected"_
(Yue, 2026-10-09). The trigger sat between Copy setup prompt and Sign in, in the middle of the bar's
button cluster, and it spelled out the current language.

### What changes

| element                     | revision 1 (amended)                                | revision 2                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| place on the bar            | before Sign in, in the middle of the right cluster  | **the last control on the bar, after Start free**. Sign in and Start free stay together as the bar's account pair                                                                                 |
| the trigger                 | ghost button: `Languages` glyph + endonym + chevron | **icon-only square ghost button**: `buttonVariants({ variant: 'ghost', size: 'md' })` + `w-(--height-btn-md) shrink-0 px-0 text-(--el-text)`, holding lucide `Globe` `size-[18px]`, `aria-hidden` |
| the current language        | the trigger's label                                 | **not shown on the bar.** It stays in the accessible name and is marked in the open list                                                                                                          |
| accessible name and tooltip | `aria-label` = `nav.language.label`                 | unchanged (**"Language: {language}"**, so a screen reader still hears the current language), plus `title` = `nav.language.heading` (**"Language"**) as the pointer tooltip                        |
| narrow bar (rung D)         | the control folds into the Menu panel as a section  | **the globe stays on the bar**: Brand · Start free · globe · Menu. It is one 40px square, and fits at 390px in all three measured languages                                                       |
| Menu panel                  | a Language section after Sign in                    | **no Language section.** One control in one place, at every width                                                                                                                                 |

**Unchanged from revision 1:**

- **The open list** (§ _The open list_): the container, row, order, `lang` / `hreflang` and current
  mark. It is end-aligned to the globe, which now sits at the bar's right edge. On a phone (panel 4)
  it hangs from the globe and stays inside a 390px viewport.
- **Where each entry points**, and the cookie it writes (§ _Where each entry points_).
- **The states**: open and hover take `bg-(--el-surface-soft)`, focus-visible is the bar's outline,
  and the open/close behaviour is ProductsMenu's.
- **Fonts**: § _Script and fonts_.

### The give-way ladder, re-measured (panel 1)

The ladder has the same order. Rung D no longer folds the language control, because the globe never
leaves the bar.

| rung  | what the bar shows                                                              |
| ----- | ------------------------------------------------------------------------------- |
| **A** | brand · nav · Copy setup prompt · Sign in · Start free · globe                  |
| **B** | Copy setup prompt leaves                                                        |
| **D** | brand · Start free · globe · Menu. The nav and Sign in fold into the Menu panel |

**Measured** the same way as revision 1 (Playwright chromium on the mock, the mock fonts loaded).
Each number is the narrowest viewport at which the rung fits:

| locale                    | A from | B from | D below |
| ------------------------- | ------ | ------ | ------- |
| English                   | 1364px | 1148px | 1148px  |
| Deutsch                   | 1560px | 1314px | 1314px  |
| 日本語 (placeholder copy) | 1488px | 1173px | 1173px  |

The icon-only trigger frees 78–86px against revision 1 in every locale. MOTIR-7953 stores these as
its starting widths, under the same mechanism and test that revision 1 describes.

### Copy

| key (`messages/<locale>.json`) | English              | used by                      |
| ------------------------------ | -------------------- | ---------------------------- |
| `nav.language.label`           | Language: {language} | the globe's `aria-label`     |
| `nav.language.menuLabel`       | Choose a language    | the open list's `aria-label` |
| `nav.language.heading`         | Language             | the globe's `title` tooltip  |

## The language switcher in twelve languages (MOTIR-8937 · MOTIR-9251)

Amends **"The language switcher"** above (MOTIR-7947, `site-header--language-switcher.mock.html`).
No new surface is drawn: the switcher's shape, its trigger, the open list and the Menu panel's
section are unchanged, and only the list's length and two labels move. The MOTIR-7947 mock stays
the record of the eleven-language moment it was drawn in.

- **Twelve entries, in `LOCALES` order:** English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch,
  Français, Español, Italiano, Nederlands, Polski, Português. Traditional Chinese (`zh-tw`) sits
  directly after Simplified.
- **The Simplified entry is named 简体中文**, no longer 中文: with 繁體中文 beside it, a bare 中文 names
  both. The change is the label only; the `zh` locale's address, `lang` and catalogue are untouched.
- **`lang` and `hreflang` carry the BCP 47 tag**, from `LOCALE_BCP47` in `i18n/routing.ts`:
  `zh-TW` on the 繁體中文 entry, the URL code itself on every other. The link is `/zh-tw/<path>`
  and choosing it writes `NEXT_LOCALE=zh-tw`.
- **The Menu panel's two-column list holds six rows of two**, so the section is no taller at
  390px than it was with eleven (six rows, the last half full).
- **Fonts:** as before, a CJK endonym on a page in another script falls back to the system face,
  and its `lang` picks the regional forms, now `zh-TW` for 繁體中文. On a `zh-tw` page the
  zh-Hant set (LXGW WenKai TC by default) draws the page and its own endonym.
