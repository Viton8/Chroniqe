import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts'
import type { ChartConfig, ChartType, ItemRating, ItemRow, ListSchema } from '../../types/domain'
import { buildChartSeries } from '../../lib/charts'
import { usePrefs } from '../../context/PrefsContext'
import { readCssColor } from '../../lib/themes'

function useChartColors() {
  const { theme, palette } = usePrefs()
  return useMemo(() => {
    void theme
    void palette
    const accent = readCssColor('--c-accent', '#6d28d9')
    const good = readCssColor('--c-good', '#0f766e')
    return {
      accent,
      accentSoft: readCssColor('--c-accent-soft', '#efe7ff'),
      line: readCssColor('--c-line', '#ddd4c4'),
      muted: readCssColor('--c-muted', '#6e6578'),
      ink: readCssColor('--c-ink', '#1c1724'),
      paper: readCssColor('--c-paper', '#fffcf7'),
      slices: [accent, good, '#b45309', '#be123c', '#2563eb', '#7c3aed'],
    }
  }, [theme, palette])
}

export default function ChartView({
  type,
  config,
  schema,
  items,
  ratings,
}: {
  type: ChartType
  config: ChartConfig
  schema: ListSchema
  items: ItemRow[]
  ratings: ItemRating[]
}) {
  const data = buildChartSeries(type, config, schema, items, ratings)
  const { t } = usePrefs()
  const colors = useChartColors()
  const tick = { fontSize: 11, fill: colors.muted }

  const tooltipStyle = {
    background: colors.paper,
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    color: colors.ink,
  }

  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {data.map((d) => (
          <div key={d.label} className="rounded-2xl bg-paper p-4 text-center shadow-lift">
            <p className="break-words text-xs text-muted">{d.label}</p>
            <p className="mt-1 font-serif text-3xl">{d.value}</p>
          </div>
        ))}
      </div>
    )
  }

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">{t('charts.empty')}</p>
  }

  if (type === 'pie') {
    return (
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors.slices[i % colors.slices.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'bar') {
    return (
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={colors.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'area') {
    return (
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="value" stroke={colors.accent} fill={colors.accentSoft} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'stem' || type === 'scatter') {
    return (
      <div className="h-64">
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="label" tick={tick} />
            <YAxis dataKey="value" tick={tick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter data={data} fill={colors.accent} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
          <XAxis dataKey="label" tick={tick} />
          <YAxis tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
