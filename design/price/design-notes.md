# Design notes — `design/price/` (motir.co/price)

## Design system — read first

- `package.json` depends on `@motir/design-system` `0.17.0` (read from
  `node_modules/@motir/design-system/package.json`).
- `app/globals.css` line 19: `@import '@motir/design-system/theme.css';`.
- **Verdict: ON MOTIR DESIGN (branch a).** Both checks hold.
- The site's own axes, from `lib/siteDefaults.ts` (`SITE_APPEARANCE`), rendered on `<html>` by
  `app/layout.tsx`: `data-theme="light"`, `data-style="hand-drawn-indie"`, `data-palette="motir"`
  (the package default, `DEFAULT_PALETTE_ID`), `data-type="grotesk"`.
- `0.17.0` exports `@motir/design-system/mock`, so `price.mock.html` is built with `renderMock` from
  the package's parts at those axes, with the Space Grotesk and JetBrains Mono `@font-face` blocks
  the area's earlier mocks embed (`design/marketing/site-header--language-switcher--globe.mock.html`).

Parts used: `Button` (primary, secondary, ghost), `Card` (tints none, lavender, mint, sky), `Pill`
(tone neutral), `Segmented`, `Input` (with `label` and `error`), `Checkbox` (`labelVisible`),
`Spinner`, `ErrorState` (with retry). The site header and footer are drawn from their shipped markup
(`app/_components/SiteHeader.tsx`, `app/_components/SiteFooter.tsx`): same order, same labels, same
current-page treatment.

No part is missing from the package. Nothing here is a proposed addition to `@motir/design-system`
and nothing is a product-local component.

## The surface

The signed-out page at **`/price`** (every locale prefix the site serves), for a prospect or an owner
who is not signed in. It holds two sections in this order: **the price card** and **the
calculator**.

**Figures are illustrative.** Every price, credit amount, plan name and estimate in the mock is a
stand-in taken from a recorded catalog response and a recorded engine response. The asset is not a
source of plan prices, pools or thresholds. The build reads every figure from data.

## Elements — each named once

1. **Price card.** Five plan cards in ladder order: Standard, Pro, Max, Max ×2, Host. A
   **Monthly / Annual toggle** (`Segmented`, labelled "Billing cadence") sits above them and
   switches every card's price. Standard to Max ×2 sit in one row of four. Host follows as a
   full-width card beneath them: it is the top of the ladder, and its capacity line needs the width.
   The grid is DATA-DRIVEN. One plan card is drawn once and the five share it, so a plan added or
   repriced in the catalog needs no redraw. A plan the catalog offers on only one cadence shows no
   price on the other cadence; the build hides that card's price line rather than inventing one.
   Max ×2 is a plan of its own with its own name and prices. No text says "two Max subscriptions" or
   names a quantity.
2. **Included-seat line.** "One tracker seat included at no charge", on every card, Host included.
3. **Host card.** The same plan card as the other four, with the lavender tint, a neutral `Pill`
   ("Own capacity") and the **own-capacity line**: Host runs on AWS capacity of its own, with its
   own pools for CI, for agent runs, and for indexing and hosted agents together, and until that
   capacity is ready it runs on the shared pools at Max's limits. The line carries **no figure**: no
   vCPU, no account count, no parallel-run number. Host has a buy path ("Choose Host") like the
   others.
4. **Seat-fee block.** A mint-tinted `Card` titled "Seats": "$5 a month per user for seats beyond the
   first." There is no annual seat figure. The amount is one parameter of one string (`{price}`).
5. **Per-organisation lines.** Two separate plain lines beside the seat block:
   - AI plans and top-ups belong to the organisation: one AI plan per organisation, its credits shared
     by everyone, never priced per user.
   - Every AI plan includes one tracker seat, and each further seat is priced per user.

   No sentence on the page says the page as a whole has no per-user or per-seat price.

