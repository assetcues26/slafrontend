'use client';

import { useId } from 'react';
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
  Label,
} from 'recharts';

export const CHART_COLORS = [
  '#6366f1',
  '#06b6d4',
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
];

const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Unknown'];
const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#16a34a',
  Lowest: '#64748b',
  Unknown: '#94a3b8',
};

type Datum = { name: string; value: number; fill?: string };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const toData = (record: Record<string, number>): Datum[] =>
  Object.entries(record || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

const toPriorityData = (record: Record<string, number>): Datum[] =>
  Object.entries(record || {})
    .map(([name, value]) => ({
      name,
      value,
      fill: PRIORITY_COLORS[name] ?? PRIORITY_COLORS.Unknown,
    }))
    .sort(
      (a, b) =>
        (PRIORITY_ORDER.indexOf(a.name) === -1 ? 99 : PRIORITY_ORDER.indexOf(a.name)) -
        (PRIORITY_ORDER.indexOf(b.name) === -1 ? 99 : PRIORITY_ORDER.indexOf(b.name)),
    );

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: Datum; name?: string; color?: string }>;
  label?: string;
  suffix?: string;
};

function ChartTooltip({ active, payload, label, suffix = 'tickets' }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = label ?? row.payload?.name ?? row.name ?? '';
  const value = row.value ?? 0;
  const color = row.payload?.fill ?? row.color ?? CHART_COLORS[0];
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-dot" style={{ background: color }} />
      <div>
        <p className="chart-tooltip-label">{name}</p>
        <p className="chart-tooltip-value">
          {value} {suffix}
        </p>
      </div>
    </div>
  );
}

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
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="chart-card-sub">{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

function EmptyState() {
  return <div className="chart-empty">No data available yet.</div>;
}

/** Horizontal bar chart — best for long status names */
export function BarCard({
  title,
  subtitle,
  record,
  horizontal = false,
  span,
}: {
  title: string;
  subtitle?: string;
  record: Record<string, number>;
  color?: string;
  horizontal?: boolean;
  span?: boolean;
}) {
  const data = toData(record).map((d, i) => ({
    ...d,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const chartHeight = horizontal ? Math.max(280, data.length * 38 + 48) : 280;

  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {data.length === 0 ? (
        <EmptyState />
      ) : horizontal ? (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barCategoryGap="18%"
          >
            <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeWidth={1} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              content={<ChartTooltip />}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/** Priority bars with semantic severity colors + correct sort order */
export function PriorityBarCard({
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
  const data = toPriorityData(record);

  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
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
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox)) return null;
                  const { cx, cy } = viewBox as { cx: number; cy: number };
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} y={cy - 6} fill="#0f172a" fontSize={26} fontWeight={700}>
                        {total}
                      </tspan>
                      <tspan x={cx} y={cy + 16} fill="#64748b" fontSize={11} fontWeight={500}>
                        tickets
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0];
                const val = Number(row.value ?? 0);
                const pct = total ? Math.round((val / total) * 100) : 0;
                return (
                  <div className="chart-tooltip">
                    <span
                      className="chart-tooltip-dot"
                      style={{ background: row.payload?.fill ?? CHART_COLORS[0] }}
                    />
                    <div>
                      <p className="chart-tooltip-label">{row.name}</p>
                      <p className="chart-tooltip-value">
                        {val} tickets · {pct}%
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#475569', paddingTop: 12 }}
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
  const uid = useId();
  const fillId = `trend-${slug(uid)}`;
  const formatted = (data || []).map((d) => ({
    day: d.day?.slice(5) ?? d.day,
    count: d.count,
  }));

  return (
    <ChartCard title={title} subtitle={subtitle} span={span}>
      {formatted.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={formatted} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip suffix="created" />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
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
  phases: {
    todo: { breached: number; total: number };
    inprogress: { breached: number; total: number };
    current: { breached: number; total: number };
  };
  span?: boolean;
}) {
  const data = [
    {
      name: 'To Do',
      breached: phases.todo.breached,
      onTrack: Math.max(phases.todo.total - phases.todo.breached, 0),
    },
    {
      name: 'In Progress',
      breached: phases.inprogress.breached,
      onTrack: Math.max(phases.inprogress.total - phases.inprogress.breached, 0),
    },
    {
      name: 'Current status',
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
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const onTrack = payload.find((p) => p.dataKey === 'onTrack')?.value ?? 0;
                const breached = payload.find((p) => p.dataKey === 'breached')?.value ?? 0;
                return (
                  <div className="chart-tooltip">
                    <p className="chart-tooltip-label">{label}</p>
                    <p className="chart-tooltip-value" style={{ color: '#16a34a' }}>
                      {onTrack} on track
                    </p>
                    <p className="chart-tooltip-value" style={{ color: '#dc2626' }}>
                      {breached} breached
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#475569', paddingTop: 4 }}
            />
            <Bar dataKey="onTrack" name="On track" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={56} />
            <Bar dataKey="breached" name="Breached" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
