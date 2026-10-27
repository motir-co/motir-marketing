# Design notes — `design/explainer/` (motir.co, "How the calculation works")

## Design system — read first

- `package.json` depends on `@motir/design-system` `0.17.0` (read from
  `node_modules/@motir/design-system/package.json`).
- `app/globals.css` line 19: `@import '@motir/design-system/theme.css';`.
- **Verdict: ON MOTIR DESIGN (branch a).** Both checks hold.
- The site's own axes, from `lib/siteDefaults.ts` (`SITE_APPEARANCE`), rendered on `<html>` by
  `app/layout.tsx`: `data-theme="light"`, `data-style="hand-drawn-indie"`, `data-palette="motir"`,
  `data-type="grotesk"`.
- `0.17.0` exports `@motir/design-system/mock`, so `how-the-calculation-works.mock.html` is built
  with `renderMock` at those axes, with the Space Grotesk and JetBrains Mono `@font-face` blocks the
  price mock embeds (`design/price/price.mock.html`).

Parts used: `Card` (tints none, lavender, mint, peach), `Pill` (tone neutral), and `Segmented`
(only in panel 1, as the price calculator's shipped cadence toggle for context). Everything else is
plain markup on the site's `--el-*` colour tokens and `[data-style]` shape tokens. The site header
and footer are the shipped `SiteShell` and are not redrawn: the page body sits inside it exactly as
the price page's body does (`app/_components/PricePage.tsx`).

No part is missing from the package. Nothing here is a proposed addition to `@motir/design-system`
and nothing is a product-local component; the contents list, figure slot and fallback note are
page markup.

## The surface

One public, static page on motir.co, **"How the calculation works"**, for a prospect or an org
owner who has seen a credit estimate or the price card and wants to know where the numbers come
from. It is served under every locale prefix the site serves (`LOCALES` in `i18n/routing.ts`, 12
at the time of drawing, zh-tw included). The proposed route sits under the price page,
`price/how-the-calculation-works`, with the site's usual locale prefix; the route card decides the
final slug.

**Copy is layout filler.** Every sentence in the mock is English stand-in wording that shows length
and order. The real words come from the per-locale copy catalogue (the `explainer` key group the
copy card writes), never from this asset.

**No figure is drawn.** Every value read at render time is shown as a **figure slot** (below) naming
what goes there. The mock carries no price, pool, rate, factor, model name, `$` cost or margin.

## Access path — the only door drawn

The page has **no primary-nav entry and no footer entry**. It is reached by **plain in-text links**:

- on the price page (`/price`), one line under the calculator's result: "Want to know where these
  numbers come from? _How the calculation works_" (panel 1, element **explainer link**);
- the same line under the billing Calculator tab's result in the app (motir-core), placed by that
  story.

The link wears the site's link treatment (`--el-link`, underlined). The in-text link pattern is the
only entry affordance this design draws; placing it on those two surfaces belongs to their stories.

## Elements — each named once

Wide layout (panel 2): a two-column body at the site's content width. Left, the **contents list**;
right, the **intro** and the ten sections.

- **Intro** — the page heading (`h1`, `--el-text-strong`) and one paragraph (`--el-text`). In the
  fallback state the **fallback note** sits under it.
- **Contents list** — an ordered list of the ten section headings with their two-digit numbers,
  `sticky` at the top of the left column. The current section wears `--el-tint-lavender` with
  `--el-text-strong`, the rest `--el-text-secondary`; rows use `--radius-control` and
  `--spacing-control-x-8` / `--spacing-control-y-4`.
- **Section head** — a two-digit number in mono (`--el-text-secondary`, never wraps) and the
  heading (`text-xl`, `--el-text-strong`), which may wrap to two or more lines. Each section has a
  top rule (`--el-border`).
- **Figure slot** — the dashed-border chip `⟨name⟩` in mono on `--el-tint-sky` with
  `--el-text-strong`, `--radius-badge`, `--spacing-chip-x-6`. It marks a value READ when the page
  renders; the build replaces the chip with the value in ordinary body type. A legend above panel 2
  says so.

The ten sections, in this order (`data-element="section-1"` … `section-10`):

1. **What you enter** — two paragraphs: two ranges a month, items planned in Motir and items run on
   Motir's runner; an item run on the org's own agent (Claude Code, Codex) through the MCP or CLI
   uses no running credits, so such an org enters zero runs and is quoted planning only.
2. **Model categories** — categories, not models; example models come from the live model list.
   **Category chips**: one figure slot per category, showing the working names exactly as the engine
   returns them. A secondary line: two selected categories share 50/50, three 33/33/33.
3. **Credits per item** — reference work per card × live model price × a lane factor for planning
   and for running; the reference is explained, no per-model cost is drawn. **Lane factor pair**: two
   slots, planning and running (see _The open lane-factor question_ below).
4. **The range** — low items at 1× to high items at 2×. **Range illustration**: "low · 1×", a bar on
   `--el-tint-lavender`, "high · 2×", and "Always a range, never a single number." No currency.
5. **The recommendation** — the **plan ladder**: Standard, Pro, Max and Max ×2, each a `Card` of
   its own with slots for its name, pool, monthly price and annual price (both cadences on every
   rung). Max ×2 is a plan of its own, never "two Max subscriptions" or a quantity. Under it the
   **top-up line** with the **top-up rate** slot. Then the **larger pool plan note** (`Card`
   lavender, `Pill` "Estimate"): above Max ×2 and a sensible top-up the calculator offers a larger
   pool plan sized from the org's own estimate, on the ladder's per-credit basis, bought
   self-serve; the **larger-pool estimate** slot gives the pool larger plans start from. No wording
   says "top-up only".
6. **Host, and what a plan includes beyond credits** — the **Host plan** `Card`: slots for its name,
   pool, monthly and annual price; the sentence that Host is a regular plan above Max ×2, bought
   from the price card and never recommended by the calculator; the **Host accounts rows**, three
   bordered rows "Account 1 · CI runners", "Account 2 · Agent runs", "Account 3 · Shared by indexing
   and hosted agents"; and a secondary line that until AWS grants their capacity a Host org runs on
   shared capacity with Max's limits. Under the card, one paragraph: the larger pool plans start
   well above Host and carry accounts of their own; every other plan runs on shared capacity with
   its concurrency set by its plan. No account count other than Host's three, no quota, no machine
   figure.
7. **Who pays for what** — the **who-pays sentences**, an ordered list of three separate items in
   this order: (1) every AI plan and top-up belongs to the organisation, credits shared, not priced
   by how many people use it, no quantity; (2) every AI plan includes one tracker seat at no charge;
   (3) seats beyond the first are per user, and an org with no AI plan pays for every seat. No seat
   price. "Per user" appears only in the third.
8. **Changing plan mid-period** — the **plan-change blocks**, two `Card`s side by side: **Moving
   up** (mint) and **Moving down** (peach), then a secondary line that the exact upgrade amount is
   shown on the billing page before confirming. No price or credit figure.
9. **What changes the answer** — one paragraph: a gateway price change or a retired model changes
   the estimate with no release.
10. **Invoices, security and SSO** — one line: standard Stripe invoicing and a plain contact link. No
    Enterprise card or wording, no contact-sales control.

## Figure slots — the complete list

| Slot                                   | Where                            | Read from                       |
| -------------------------------------- | -------------------------------- | ------------------------------- |
| category names (1–3)                   | section 2, category chips        | engine (categories as returned) |
| lane factor · planning, · running      | section 3, lane factor pair      | open — see below                |
| name · Standard / Pro / Max / Max ×2   | section 5, plan ladder           | plan catalog                    |
| pool (per rung)                        | section 5, plan ladder           | plan catalog                    |
| monthly price, annual price (per rung) | section 5, plan ladder           | plan catalog                    |
| top-up rate                            | section 5, top-up line           | plan catalog                    |
| larger-pool estimate                   | section 5, larger pool plan note | plan catalog (the larger plans) |
| name · Host, Host pool size            | section 6, Host plan             | plan catalog                    |
| Host price · monthly, · annual         | section 6, Host plan             | plan catalog                    |

The plan catalog is the same read the price card uses; this page adds no read of its own.

## The open lane-factor question

The calculator engine applies the two lane factors internally and does not return them. Whether the
page shows them as figures (the engine would have to serve them) or states them in words is the
owner's decision on the story. The design covers both: with figures, the **lane factor pair** shows
two slots; in words, it renders the fallback wording of section 3 ("Planning and running each carry
their own lane factor.") in every state, and nothing else on the page changes.

## States

- **Populated** (panel 2) — every slot filled.
- **Figure-free fallback** (panel 3) — the engine or catalog cannot be read, or answers a version the
  page does not know. The same ten sections in the same order; every slot is replaced by wording
  that states no figure (plan names stay, as words; "A plan of its own"; "at the catalog's top-up
  rate"; the category and lane-factor lines in words), and the **fallback note** sits under the
  intro: "Live figures are not available right now, so this page explains each step in words. The
  price page shows every plan with its price." It is a quiet note, not an error: `--el-surface-soft`
  with `--el-border` and `--el-text-secondary` text, `--radius-card`, no error colour, no icon, no
  retry control.
- **Loading** — not drawn. The page is static and the figure read happens before render.
- **Empty** — not applicable; the page always has its ten sections of words.
- **Error** — none; an unreadable figure resolves to the fallback.

## Narrow screens and long strings

Panel 4 (390px): the contents list becomes a **disclosure** ("On this page (10)", a `details` on
`--el-surface`) above the first section; the plan ladder stacks to one column; the two plan-change
blocks stack, Moving up first. Headings wrap; the section number never wraps or shrinks; no label
has a fixed width, and long words break (`overflow-wrap: anywhere`) rather than clip.

Panels 5 and 6 show the ten headings and a plan-change block head in **German** (the longest
strings) and **Japanese** (CJK) at 390px: headings wrap to two lines where needed and nothing
clips. The headings there are illustrative translations for length only.

## What this design does not draw

The calculator widget, the price card and Host's card on `/price`, the billing tab, the site shell,
and the link placement on the price page and billing tab all belong to other stories. It decides no
copy wording beyond layout filler and names no work item.
