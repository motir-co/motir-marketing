import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useCopy } from '@/lib/copy'
import { useCanvas } from './canvas'

/*
 * The architecture schematic on "How Motir works": what is inside the rack's
 * modules, drawn the way a synthesizer's service manual draws its board —
 * components joined by signal lines, grouped by where they run.
 *
 * Every part and wire is a real service and a real connection (read from the
 * motir-core, motir-ai and motir-gateway repositories, 2026-10):
 *  • ink says what travels on a wire — MCP (orange: your agent), HTTP, a
 *    stream (SSE / WebSocket), a database or object-store line, or the design
 *    system arriving at build time;
 *  • a dashed wire stays inside the private network (the AWS VPC), a solid
 *    one crosses the public internet over TLS;
 *  • the arrowhead points away from the caller; a wire with two heads carries
 *    traffic both ways (a WebSocket, a webhook answered by API calls).
 * Where two wires cross without a dot they are not connected.
 *
 * Same inks as the rack (`.hiw-rack` in globals.css). Laid out on the
 * 1600-wide grid and spread across a wider canvas (`canvas.ts`): every
 * position and part width stretches; text, insets, arrowheads and dots keep
 * their size.
 *
 * Every label that lives in a box carries `data-fit` (the room it has); a
 * translation longer than that room is squeezed to fit (`textLength`) rather
 * than spilling over the box's edge.
 */

type Pt = readonly [number, number]
type Kind = 'mcp' | 'http' | 'stream' | 'data' | 'build'
/** Each zone's parts share a tint, so where a part runs reads at a glance. */
type Tint = 'sky' | 'lavender' | 'mint' | 'yellow'

const MARKER: Record<Kind, string> = {
  mcp: 'url(#hiw-arr-w)',
  http: 'url(#hiw-arr-c)',
  stream: 'url(#hiw-arr-c)',
  data: 'url(#hiw-arr-s)',
  build: 'url(#hiw-arr-s)',
}

