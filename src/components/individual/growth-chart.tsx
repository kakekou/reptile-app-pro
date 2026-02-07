'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DataPoint {
  measured_on: string;
  weight_g: number | null;
  length_cm: number | null;
}

interface GrowthChartProps {
  data: DataPoint[];
  metric: 'weight' | 'length';
}

export function GrowthChart({ data, metric }: GrowthChartProps) {
  const key = metric === 'weight' ? 'weight_g' : 'length_cm';
  const unit = metric === 'weight' ? 'g' : 'cm';
  const color = metric === 'weight' ? '#2563eb' : '#059669';
  const gradientId = `gradient-${metric}`;

  const chartData = data
    .filter((d) => d[key] !== null)
    .map((d) => ({
      date: d.measured_on,
      value: d[key] as number,
      label: format(new Date(d.measured_on), 'M/d', { locale: ja }),
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-tertiary text-[14px]">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          domain={['dataMin - 2', 'dataMax + 2']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '13px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: '#6b7280' }}
          formatter={(value) => [`${value} ${unit}`, metric === 'weight' ? '体重' : '体長']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
