export interface ChartPoint {
  label: string
  value: number
  formattedValue?: string
}

function ChartEmptyState() {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[#DCEAF3] bg-[#F8FBFD] px-4 py-8 text-center text-xs font-medium text-[#64748B]">
      Chưa có dữ liệu thống kê.
    </div>
  )
}

export interface AreaLineChartProps {
  title: string
  points: readonly ChartPoint[]
  strokeColor?: string
  fillId: string
  unitSuffix?: string
}

export function AreaLineChart({
  title,
  points,
  strokeColor = '#2878B8',
  fillId,
  unitSuffix = '',
}: AreaLineChartProps) {
  if (points.length === 0 || points.every((p) => p.value <= 0)) {
    return <ChartEmptyState />
  }

  const width = 520
  const height = 190
  const padLeft = 40
  const padRight = 20
  const padTop = 20
  const padBottom = 34
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxVal = Math.max(...points.map((p) => p.value), 1)
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0

  const coords = points.map((p, idx) => {
    const x = padLeft + idx * stepX
    const y = padTop + plotH - (p.value / maxVal) * plotH
    return { ...p, x, y }
  })

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')

  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]
  const areaPath =
    firstCoord && lastCoord
      ? `${linePath} L ${lastCoord.x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${firstCoord.x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : linePath

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title}
      className="h-auto w-full overflow-visible"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((ratio) => {
        const y = padTop + plotH - ratio * plotH
        const val = Math.round(maxVal * ratio)
        return (
          <g key={ratio}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray="3 3"
            />
            <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#64748B">
              {val}
            </text>
          </g>
        )
      })}

      <path d={areaPath} fill={`url(#${fillId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="4.5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="2.5">
            <title>
              {c.label}: {c.formattedValue ?? `${c.value}${unitSuffix}`}
            </title>
          </circle>
          <text
            x={c.x}
            y={c.y - 9}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#243B53"
          >
            {c.formattedValue ?? `${c.value}${unitSuffix}`}
          </text>
          <text
            x={c.x}
            y={height - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#64748B"
          >
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export interface VerticalBarChartProps {
  title: string
  points: readonly ChartPoint[]
  barColor?: string
}

export function VerticalBarChart({
  title,
  points,
  barColor = '#2878B8',
}: VerticalBarChartProps) {
  if (points.length === 0 || points.every((p) => p.value <= 0)) {
    return <ChartEmptyState />
  }

  const width = 520
  const height = 190
  const padLeft = 36
  const padRight = 16
  const padTop = 22
  const padBottom = 34
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom
  const maxVal = Math.max(...points.map((p) => p.value), 1)
  const slotW = plotW / points.length
  const barW = Math.min(42, slotW * 0.56)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title}
      className="h-auto w-full"
    >
      <title>{title}</title>
      {[0, 0.5, 1].map((ratio) => {
        const y = padTop + plotH - ratio * plotH
        return (
          <line
            key={ratio}
            x1={padLeft}
            y1={y}
            x2={width - padRight}
            y2={y}
            stroke="#E2E8F0"
            strokeDasharray="3 3"
          />
        )
      })}

      {points.map((p, idx) => {
        const barH = Math.max(4, (p.value / maxVal) * plotH)
        const x = padLeft + idx * slotW + (slotW - barW) / 2
        const y = padTop + plotH - barH
        return (
          <g key={p.label}>
            <rect x={x} y={y} width={barW} height={barH} rx="6" fill={barColor} opacity="0.9">
              <title>
                {p.label}: {p.formattedValue ?? p.value}
              </title>
            </rect>
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#243B53"
            >
              {p.formattedValue ?? p.value}
            </text>
            <text
              x={x + barW / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#64748B"
            >
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function DonutBreakdownChart({
  title,
  centerLabel,
  slices,
}: {
  title: string
  centerLabel: string
  slices: readonly DonutSlice[]
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (slices.length === 0 || total <= 0) {
    return <ChartEmptyState />
  }

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const arcs = slices.reduce<
    { label: string; value: number; color: string; dash: number; offset: number }[]
  >((acc, s) => {
    const prevSum = acc.reduce((sum, item) => sum + item.dash, 0)
    const dash = total > 0 ? (s.value / total) * circumference : 0
    acc.push({
      label: s.label,
      value: s.value,
      color: s.color,
      dash,
      offset: -prevSum,
    })
    return acc
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 150 150" role="img" aria-label={title} className="h-36 w-36 shrink-0">
        <title>{title}</title>
        <circle cx="75" cy="75" r={radius} fill="none" stroke="#EAF6FD" strokeWidth="18" />
        {arcs.map((s) => (
          <circle
            key={s.label}
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={s.offset}
            transform="rotate(-90 75 75)"
          >
            <title>
              {s.label}: {s.value} ({Math.round((s.value / total) * 100)}%)
            </title>
          </circle>
        ))}
        <text x="75" y="72" textAnchor="middle" fontSize="18" fontWeight="800" fill="#243B53">
          {total}
        </text>
        <text x="75" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">
          {centerLabel}
        </text>
      </svg>

      <div className="w-full flex-1 space-y-2">
        {slices.map((s) => {
          const pct = Math.round((s.value / total) * 100)
          return (
            <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 font-medium text-[#243B53]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
              </span>
              <span className="font-bold text-[#243B53]">
                {s.value} <span className="text-[#64748B]">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