/** An orthogonal polyline with its corners rounded. */
function routed(pts: readonly Pt[], r = 9) {
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    const k1 = Math.min(r, Math.hypot(x - px, y - py) / 2)
    const k2 = Math.min(r, Math.hypot(nx - x, ny - y) / 2)
    const ax = x - Math.sign(x - px) * k1
    const ay = y - Math.sign(y - py) * k1
    const bx = x + Math.sign(nx - x) * k2
    const by = y + Math.sign(ny - y) * k2
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`
  }
  const [lx, ly] = pts[pts.length - 1]
  return `${d} L${lx} ${ly}`
}

function Wire({
  pts,
  kind,
  both = false,
  end = true,
  priv = false,
}: {
  pts: readonly Pt[]
  kind: Kind
  both?: boolean
  end?: boolean
  priv?: boolean
}) {
  const { X } = useCanvas()
  return (
    <path
      d={routed(pts.map(([x, y]) => [X(x), y] as const))}
      className={`w-${kind}${priv ? ' w-priv' : ''}`}
      markerEnd={end ? MARKER[kind] : undefined}
      markerStart={both ? MARKER[kind] : undefined}
    />
  )
}

function Dot({ x, y, kind = 'data' }: { x: number; y: number; kind?: Kind }) {
  return (
    <circle cx={useCanvas().X(x)} cy={y} r={4.5} className={`dot-${kind}`} />
  )
}

function Tag({
  x: gx,
  y,
  children,
  anchor = 'middle',
}: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  const { X } = useCanvas()
  const x = X(gx)
  return (
    <text x={x} y={y} className="w-lbl" textAnchor={anchor}>
      {children}
    </text>
  )
}

/** A component: an IC-style body with pin stubs, a reference and its name. */
function Part({
  x: gx,
  y,
  w: gw,
  h,
  code: designator,
  name,
  you = false,
  ext = false,
  pins = true,
  tint,
}: {
  x: number
  y: number
  w: number
  h: number
  code: string
  name: readonly string[]
  you?: boolean
  ext?: boolean
  pins?: boolean
  tint?: Tint
}) {
  const { X } = useCanvas()
  const x = X(gx)
  const w = X(gw)
  const stubs: ReactNode[] = []
  if (pins)
    for (let py = y + 18; py < y + h - 8; py += 16) {
      stubs.push(
        <line
          key={`l${py}`}
          x1={x - 5}
          y1={py}
          x2={x}
          y2={py}
          className="pin"
        />,
        <line
          key={`r${py}`}
          x1={x + w}
          y1={py}
          x2={x + w + 5}
          y2={py}
          className="pin"
        />,
      )
    }
  return (
    <g>
      {stubs}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className={you ? 'p-h' : ext ? 'p-ext' : `p${tint ? ` t-${tint}` : ''}`}
      />
      <text x={x + 12} y={y + 20} className={you ? 'lbl-h' : 'lbl'}>
        {designator}
      </text>
      <text x={x + 12} y={y + 44} className="s-name" data-fit={w - 20}>
        {name[0]}
      </text>
      {name[1] ? (
        <text x={x + 12} y={y + 62} className="s-sub" data-fit={w - 20}>
          {name[1]}
        </text>
      ) : null}
    </g>
  )
}

function Sub({
  x: gx,
  y,
  w: gw,
  h,
  label,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
}) {
  const { X } = useCanvas()
  const x = X(gx)
  const w = X(gw)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="s-block" />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        className="s-blbl"
        data-fit={w - 10}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  )
}

/** A database / bucket drawn as a cylinder, with what it holds as rows. */
function Store({
  x: gx,
  y,
  w: gw,
  h,
  code: designator,
  name,
  rows,
}: {
  x: number
  y: number
  w: number
  h: number
  code: string
  name: readonly string[]
  rows: readonly string[]
}) {
  const { X, k } = useCanvas()
  const x = X(gx)
  const w = X(gw)
  const ry = 14
  return (
    <g>
      <path
        d={`M${x} ${y + ry} V${y + h - ry} A${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} V${y + ry}`}
        className="p-cyl t-yellow"
      />
      <ellipse
        cx={x + w / 2}
        cy={y + ry}
        rx={w / 2}
        ry={ry}
        className="p-cyl t-yellow"
      />
      <text x={x + 14} y={y + ry * 2 + 20} className="lbl">
        {designator}
      </text>
      <text x={x + 14} y={y + ry * 2 + 44} className="s-name" data-fit={w - 24}>
        {name[0]}
      </text>
      <text x={x + 14} y={y + ry * 2 + 62} className="s-sub" data-fit={w - 24}>
        {name[1]}
      </text>
      {rows.map((row, i) => (
        <Sub
          key={row}
          // Sub stretches what it is given, so it gets grid units.
          x={gx + 14 / k}
          y={y + ry * 2 + 78 + i * 40}
          w={gw - 28 / k}
          h={30}
          label={row}
        />
      ))}
    </g>
  )
}

function Zone({
  x: gx,
  y,
  w: gw,
  h,
  label,
  lx: glx,
  ly,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  lx: number
  ly: number
}) {
  const { X } = useCanvas()
  const x = X(gx)
  const w = X(gw)
  const lx = X(glx)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="zone" />
      {/* A notch in the border for the label, like a fieldset's legend. */}
      <rect
        x={lx - 6}
        y={ly - 12}
        width={label.length * 7.6 + 12}
        height={16}
        className="zone-bg"
      />
      <text x={lx} y={ly} className="zone-lbl" textAnchor="start">
        {label}
      </text>
    </g>
  )
}

export function Schematic() {
  const copy = useCopy()
  const s = copy.howItWorks.schematic
  const p = s.parts
  const { W, X } = useCanvas()
  const svgRef = useRef<SVGSVGElement>(null)

  // Squeeze any label wider than its box. Runs again when the copy or the
  // canvas changes, and once the web fonts have loaded.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const fit = () =>
      svg.querySelectorAll<SVGTextElement>('[data-fit]').forEach((t) => {
        t.removeAttribute('textLength')
        t.removeAttribute('lengthAdjust')
        const room = Number(t.dataset.fit)
        // No text layout to measure (jsdom): leave the label as it is.
        if (typeof t.getComputedTextLength !== 'function') return
        if (t.getComputedTextLength() > room) {
          t.setAttribute('textLength', String(room))
          t.setAttribute('lengthAdjust', 'spacingAndGlyphs')
        }
      })
    fit()
    let live = true
    document.fonts?.ready.then(() => live && fit())
    return () => {
      live = false
    }
  }, [s, W])
  const L = s.legend

  const legendRows: Array<[Kind, string, boolean, boolean]> = [
    ['mcp', L.mcp, false, false],
    ['http', L.http, false, false],
    ['stream', L.stream, true, false],
    ['data', L.data, true, false],
    ['build', L.build, false, false],
  ]

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} 900`}
      role="img"
      aria-labelledby="hiw-schem-title hiw-schem-desc"
      className="hiw-rack hiw-schem block h-auto w-full"
    >
      <title id="hiw-schem-title">{copy.howItWorks.schematicTitle}</title>
      <desc id="hiw-schem-desc">{copy.howItWorks.schematicDesc}</desc>
      <defs>
        <pattern
          id="hiw-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path d="M20 0H0V20" className="grid" />
        </pattern>
        {(
          [
            ['hiw-arr-c', 'arr-c'],
            ['hiw-arr-w', 'arr-w'],
            ['hiw-arr-s', 'arr-s'],
          ] as const
        ).map(([id, cls]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className={cls} />
          </marker>
        ))}
      </defs>

      {/* Wider than the drawing: a wide frame widens the viewBox (RackStage). */}
      <rect x={0} y={0} width={W} height={900} className="face" />
      <rect
        x={0}
        y={0}
        width={W}
        height={900}
        className="face-grid"
        fill="url(#hiw-grid)"
      />

      {/* Title block and legend. */}
      <text x={X(40)} y={62} className="lbl">
        {s.sub}
      </text>
      <text x={X(40)} y={98} className="ttl">
        {s.title}
      </text>
      <text x={X(40)} y={170} className="lbl">
        {L.title}
      </text>
      {legendRows.map(([kind, label, both], i) => {
        const y = 200 + i * 30
        return (
          <g key={kind}>
            <Wire
              pts={[
                [44, y],
                [96, y],
              ]}
              kind={kind}
              both={both}
            />
            <text
              x={X(110)}
              y={y + 4}
              className="s-sub"
              data-fit={X(262) - X(110)}
            >
              {label}
            </text>
          </g>
        )
      })}
      <Wire
        pts={[
          [44, 360],
          [96, 360],
        ]}
        kind="http"
        end={false}
      />
      <text x={X(110)} y={364} className="s-sub" data-fit={X(262) - X(110)}>
        {L.public}
      </text>
      <Wire
        pts={[
          [44, 390],
          [96, 390],
        ]}
        kind="http"
        end={false}
        priv
      />
      <text x={X(110)} y={394} className="s-sub" data-fit={X(262) - X(110)}>
        {L.private}
      </text>
      <Wire
        pts={[
          [44, 420],
          [96, 420],
        ]}
        kind="http"
      />
      <text x={X(110)} y={424} className="s-sub" data-fit={X(262) - X(110)}>
        {L.oneWay}
      </text>
      <Wire
        pts={[
          [44, 450],
          [96, 450],
        ]}
        kind="http"
        both
      />
      <text x={X(110)} y={454} className="s-sub" data-fit={X(262) - X(110)}>
        {L.both}
      </text>

      {/* Zones. */}
      <text x={X(1556)} y={70} className="zone-lbl" textAnchor="end">
        {s.zones.outside}
      </text>
      <Zone
        x={270}
        y={128}
        w={800}
        h={334}
        label={s.zones.public}
        lx={792}
        ly={132}
      />
      <Zone
        x={1100}
        y={128}
        w={470}
        h={334}
        label={s.zones.private}
        lx={1290}
        ly={132}
      />
      <Zone
        x={270}
        y={488}
        w={800}
        h={372}
        label={s.zones.fleet}
        lx={790}
        ly={864}
      />
      <Zone
        x={1100}
        y={488}
        w={470}
        h={372}
        label={s.zones.data}
        lx={1120}
        ly={864}
      />

      {/* Outside. */}
      <Part
        x={290}
        y={28}
        w={180}
        h={72}
        code="J1"
        name={p.browser}
        you
        pins={false}
      />
      <Part
        x={650}
        y={28}
        w={180}
        h={72}
        code="J2"
        name={p.agent}
        you
        pins={false}
      />
      <Part
        x={890}
        y={28}
        w={160}
        h={72}
        code="J3"
        name={p.payments}
        ext
        pins={false}
      />
      <Part
        x={1140}
        y={28}
        w={200}
        h={72}
        code="J4"
        name={p.llm}
        ext
        pins={false}
      />
      <Part
        x={40}
        y={560}
        w={200}
        h={90}
        code="J5"
        name={p.codeHost}
        ext
        pins={false}
      />

      {/* Public. */}
      <Part
        x={300}
        y={165}
        w={170}
        h={70}
        code="U1"
        tint="sky"
        name={p.marketing}
      />
      <Part
        x={300}
        y={262}
        w={170}
        h={60}
        code="U2"
        tint="sky"
        name={p.designSystem}
      />
      <Part
        x={300}
        y={372}
        w={170}
        h={70}
        code="U3"
        tint="sky"
        name={p.relay}
      />
      <Part
        x={540}
        y={165}
        w={290}
        h={280}
        code="U4"
        tint="sky"
        name={p.core}
      />
      <Sub x={552} y={240} w={125} h={50} label={p.coreWeb} />
      <Sub x={693} y={240} w={125} h={50} label={p.coreMcp} />
      <Sub x={552} y={370} w={125} h={50} label={p.coreAuth} />
      <Sub x={693} y={370} w={125} h={50} label={p.coreWorker} />
      <Part x={880} y={165} w={170} h={280} code="U5" tint="sky" name={p.ai} />
      <Sub x={894} y={240} w={142} h={36} label={p.aiConversation} />
      <Sub x={894} y={284} w={142} h={36} label={p.aiPlanning} />
      <Sub x={894} y={328} w={142} h={36} label={p.aiLessons} />
      <Sub x={894} y={372} w={142} h={36} label={p.aiBilling} />

      {/* Private. */}
      <Part
        x={1140}
        y={165}
        w={200}
        h={135}
        code="U6"
        tint="lavender"
        name={p.gateway}
      />
      <Part
        x={1390}
        y={340}
        w={160}
        h={90}
        code="U7"
        tint="lavender"
        name={p.codegraph}
      />

      {/* Fleet. */}
      <Part
        x={300}
        y={560}
        w={160}
        h={90}
        code="U8"
        tint="mint"
        name={p.host}
      />
      <Part
        x={500}
        y={560}
        w={160}
        h={90}
        code="U9"
        tint="mint"
        name={p.runner}
      />
      <Part x={700} y={560} w={160} h={90} code="U10" tint="mint" name={p.ci} />
      <Part
        x={900}
        y={560}
        w={160}
        h={90}
        code="U11"
        tint="mint"
        name={p.indexer}
      />

      {/* Data. */}
      <Store
        x={1140}
        y={530}
        w={200}
        h={236}
        code="U12"
        name={p.postgres}
        rows={p.postgresRows}
      />
      <Store
        x={1380}
        y={530}
        w={170}
        h={270}
        code="U13"
        name={p.files}
        rows={[p.filesAttachments, p.filesDesigns, p.filesGraphs]}
      />

      {/* Wires. The database rail and the S3 line run together under the
          public zone; each service drops onto them. */}
      <Wire
        pts={[
          [330, 442],
          [330, 470],
          [1240, 470],
        ]}
        kind="data"
        end={false}
      />
      <Wire
        pts={[
          [800, 445],
          [800, 470],
        ]}
        kind="data"
        both
      />
      <Wire
        pts={[
          [1030, 445],
          [1030, 470],
        ]}
        kind="data"
        both
      />
      <Wire
        pts={[
          [1240, 300],
          [1240, 530],
        ]}
        kind="data"
        both
      />
      <Dot x={800} y={470} />
      <Dot x={1030} y={470} />
      <Dot x={1240} y={470} />
      <Wire
        pts={[
          [700, 445],
          [700, 480],
          [1365, 480],
          [1365, 610],
          [1380, 610],
        ]}
        kind="data"
        both
      />
      <Wire
        pts={[
          [1470, 430],
          [1470, 530],
        ]}
        kind="data"
      />
      <Wire
        pts={[
          [1000, 650],
          [1000, 822],
          [1465, 822],
          [1465, 800],
        ]}
        kind="data"
      />
      <Tag x={1230} y={816}>
        {s.wires.snapshot}
      </Tag>

      {/* You, your browser, your agent. */}
      <Wire
        pts={[
          [380, 100],
          [380, 165],
        ]}
        kind="http"
      />
      <Wire
        pts={[
          [290, 72],
          [282, 72],
          [282, 407],
          [300, 407],
        ]}
        kind="stream"
        both
      />
      <Tag x={282} y={250} anchor="middle">
        {s.wires.wss}
      </Tag>
      <Wire
        pts={[
          [470, 72],
          [520, 72],
          [520, 252],
          [552, 252],
        ]}
        kind="stream"
        both
      />
      <Tag x={520} y={124}>
        {s.wires.sse}
      </Tag>
      <Wire
        pts={[
          [755, 100],
          [755, 240],
        ]}
        kind="mcp"
      />
      <Tag x={748} y={150} anchor="end">
        {s.wires.mcp}
      </Tag>

      {/* Public services. */}
      <Wire
        pts={[
          [470, 278],
          [552, 278],
        ]}
        kind="http"
      />
      <Wire
        pts={[
          [385, 262],
          [385, 235],
        ]}
        kind="build"
      />
      <Wire
        pts={[
          [470, 300],
          [540, 300],
        ]}
        kind="build"
      />
      <Wire
        pts={[
          [240, 605],
          [256, 605],
          [256, 340],
          [540, 340],
        ]}
        kind="http"
        both
      />
      <Tag x={500} y={334}>
        {s.wires.webhooks}
      </Tag>
      <Wire
        pts={[
          [830, 205],
          [880, 205],
        ]}
        kind="http"
        both
      />
      <Wire
        pts={[
          [970, 100],
          [970, 165],
        ]}
        kind="http"
        both
      />
      <Wire
        pts={[
          [815, 165],
          [815, 140],
          [1170, 140],
          [1170, 165],
        ]}
        kind="http"
        priv
      />
      <Tag x={1085} y={134}>
        {s.wires.runKey}
      </Tag>
      <Wire
        pts={[
          [1050, 232],
          [1140, 232],
        ]}
        kind="http"
        priv
      />
      <Wire
        pts={[
          [1050, 395],
          [1390, 395],
        ]}
        kind="http"
        priv
      />
      <Wire
        pts={[
          [1240, 165],
          [1240, 100],
        ]}
        kind="http"
      />
      <Wire
        pts={[
          [420, 442],
          [420, 560],
        ]}
        kind="stream"
        both
      />

      {/* The worker boots the fleet through the AWS EC2 API. */}
      <Wire
        pts={[
          [755, 420],
          [755, 522],
        ]}
        kind="http"
        end={false}
      />
      <Wire
        pts={[
          [340, 522],
          [940, 522],
        ]}
        kind="http"
        end={false}
      />
      <Dot x={755} y={522} kind="http" />
      {[340, 540, 740, 940].map((x) => (
        <Wire
          key={x}
          pts={[
            [x, 522],
            [x, 560],
          ]}
          kind="http"
        />
      ))}
      <Tag x={692} y={540}>
        {s.wires.boot}
      </Tag>

      {/* What the fleet calls. */}
      <Wire
        pts={[
          [610, 560],
          [610, 445],
        ]}
        kind="http"
      />
      <Wire
        pts={[
          [460, 605],
          [480, 605],
          [480, 494],
          [862, 494],
          [862, 272],
          [818, 272],
        ]}
        kind="mcp"
      />
      <Wire
        pts={[
          [645, 560],
          [645, 508],
          [1085, 508],
          [1085, 270],
          [1140, 270],
        ]}
        kind="http"
      />
      <Tag x={1000} y={502}>
        {s.wires.runKey}
      </Tag>
      <Wire
        pts={[
          [1010, 560],
          [1010, 445],
        ]}
        kind="http"
      />
      <Wire
        pts={[
          [780, 650],
          [780, 812],
          [170, 812],
          [170, 650],
        ]}
        kind="http"
        both
      />
      <Tag x={480} y={806}>
        {s.wires.jit}
      </Tag>
      <Wire
        pts={[
          [940, 650],
          [940, 834],
          [130, 834],
          [130, 650],
        ]}
        kind="http"
      />
      <Tag x={480} y={828}>
        {s.wires.tarball}
      </Tag>
    </svg>
  )
}