6. **Invoice line.** One plain line: Stripe invoicing and a contact address. It is not a card and not
   a form.
   Under the ladder, one plain line gives the top-up rate ("Top up at {price} per {credits}
   credits"), read from the catalog. A **Larger credit pools** card follows. It explains, with no
   figure, that pools above Host are sized to an estimate and offered by the calculator.
7. **Calculator.** Two labelled low–high ranges, each a `fieldset` with a `legend` and two `Input`s
   ("Low", "High"):
   - "Items planned in Motir a month"
   - "Items run on Motir's runner a month", with help text: items run on your own agent through
     Motir's MCP or CLI use no credits here, and 0 is fine.

   ONE picker of model categories (a `fieldset` of `Checkbox`es, one to three), each listing the
   engine's example models ("For example: …"). Two picks are split evenly, and three picks are split
   evenly. The picker's help says so. A **cadence control** (`Segmented`, labelled "Price the
   estimate", Monthly / Annual, defaulting to the engine's `defaultCadence`) sits above the submit,
   "Estimate credits".

8. **Estimate output.** A sky-tinted `Card` in a live region, beside the form. In order:
   - what was priced (both ranges echoed)
   - the credit range
   - the recommended plan by the engine's name
   - the top-up estimate
   - for a larger pool, the **Larger-plan line**: the returned name, pool and price, plus "A larger
     pool carries more machines per fleet, on AWS accounts of its own."
   - the **See-Host line**, copy only with no number, on a lavender tint matching the Host card. It
     is shown when the answer is Max ×2 with a top-up, or a larger pool plan.
   - a link, "How the estimate is worked out", to the how-it-works page

   The calculator never recommends Host. Host reaches the visitor only through the See-Host line.

9. **Calculator messages.** One per non-happy state (see _States_). None shows a number.

**What is NOT on the page:** no Enterprise card, no contact-sales control, no $ cost or margin
figure, no threshold or formula text.

## Access path

`/price` is reached two ways, both drawn in panel 1:

- **Header navigation:** a **Price** entry, third in the bar, after "How to use" and before "Motir
  builds itself". On `/price` it wears the bar's shipped current-page treatment (`aria-current="page"`
  and the lavender tint, as every peer entry does on its own page). On a narrow viewport it is an item
  in the shipped Menu sheet, in the same order.
- **Footer:** a **Price** link in the Product column, after "How to use Motir" and before "Start
  free". It is a `site: true` link like its peers, so it resolves to motir.co from a tenant host.

Copy keys: `nav.price` = "Price", `footer.price` = "Price".

## States — one panel each

| #   | Panel                                                               | What it shows                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | Price card, monthly                                                 | five cards at monthly prices, seat line on each, Host with its capacity line                                                                                                                                                                                    |
| 3   | Price card, annual                                                  | the toggle on Annual, every price `/ year`                                                                                                                                                                                                                      |
| 4   | Price card, plan prices unavailable                                 | the ladder read failed or answered an unknown version: an `ErrorState` with retry in place of the cards and toggle, NO figure. The seat block, per-organisation lines and invoice line still show                                                               |
| 5   | Calculator, initial                                                 | blank ranges, nothing picked, categories listed; the output reads the idle line                                                                                                                                                                                 |
| 6   | Calculator, loading                                                 | the submit carries `aria-busy` (drawn at full ink, not the faded disabled button), and the output says "Working out your credits…". The previous answer is not shown as current                                                                                 |
| 7   | Estimate, ordinary plan                                             | Pro by name, top-up "None", no larger-plan or See-Host line                                                                                                                                                                                                     |
| 8   | Estimate, Max ×2 with a top-up                                      | Max ×2 by name, top-up estimate, the See-Host line                                                                                                                                                                                                              |
| 9   | Estimate, larger pool plan                                          | returned name, pool and price, the more-machines line, the See-Host line                                                                                                                                                                                        |
| 10  | Invalid or empty range                                              | the message beside the offending `Input` (`error` → `aria-invalid` + `aria-describedby`), and the output asks for the fix. No number                                                                                                                            |
| 11  | Engine or category list unavailable, or an unknown response version | `ErrorState` "We can't estimate right now…" with retry, no number. The price card is unaffected                                                                                                                                                                 |
| 12  | Category with no listed model                                       | that `Checkbox` unpicked and its line naming it ("No model in Fast right now…"), no number. The build makes it unpickable with `aria-disabled` and keeps its label on `--el-text-secondary`, not the faded disabled ink, because the message must stay readable |
| 13  | Model retired from the list                                         | gone from the picker; a stale pick is dropped and a `role="status"` line says which                                                                                                                                                                             |
| 14  | Narrow viewport (390 px)                                            | header collapsed to Menu, cards stacked one per row, calculator inputs first and output after                                                                                                                                                                   |

Validation messages follow the engine's `problem+json` refusals, mapped to the billing Calculator
tab's copy. Examples: "The low end has to be at or below the high end." and "Enter at least one item
a month — with both ranges at 0 there is nothing to price."

## Accessibility

- **Focus order:** header → cadence toggle → each plan card's button, in ladder order → seat and
  invoice lines (not focusable) → planned Low, High → run Low, High → each category checkbox → cadence control → submit
  → the output's how-it-works link.
