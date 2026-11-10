'use client'

import { useState } from 'react'
import {
  AxisField,
  AxisNote,
  Button,
  Card,
  Combobox,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pill,
  Popover,
  SectionLabel,
  Segmented,
  Spinner,
  Switch,
  Textarea,
  ThemeSegmentedControl,
  TokensSpecimen,
  Tooltip,
} from '@motir/design-system'
import { RotateCcw } from 'lucide-react'
import { usePageLocale, useCopy } from '@/lib/copy'
import { cjkLangOf, defaultCjkFace } from '@/lib/cjkFaces'
import { useVisitAppearance } from '@/lib/useVisitAppearance'
import {
  CjkFaceChips,
  PaletteChips,
  StyleChips,
  TypeChips,
} from './AppearancePickers'

/*
 * motir.co/design — the public design showcase (MOTIR-1043 · 8.3.16).
 *
 * Layout from `design/marketing/design-showcase.*` (MOTIR-3861, re-measured by
 * MOTIR-3874); every word from `messages/en.json` `designShowcase.*`
 * (MOTIR-3862); every control, registry and primitive from the PUBLISHED
 * `@motir/design-system` — the copy this repository installs, never
 * motir-core's source.
 *
 * ⚠️ THE PAGE INVENTS NOTHING, AND THAT IS THE ARGUMENT IT MAKES. A showcase
 * that hand-rolled its own chips would be a picture of the design system
 * rather than the design system, so the pickers, the axis rows, the vignette,
 * the token specimen and every primitive below are the package's own exports.
 * `tests/designShowcaseSource.test.ts` asserts it against this file rather
 * than against a habit: no `--el-*` / `--color-*` declaration, no raw
 * `rounded-*` / `p-*` / `h-*` where a shape token exists, and every primitive
 * imported from the package.
 *
 * ⚠️ HOW THE WHOLE DOCUMENT RESTYLES, INCLUDING THE CHROME THIS COMPONENT DOES
 * NOT RENDER. `useVisitAppearance` writes `data-theme` / `-style` /
 * `-palette` / `-type` onto `document.documentElement`; `theme.css`'s 23
 * `[data-palette]`, 112 `[data-style]` and 9 `[data-type]` blocks then
 * re-resolve the token layer for the entire document. So the bar and the
 * footer change with the specimen even though they are rendered by
 * `app/layout.tsx`'s tree.
 *
 * ⚠️ FOR THE VISIT, AND NO LONGER (MOTIR-7724, narrowing MOTIR-3861's *a
 * visitor's choice PERSISTS*). The page opens on exactly the look the visitor
 * is already on, so arriving changes nothing. A pick restyles all of motir.co
 * for the rest of the visit — a visitor who picks Neo-Brutalism here meets the
 * landing in Neo-Brutalism — kept in this tab's sessionStorage only, so a new
 * tab or a reload is a new visit, which lands on a random style
 * (`LANDING_STYLES`, `lib/siteDefaults.ts`). **Reset to default** returns to
 * the style this visit landed on, and it is present exactly while any axis is
 * off it.
 */
export function DesignShowcase() {
  /*
   * ⚠️ HELD HERE, ON THE PARENT, NOT IN THE RAIL: the package's
   * `TokensSpecimen` mounts its own `ThemeProvider`, which stamps the APP's
   * defaults onto `<html>` when it mounts. React runs a parent's effects after
   * its children's, so the visit's choice is the write that lands and arriving
   * on the page still changes nothing.
   */
  const theme = useVisitAppearance()
  return (
    <>
      <AxisRail theme={theme} />
      <Specimen />
    </>
  )
}

/*
 * The rail — a full-width band under the bar: a header row carrying the theme
 * control and Reset, then the three registry axes as stacked `AxisField`s.
 *
 * A band rather than a sidebar, and that was measured rather than preferred:
 * Style is ELEVEN chips of real words and Palette is ten with a swatch each,
 * which in a 280px sidebar wraps the Style group alone to nine rows.
 *
 * It deliberately does NOT stick. The page's claim is that the WHOLE document
 * restyles, chrome included, so pinning the controls over a scrolling specimen
 * would hold the one region a visitor most needs to watch — the bar — out of
 * view.
 *
 * ⚠️ THE AXIS STACK SITS IN A `Card`, WHICH THE ASSET DOES NOT DRAW, AND THE
 * REASON IS A MEASUREMENT. `AxisField` renders its `help` line and `AxisNote`
 * at `text-xs text-(--el-text-muted)`, and `theme.css` says of that token in
 * its own words: *"AA-SAFE ONLY ON THE WHITE PAGE/CARD, and by 0.04 (4.54:1).
 * On --el-surface it is 4.17, on --el-muted 4.12, on --el-surface-soft 4.34 —
 * all under AA. A muted caption belongs inside a card, never on a panel."* The
 * asset draws exactly that — muted captions at 12px directly on the
 * `--el-surface-soft` band — because its own AA sweep measured the accent and
 * danger inks and not this pair. `--el-card` resolves to the same
 * `--color-background` as the page, so a `Card` here restores 4.54:1 for all
 * three of the failing inks (`-muted`, `-eyebrow`, `-helper`) while keeping
 * the band the asset's layout is built on. `tests/aaMatrix.test.ts` measures
 * it over all ten palettes in both themes rather than taking this on trust.
 */
