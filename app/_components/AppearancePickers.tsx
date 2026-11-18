'use client'

import {
  AxisRadioGroup,
  Background,
  BACKGROUND_IDS,
  BACKGROUND_NONE,
  PALETTE_IDS,
  STYLE_IDS,
  TYPE_IDS,
  type AxisOption,
  type BackgroundChoice,
  type PaletteId,
  type StyleId,
  type TypeId,
} from '@motir/design-system'
import { Ban } from 'lucide-react'
import { useCopy } from '@/lib/copy'
import { cjkFaceLabelClass, cjkFaces, type CjkLang } from '@/lib/cjkFaces'

/*
 * The `/design` rail's chip rows, in the reader's language (Yue, 2026-10-09).
 *
 * The package's `StylePicker` / `PalettePicker` / `TypePicker` label each chip
 * with its registry's English name and take no labels of their own, so on
 * `/ja/design` the three rows read in English. These are the same rows built
 * the same way — the package's `AxisRadioGroup` over the package's id lists —
 * with each label read from `designShowcase.styles|palettes|types` in the
 * catalogue. `tests/cjkFaces.test.ts` holds the English catalogue to the
 * registries, so a style the package adds fails there until it has words.
 */

interface PickerProps<T extends string> {
  value: T
  onChange: (value: T) => void
  label: string
}

export function StyleChips(props: PickerProps<StyleId>) {
  const styles = useCopy().designShowcase.styles
  const options = STYLE_IDS.map((id) => ({ id, label: styles[id].name }))
  return <AxisRadioGroup {...props} options={options} />
}

/*
 * The swatch reads the palette's own accent fill through a scoped
 * `data-palette`, where the package's picker hardcodes the light-theme hex it
 * does not export. The cost is that the dot follows the page's theme: in dark
 * it shows the palette's dark fill.
 */
export function PaletteChips(props: PickerProps<PaletteId>) {
  const palettes = useCopy().designShowcase.palettes
  const options = PALETTE_IDS.map((id) => ({
    id,
    label: palettes[id].name,
    leading: (
      <span
        data-appearance-scope=""
        data-palette={id}
        className="size-[11px] shrink-0 rounded-full bg-(--el-accent)"
        aria-hidden="true"
      />
    ),
  }))
  return <AxisRadioGroup {...props} options={options} />
}

/** As the package's: each label scopes its own pairing and previews its headline face. */
export function TypeChips(props: PickerProps<TypeId>) {
  const types = useCopy().designShowcase.types
  const options = TYPE_IDS.map((id) => ({
    id,
    label: types[id].name,
    scope: { 'data-type': id },
    labelClassName: 'font-serif',
  }))
  return <AxisRadioGroup {...props} options={options} />
}

/*
 * The Background row (MOTIR-11610, drawn by MOTIR-11603): the seven
 * backgrounds in registry order, then None. Each chip leads with a still
 * swatch of its background, the way a palette chip leads with its dot: the
 * package's `<Background still>` drawn once at chip size, following the page's
 * palette and theme. None's swatch is an empty dashed frame.
 */
export function BackgroundChips(props: PickerProps<BackgroundChoice>) {
  const ds = useCopy().designShowcase
  const options: Array<AxisOption<BackgroundChoice>> = [
    ...BACKGROUND_IDS.map((id) => ({
      id,
      label: ds.backgrounds[id].name,
      leading: (
        <span
          aria-hidden="true"
          className="relative isolate inline-block h-4 w-7 shrink-0 overflow-hidden rounded-(--radius-badge) border border-(--el-border) bg-(--el-page-bg)"
        >
          <Background id={id} still />
        </span>
      ),
    })),
    {
      id: BACKGROUND_NONE,
      label: ds.background.none,
      leading: (
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-7 shrink-0 items-center justify-center rounded-(--radius-badge) border border-dashed border-(--el-border-strong) bg-(--el-page-bg)"
        >
          <Ban className="size-2.5 text-(--el-text-secondary)" />
        </span>
      ),
    },
  ]
  return <AxisRadioGroup {...props} options={options} />
}

/** A zh, zh-tw, ja or ko page's own fonts, each chip named and drawn in its face. */
export function CjkFaceChips({
  lang,
  ...props
}: PickerProps<string> & { lang: CjkLang }) {
  const options = cjkFaces(lang).map((face) => ({
    id: face.id,
    label: face.family,
    labelClassName: cjkFaceLabelClass(lang, face.id),
  }))
  return <AxisRadioGroup {...props} options={options} />
}