- **Labels:** each range is a `fieldset` whose `legend` names it, and its two `Input`s carry visible
  "Low" / "High" labels. The toggle is a labelled `Segmented` ("Billing cadence"). Category checkboxes
  carry their category name as the label.
- **Live region:** the estimate output is `aria-live="polite"` and `aria-atomic="true"`, so a new
  estimate, the loading line and the unavailable message are all announced. The retired-model note is
  `role="status"`, and a category-count error is `role="alert"`.
- **Errors:** every field error comes from `Input`'s `error`, which sets `aria-invalid` and ties the
  message with `aria-describedby`.
- **Ink:** body copy uses `--el-text`, and secondary copy uses `--el-text-secondary`, which clears AA
  on every surface and tint used here. No message uses `--el-text-faint` or `--el-text-muted`.

## Tokens

Colour is `--el-*` only: `--el-page-bg`, `--el-surface`, `--el-text`, `--el-text-strong`,
`--el-text-secondary`, `--el-link`, `--el-border`, `--el-border-soft`, `--el-danger-on-surface`, and
the tints `--el-tint-lavender` (Host, See-Host, current nav entry), `--el-tint-mint` (seats) and
`--el-tint-sky` (estimate). Shape comes from the parts' own tokens, plus `--radius-control`,
`--radius-card`, `--spacing-control-x-8`, `--spacing-control-y-4`, `--spacing-control-y-8` and
`--spacing-card-padding-12`.

## Copy — keys for the translation pass

English only. There is one string per line, and amounts and names are parameters.

| key                                            | English                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price.title`                                  | Plans and prices                                                                                                                                                                                                                                                                                        |
| `price.lede`                                   | One AI plan per organization, shared by everyone in it. Every figure below comes from the live catalog.                                                                                                                                                                                                 |
| `price.cadence.label` / `.monthly` / `.annual` | Billing cadence / Monthly / Annual                                                                                                                                                                                                                                                                      |
| `price.card.perMonth` / `.perYear`             | / month · / year                                                                                                                                                                                                                                                                                        |
| `price.card.credits`                           | {credits} credits a month                                                                                                                                                                                                                                                                               |
| `price.card.seatIncluded`                      | One tracker seat included at no charge                                                                                                                                                                                                                                                                  |
| `price.card.choose`                            | Choose {plan}                                                                                                                                                                                                                                                                                           |
| `price.card.hostBadge`                         | Own capacity                                                                                                                                                                                                                                                                                            |
| `price.card.hostCapacity`                      | Host runs on AWS capacity of its own: its own pools for CI, for agent runs, and for indexing and hosted agents together. Until that capacity is ready, it runs on the shared pools at Max's limits.                                                                                                     |
| `price.topUp`                                  | Need more in a month? Top up at {price} per {credits} credits.                                                                                                                                                                                                                                          |
| `price.seats.heading` / `.fee`                 | Seats / ${price} a month per user for seats beyond the first.                                                                                                                                                                                                                                           |
| `price.org.plan`                               | AI plans and top-ups belong to the organization: one AI plan per organization, its credits shared by everyone, never priced per user.                                                                                                                                                                   |
| `price.org.seat`                               | Every AI plan includes one tracker seat; each further seat is priced per user.                                                                                                                                                                                                                          |
| `price.invoice`                                | Need an invoice? We bill through Stripe invoicing — write to {email}.                                                                                                                                                                                                                                   |
| `price.larger.heading` / `.body`               | Larger credit pools / Above Host, larger pools are sized to an estimate. The calculator below offers one when your range needs it.                                                                                                                                                                      |
| `price.plansUnavailable`                       | Plan prices can't be shown right now. Try again in a moment.                                                                                                                                                                                                                                            |
| `price.calc.*`                                 | the calculator strings drawn in panels 5–13 (title, lede, the two range labels, run help, Low/High, category label/help/examples, submit, idle, loading, priced, credits/plan/top-up/larger labels, larger-machines line, See-Host line, how-it-works link, unavailable, empty category, retired model) |
| `nav.price`, `footer.price`                    | Price                                                                                                                                                                                                                                                                                                   |

## Specs this was drawn from

- The public calculator engine's contract (`motir-ai` `docs/contract.md`, § Public calculator; the
  request is two ranges, one to three categories and a cadence; the response is the credit range,
  recommended plan, top-up, larger-pool ceiling and `version` 2).
- The billing Calculator tab in `motir-core` (`CalculatorView.tsx` and its `billing.calculator`
  copy), whose labels, help and error lines this page reuses.
- The catalog's ladder (`regular`, `standing` = Host, `larger`) as `motir-ai`
  `src/billing/calculatorTypes.ts` defines it.
