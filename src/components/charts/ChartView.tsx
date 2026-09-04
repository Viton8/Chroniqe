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

const COLORS = ['#6d28d9', '#0f766e', '#b45309', '#be123c', '#2563eb', '#7c3aed']

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

  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {data.map((d) => (
          <div key={d.label} className="rounded-2xl bg-paper p-4 text-center shadow-lift">
            <p className="text-xs text-muted">{d.label}</p>
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
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
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
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd4c4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#6d28d9" radius={[6, 6, 0, 0]} />
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
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd4c4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area dataKey="value" stroke="#6d28d9" fill="#efe7ff" />
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
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd4c4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis dataKey="value" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Scatter data={data} fill="#6d28d9" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd4c4" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#6d28d9" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
