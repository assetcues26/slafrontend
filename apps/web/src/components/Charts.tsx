'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export const CHART_COLORS = [
  '#6366f1',
  '#06b6d4',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#3b82f6',
];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e6e8ee',
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
  fontSize: 13,
  padding: '8px 12px',
};

type Datum = { name: string; value: number };

const toData = (record: Record<string, number>): Datum[] =>
  Object.entries(record || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

type CardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  span?: boolean;
};

export function ChartCard({ title, subtitle, children, span }: CardProps) {
  return (
    <div className={span ? 'chart-card chart-card-span' : 'chart-card'}>
      <div className="chart-card-head">
        <h3>{title}</h3>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

function EmptyState() {
  return <div className="chart-empty">No data available yet.</div>;
}

export function BarCard({
  title,
  subtitle,
  record,
  color = '#6366f1',
  span,
}: {
  title: string;
  subtitle?: string;
  record: Record<string, number>;
  color?: string;
  span?: boolean;
}) {
  const data = toData(record);
  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`bar-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e6e8ee' }}
              interval={0}
              angle={data.length > 5 ? -20 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
              height={data.length > 5 ? 60 : 30}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={`url(#bar-${title})`} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function DonutCard({
  title,
  subtitle,
  record,
  span,
}: {
  title: string;
  subtitle?: string;
  record: Record<string, number>;
  span?: boolean;
}) {
  const data = toData(record);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [
                `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
                'Tickets',
              ]}
            />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: '#334155' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function TrendCard({
  title,
  subtitle,
  data,
  span,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ day: string; count: number }>;
  span?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    day: d.day?.slice(5) ?? d.day,
    count: d.count,
  }));
  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {formatted.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f6" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e6e8ee' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#trend-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function PhaseSlaCard({
  title,
  subtitle,
  phases,
  span,
}: {
  title: string;
  subtitle?: string;
  phases: { todo: { breached: number; total: number }; inprogress: { breached: number; total: number }; current: { breached: number; total: number } };
  span?: boolean;
}) {
  const data = [
    { name: 'To Do', breached: phases.todo.breached, onTrack: Math.max(phases.todo.total - phases.todo.breached, 0) },
    {
      name: 'In Progress',
      breached: phases.inprogress.breached,
      onTrack: Math.max(phases.inprogress.total - phases.inprogress.breached, 0),
    },
    {
      name: 'Current',
      breached: phases.current.breached,
      onTrack: Math.max(phases.current.total - phases.current.breached, 0),
    },
  ];
  const hasData = data.some((d) => d.breached + d.onTrack > 0);
  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {!hasData ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e6e8ee' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#334155' }} />
            <Bar dataKey="onTrack" name="On track" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={64} />
            <Bar dataKey="breached" name="Breached" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