function AxisRail({ theme }: { theme: ReturnType<typeof useVisitAppearance> }) {
  const copy = useCopy()
  const cjkLang = cjkLangOf(usePageLocale())
  const { offDefault, reset } = theme

  return (
    <section
      aria-label={copy.designShowcase.heading}
      className="border-b border-(--el-border) bg-(--el-surface-soft)"
    >
      <div className="mx-auto max-w-[1080px] px-4 py-3 sm:px-7">
        <Card
          header={
            /*
             * The rail's own header row: the theme axis on the left, the
             * control and Reset right-aligned — the arrangement the asset
             * states in prose and draws in panels 1 and 2. Theme is here
             * rather than a fourth stacked field because it is three fixed
             * segments rather than a registry of chips, and because the three
             * chip axes are what the fold measurement is about.
             *
             * Reset is ABSENT at arrival — a reset with nothing to reset is
             * noise (the asset's state 6a) — and appears the moment any axis
             * moves (6c). The row reserves its height either way, so the
             * first pick does not shift the page under the pointer.
             */
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-sm font-semibold text-(--el-text)">
                  {copy.designShowcase.theme.name}
                </span>
                <span className="text-xs text-(--el-text-muted)">
                  {copy.designShowcase.theme.help}
                </span>
              </div>
              <div className="flex min-h-(--height-btn-sm) flex-wrap items-center gap-2">
                {offDefault ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={reset}
                    leftIcon={
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                    }
                  >
                    {copy.designShowcase.reset}
                  </Button>
                ) : null}
                <ThemeSegmentedControl
                  value={theme.pattern}
                  onChange={theme.setPattern}
                  label={copy.designShowcase.theme.name}
                  labels={{
                    light: copy.designShowcase.theme.light,
                    dark: copy.designShowcase.theme.dark,
                    system: copy.designShowcase.theme.system,
                  }}
                />
              </div>
            </div>
          }
        >
          <AxisRow>
            <AxisField
              name={copy.designShowcase.style.name}
              help={copy.designShowcase.style.help}
              note={
                <AxisNote
                  name={copy.designShowcase.styles[theme.styleId].name}
                  tagline={copy.designShowcase.styles[theme.styleId].tagline}
                />
              }
            >
              <StyleChips
                value={theme.styleId}
                onChange={theme.setStyleId}
                label={copy.designShowcase.style.name}
              />
            </AxisField>
          </AxisRow>

          <AxisRow>
            <AxisField
              name={copy.designShowcase.palette.name}
              help={copy.designShowcase.palette.help}
              note={
                <AxisNote
                  name={copy.designShowcase.palettes[theme.palette].name}
                  tagline={copy.designShowcase.palettes[theme.palette].tagline}
                />
              }
            >
              <PaletteChips
                value={theme.palette}
                onChange={theme.setPalette}
                label={copy.designShowcase.palette.name}
              />
            </AxisField>
          </AxisRow>

          <AxisRow>
            {cjkLang ? (
              /*
               * A zh, ja or ko page offers its own fonts by name instead of
               * the six pairings, which change only Latin letters and so
               * nothing a reader of the page sees (Yue, 2026-10-09).
               */
              <AxisField
                name={copy.designShowcase.type.name}
                help={copy.designShowcase.type.help}
              >
                <CjkFaceChips
                  lang={cjkLang}
                  value={theme.cjkFaces[cjkLang] ?? defaultCjkFace(cjkLang)}
                  onChange={(face) => theme.setCjkFace(cjkLang, face)}
                  label={copy.designShowcase.type.name}
                />
              </AxisField>
            ) : (
              <AxisField
                name={copy.designShowcase.type.name}
                help={copy.designShowcase.type.help}
                note={
                  <AxisNote
                    name={copy.designShowcase.types[theme.type].name}
                    tagline={copy.designShowcase.types[theme.type].tagline}
                  />
                }
              >
                <TypeChips
                  value={theme.type}
                  onChange={theme.setType}
                  label={copy.designShowcase.type.name}
                />
              </AxisField>
            )}
          </AxisRow>
        </Card>
      </div>
    </section>
  )
}

/*
 * ⚠️ NARROW VIEWPORTS SCROLL EACH AXIS RATHER THAN WRAPPING IT, and this
 * wrapper is the whole of that. `AxisRadioGroup` is `flex-wrap` and takes no
 * className, so the change is made from OUTSIDE it — eleven style chips wrap
 * to six rows at 390px, which is ~190px of rail for one axis and pushes the
 * specimen off the fold entirely. As one scrolling row an axis is ~31px and
 * all four fit above it. Only the chip row scrolls; the page itself never
 * scrolls horizontally.
 */
function AxisRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-md:overflow-x-auto max-md:[&_[role=radio]]:shrink-0 max-md:[&_[role=radio]]:whitespace-nowrap max-md:[&_[role=radiogroup]]:flex-nowrap">
      {children}
    </div>
  )
}

/*
 * The composed specimen. Two parts, in the asset's own order: the primitives a
 * product is actually built out of, then `TokensSpecimen` — the package's own
 * isolation specimen, which carries the `--el-*` grid AND one `StyleVignette`
 * per style and per palette. Mounting the shipped export is what the asset
 * asks for; it is also the only version that cannot drift from the package.
 */
function Specimen() {
  const copy = useCopy()
  return (
    <>
      <div className="mx-auto max-w-[1080px] px-4 pt-10 pb-4 sm:px-7">
        <h1 className="mb-3 font-(family-name:--font-serif) text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-(--el-text) sm:text-[40px]">
          {copy.designShowcase.heading}
        </h1>
        <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-(--el-text-secondary) sm:text-[16px]">
          {copy.designShowcase.subline}
        </p>
      </div>

      <div className="mx-auto flex max-w-[1080px] flex-col gap-8 px-4 pb-4 sm:px-7">
        <section className="flex flex-col gap-3">
          <SectionLabel>
            {copy.designShowcase.specimen.sectionLabel}
          </SectionLabel>
          <ComposedUi />
        </section>
      </div>

      <TokensSpecimen />

      <div className="mx-auto max-w-[1080px] px-4 pb-14 sm:px-7">
        <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-(--el-text-secondary)">
          {copy.designShowcase.closing}
        </p>
      </div>
    </>
  )
}

/*
 * The primitives the asset draws that `TokensSpecimen` does not carry —
 * overlays, the two state primitives, the segmented control and the switch.
 *
 * The labels here are specimen data, but a reader on `/ja/design` reads them
 * all the same, so they live in the catalogue under
 * `designShowcase.specimen` (MOTIR-7970) and translate with the rest of the
 * page. They still obey the register: a work item is never an "issue". The one
 * literal left is the demo assignee's name, which no locale translates.
 */
function ComposedUi() {
  const s = useCopy().designShowcase.specimen
  const [live, setLive] = useState(true)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [assignee, setAssignee] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // ⚠️ The layout lives on a wrapper INSIDE the card: `Card` puts its
  // children in a plain `<div>` of its own, so a `flex flex-col gap-*` on the
  // Card itself spaces that one wrapper and none of the rows below.
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">{s.primary}</Button>
          <Button variant="secondary">{s.secondary}</Button>
          <Button variant="ghost">{s.ghost}</Button>
          <Button variant="danger">{s.danger}</Button>
          <Pill>{s.badge}</Pill>
          <Pill status="done">{s.done}</Pill>
          <Pill status="in-progress">{s.inProgress}</Pill>
          <Tooltip content={s.tooltip}>
            <Button variant="ghost" size="sm">
              {s.hoverMe}
            </Button>
          </Tooltip>
          <Spinner />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Input
            label={s.titleLabel}
            defaultValue={s.titleValue}
            className="min-w-[220px]"
          />
          <Combobox
            label={s.assigneeLabel}
            placeholder={s.assigneePlaceholder}
            options={[
              { value: 'yue', label: 'Zhu Yue' },
              { value: 'unassigned', label: s.unassigned },
            ]}
            value={assignee}
            onChange={setAssignee}
          />
          <Segmented
            label={s.viewLabel}
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: s.board },
              { value: 'list', label: s.list },
            ]}
          />
          <div className="flex items-center gap-2">
            <Switch
              id="showcase-live"
              checked={live}
              onCheckedChange={setLive}
              aria-label={s.liveUpdates}
            />
            <label
              htmlFor="showcase-live"
              className="text-sm text-(--el-text-secondary)"
            >
              {s.liveUpdates}
            </label>
          </div>
        </div>

        <Textarea label={s.notesLabel} rows={2} defaultValue={s.notesValue} />

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <Popover.Trigger asChild>
              <Button variant="secondary" size="sm">
                {s.popover}
              </Button>
            </Popover.Trigger>
            <Popover.Content className="grid w-80 gap-1.5 p-(--spacing-card-padding)">
              <p className="m-0 text-[15px] font-semibold text-(--el-text)">
                {s.popover}
              </p>
              <p className="m-0 text-sm text-(--el-text-secondary)">
                {s.popoverBody}
              </p>
            </Popover.Content>
          </Popover>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            {s.modal}
          </Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title={s.modal}
            description={s.modalDescription}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState title={s.emptyTitle} description={s.emptyDescription} />
          <ErrorState title={s.errorTitle} description={s.errorDescription} />
        </div>
      </div>
    </Card>
  )
}
