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

**Copy rule (Yue, 2026-10-26): every string on this page is app.motir.co's own.** The price card
and the calculator say exactly what the signed-in billing screens say, taken word for word from
motir-core `messages/en.json` (`billing.plans.*`, `billing.topup.*`, `billing.calculator.*`). The
build imports those strings into the marketing catalog under the same wording; it does not
paraphrase them. The few lines the app has no string for are marked **NEW** in the copy table.

1. **Price card.** The app's plans view, redrawn for a signed-out visitor. In order:
   - heading "Choose your plan" and the app's sub-line (`plans.chooseSub`)
   - the **Monthly / Annual toggle** (`Segmented`, "Billing cadence"), with the mint "Save ~33%"
     `Pill` beside it on Annual
   - **five plan cards in ONE row**, Standard, Pro, Max, Max ×2, Host, equal width and equal
     height, filling the page's 1400px content width. Below the row's natural width the row scrolls
     sideways rather than wrapping, as the app's does. Host is a card like the others.

   The grid is DATA-DRIVEN. One plan card is drawn once and the five share it, so a plan added or
   repriced in the catalog needs no redraw.

2. **Plan card.** The app's `PlanCard`, line for line, top to bottom:
   - the plan name, and on the catalog's recommended plan (Pro) the lavender "Recommended" `Pill`
     and an accent border
   - the tier's use-case line (`plans.tiers.<key>.useCase`)
   - the price: "${n} / mo" with "${yr} / yr · Save ${n} with annual" (Monthly), or the per-month
     equivalent with "billed annually · ${yr} / yr" and a mint "Save ${n}/yr" `Pill` (Annual)
   - "{n} credits / mo"
   - "+ 1 Motir seat · work items uncapped" (the catalog's included-seat count)
   - the feature list: "Everything in {prev}, plus" on every tier above Standard, then the tier's two
     features
   - the button: "Upgrade to Pro" (primary) on the recommended plan, "Choose {plan}" (secondary) on
     the rest. Signed out, it goes to sign-up with the plan carried
3. **Need more credits?** A `Card` under the row with the app's `plans.needMore` copy, naming Host
   and its pool, and the "Open the Calculator" button, which scrolls to the calculator below.
4. **Top up credits.** A `Card` with the app's top-up title, sub-line and rate line
   ("${unit} per {credits} credits · one-time · tax at checkout. …").
5. **Seats and per-organisation lines.** A mint `Card` beside it, in the app's words:
   "Every AI plan includes 1 Motir seat at no charge.", "Further seats: $5 per user, per month." and
   "One plan for the whole organization — its credits are shared by everyone."
6. **Invoice line (NEW).** One plain line inside the seat card: Stripe invoicing and a contact
   address. It is not a card and not a form.
7. **Calculator.** Two labelled low–high ranges, each a `fieldset` with a `legend` and two `Input`s
   ("Low", "High"):
   - "Items planned in Motir a month"
   - "Items run on Motir's runner a month", with help text: items run on your own agent through
     Motir's MCP or CLI use no credits here, and 0 is fine.

   ONE picker of model categories (a `fieldset` of `Checkbox`es, one to three), each listing the
   engine's example models ("For example: …"). Two picks are split evenly, and three picks are split
   evenly. The picker's help says so, in the app's words, and each picked category shows "{share} of
   the run". A **cadence control** (`Segmented`, "Billing cadence", Monthly / Annual, defaulting to
   the engine's `defaultCadence`) sits above the submit, "Estimate credits".

8. **Estimate output.** A sky-tinted `Card` in a live region, beside the form, in the app's
   calculator words. In order:
   - what was priced (`result.priced`, both ranges echoed)
   - "Credits a month", the range, and the app's estimate caveat
   - "The plan that fits", by the engine's name
   - "Top-up we'd estimate"; above a regular plan's pool, the app's "Your estimate is above {plan}'s
     {credits} credits a month, so the answer is {plan} with top-ups for the rest."
   - for a larger pool, "Larger credit pool" with the returned name, pool and price, the app's
     `result.largerPlan` line, its three-AWS-accounts line and its estimate note
   - the **See-Host line (NEW)**, copy only with no number, on a lavender tint. It is shown when the
     answer is Max ×2 with a top-up, or a larger pool plan.
   - "One plan for the whole organization — its credits are shared by everyone." and the "Go to this
     plan" button, which scrolls to that plan's card

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

| #   | Panel                                                               | What it shows                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | Price card, monthly                                                 | five cards in one row at monthly prices, Pro recommended, then Need more credits, top-up and seats                                                                                                                                                                                          |
| 3   | Price card, annual                                                  | the toggle on Annual with Save ~33%, every card on its per-month equivalent and Save ${n}/yr                                                                                                                                                                                                |
| 4   | Price card, plan prices unavailable                                 | the ladder read failed or answered an unknown version: an `ErrorState` with retry in place of the cards and toggle, NO figure. The seat block, per-organisation lines and invoice line still show                                                                                           |
| 5   | Calculator, initial                                                 | blank ranges, nothing picked, categories listed; the output reads the idle line                                                                                                                                                                                                             |
| 6   | Calculator, loading                                                 | the submit carries `aria-busy` (drawn at full ink, not the faded disabled button), and the output says "Working out your credits…". The previous answer is not shown as current                                                                                                             |
| 7   | Estimate, ordinary plan                                             | Pro by name, top-up "None", no larger-plan or See-Host line                                                                                                                                                                                                                                 |
| 8   | Estimate, Max ×2 with a top-up                                      | Max ×2 by name, top-up estimate, the See-Host line                                                                                                                                                                                                                                          |
| 9   | Estimate, larger pool plan                                          | returned name, pool and price, the app's larger-pool and own-accounts lines, the See-Host line                                                                                                                                                                                              |
| 10  | Invalid or empty range                                              | the message beside the offending `Input` (`error` → `aria-invalid` + `aria-describedby`), and the output asks for the fix. No number                                                                                                                                                        |
| 11  | Engine or category list unavailable, or an unknown response version | `ErrorState` "We can't estimate right now…" with retry, no number. The price card is unaffected                                                                                                                                                                                             |
| 12  | Category with no listed model                                       | that `Checkbox` unpicked and the app's line ("No model in this category right now, so it can't be picked."), no number. The build makes it unpickable with `aria-disabled` and keeps its label on `--el-text-secondary`, not the faded disabled ink, because the message must stay readable |
| 13  | Model retired from the list                                         | gone from the picker; a stale pick is dropped and a `role="status"` line says which                                                                                                                                                                                                         |
| 14  | Narrow viewport (390 px)                                            | header collapsed to Menu, the plan row scrolling sideways as the app's does, calculator after                                                                                                                                                                                               |

Validation messages follow the engine's `problem+json` refusals, mapped to the billing Calculator
tab's copy. Examples: "The low end has to be at or below the high end." and "Enter at least one item
a month — with both ranges at 0 there is nothing to price."

## Accessibility

- **Focus order:** header → cadence toggle → each plan card's button, in ladder order → Open the
  Calculator → seat and invoice lines (not focusable) → planned Low, High → run Low, High → each category checkbox → cadence control → submit
  → the output's Go to this plan button.
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
`--el-accent` (the recommended card's border), `--el-success` (feature ticks), `--shadow-card`, and the tints `--el-tint-lavender` (Recommended pill, See-Host, current nav entry), `--el-tint-mint` (Save pills, seats) and
`--el-tint-sky` (estimate). Shape comes from the parts' own tokens, plus `--radius-control`,
`--radius-card`, `--spacing-control-x-8`, `--spacing-control-y-4`, `--spacing-control-y-8` and
`--spacing-card-padding-12`.

## Copy — keys for the translation pass

English only. There is one string per line, and amounts and names are parameters.

| marketing key                    | app string it copies (motir-core `messages/en.json`)                                                                                                                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price.plans.*`                  | `billing.plans.chooseTitle`, `chooseSub`, `cadenceLabel`, `monthly`, `annual`, `saveBadge`, `recommended`, `perMoEquiv`, `annualSub`, `annualSave`, `monthlySub`, `creditsAllotment`, `seatIncluded`, `everythingIn`, `ctaChoose`, `ctaUpgrade`, `tiers.*`                                            |
| `price.needMore.*`               | `billing.plans.needMore.title`, `body`, `action`                                                                                                                                                                                                                                                      |
| `price.topup.*`                  | `billing.topup.title`, `subtitle`, `rate`                                                                                                                                                                                                                                                             |
| `price.seats.*`                  | `billing.calculator.seat.included`, `feePerUserMonthly`; `billing.calculator.result.perOrg`                                                                                                                                                                                                           |
| `price.calc.*`                   | `billing.calculator.title`, `subtitle`, `inputs.*`, `categories.empty`, `result.*` (idle, priced, loading, creditsLabel, estimateCaveat, planLabel, topupLabel, regularWithTopUps, largerPoolLabel, largerPlan, largerPlanEstimate, goToPlan, perOrg), `errors.*`; `billing.plans.larger.ownAccounts` |
| `price.invoice` **NEW**          | Need an invoice? We bill through Stripe invoicing — write to {email}.                                                                                                                                                                                                                                 |
| `price.seeHost` **NEW**          | Running at this size every month? Host may suit you better — see the Host plan above.                                                                                                                                                                                                                 |
| `price.retired` **NEW**          | A model you picked is no longer offered, so {category} was removed from your picks.                                                                                                                                                                                                                   |
| `price.plansUnavailable` **NEW** | Plan prices can't be shown right now. Try again in a moment.                                                                                                                                                                                                                                          |
| `nav.price`, `footer.price`      | Price                                                                                                                                                                                                                                                                                                 |

The marketing catalog holds its own copy of each app string (the two apps ship separately). A
change to the app's wording is a change to these keys too.

## Specs this was drawn from

- The public calculator engine's contract (`motir-ai` `docs/contract.md`, § Public calculator; the
  request is two ranges, one to three categories and a cadence; the response is the credit range,
  recommended plan, top-up, larger-pool ceiling and `version` 2).
- The billing Calculator tab in `motir-core` (`CalculatorView.tsx` and its `billing.calculator`
  copy), whose labels, help and error lines this page reuses.
- The catalog's ladder (`regular`, `standing` = Host, `larger`) as `motir-ai`
  `src/billing/calculatorTypes.ts` defines it.

## Amendment 2026-10-27 — the ladder line is removed

The plan card no longer carries the ladder line ("Same price per credit on every plan" on Standard,
"{multiple}× {plan}'s credits · same price per credit" on the rest). The owner judged it unneeded,
and app.motir.co's plans view dropped it in the same change. Each card goes straight from
"{n} credits / mo" to the included-seat line. `pricePage.plans.ladderFirst` and `ladderMultiple`
are gone from every locale, and the line is gone from the mock.
