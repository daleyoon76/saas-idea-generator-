'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { parseChartJson, ChartData } from '@/lib/chart-schema';
import { CANYON } from '@/lib/colors';

// CANYON 팔레트 6색 시리즈
const SERIES_COLORS = [
  CANYON.accent,     // #C24B25 테라코타
  CANYON.amber,      // #F5901E 앰버
  CANYON.textMid,    // #8B5A40 미드 브라운
  CANYON.amberLight, // #FFB347 앰버 라이트
  CANYON.deepRed,    // #6B2015 딥 레드
  CANYON.success,    // #6B7B3A 성공 그린
];

function getSeriesKeys(chart: ChartData): string[] {
  if (chart.type === 'pie') return [];
  if (chart.type === 'scatter') return [];
  const skip = new Set(['name', 'value', 'x', 'y']);
  const keys = new Set<string>();
  for (const d of chart.data) {
    for (const k of Object.keys(d)) {
      if (!skip.has(k) && typeof d[k] === 'number') keys.add(k);
    }
  }
  // value만 있는 경우 (bar/line 단일 시리즈)
  if (keys.size === 0 && chart.data.some(d => d.value !== undefined)) {
    keys.add('value');
  }
  return [...keys];
}

function ChartBar({ chart }: { chart: ChartData }) {
  const series = getSeriesKeys(chart);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CANYON.border} />
        <XAxis dataKey="name" tick={{ fill: CANYON.textMid, fontSize: 12 }} />
        <YAxis tick={{ fill: CANYON.textMid, fontSize: 12 }} label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: 'insideLeft', fill: CANYON.textMid, fontSize: 12 } : undefined} />
        <Tooltip contentStyle={{ backgroundColor: CANYON.cardBg, border: `1px solid ${CANYON.border}`, borderRadius: 8, color: CANYON.textDark, fontSize: 13 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: CANYON.textMid }} />}
        {series.map((key, i) => (
          <Bar key={key} dataKey={key} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartLine({ chart }: { chart: ChartData }) {
  const series = getSeriesKeys(chart);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CANYON.border} />
        <XAxis dataKey="name" tick={{ fill: CANYON.textMid, fontSize: 12 }} />
        <YAxis tick={{ fill: CANYON.textMid, fontSize: 12 }} label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: 'insideLeft', fill: CANYON.textMid, fontSize: 12 } : undefined} />
        <Tooltip contentStyle={{ backgroundColor: CANYON.cardBg, border: `1px solid ${CANYON.border}`, borderRadius: 8, color: CANYON.textDark, fontSize: 13 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: CANYON.textMid }} />}
        {series.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartPie({ chart }: { chart: ChartData }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: CANYON.textLight }}>
          {chart.data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: CANYON.cardBg, border: `1px solid ${CANYON.border}`, borderRadius: 8, color: CANYON.textDark, fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartScatter({ chart }: { chart: ChartData }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CANYON.border} />
        <XAxis type="number" dataKey="x" name={chart.xLabel || 'X'} tick={{ fill: CANYON.textMid, fontSize: 12 }} label={chart.xLabel ? { value: chart.xLabel, position: 'insideBottom', offset: -10, fill: CANYON.textMid, fontSize: 12 } : undefined} />
        <YAxis type="number" dataKey="y" name={chart.yLabel || 'Y'} tick={{ fill: CANYON.textMid, fontSize: 12 }} label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: 'insideLeft', fill: CANYON.textMid, fontSize: 12 } : undefined} />
        <Tooltip contentStyle={{ backgroundColor: CANYON.cardBg, border: `1px solid ${CANYON.border}`, borderRadius: 8, color: CANYON.textDark, fontSize: 13 }} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={chart.data} fill={CANYON.accent}>
          <LabelList dataKey="name" position="top" style={{ fill: CANYON.textDark, fontSize: 11 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default function ChartRenderer({ json }: { json: string }) {
  const chart = useMemo(() => parseChartJson(json), [json]);

  if (!chart) {
    return (
      <div className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm"
        style={{ backgroundColor: CANYON.cream, borderColor: CANYON.amber, color: CANYON.textMid }}>
        <p className="mb-0">차트를 표시할 수 없습니다.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs" style={{ color: CANYON.textLight }}>
            원본 데이터 보기
          </summary>
          <pre className="mt-2 p-3 rounded-xl text-xs overflow-auto max-h-48 whitespace-pre-wrap"
            style={{ backgroundColor: CANYON.bg, color: CANYON.textDark, fontFamily: 'var(--font-mono), monospace' }}>
            {json}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 rounded-xl" style={{ backgroundColor: CANYON.cardBg, border: `1px solid ${CANYON.border}` }}>
      {chart.title && (
        <h4 className="text-center text-sm font-semibold mb-2" style={{ color: CANYON.textDark }}>
          {chart.title}
        </h4>
      )}
      {chart.type === 'bar' && <ChartBar chart={chart} />}
      {chart.type === 'line' && <ChartLine chart={chart} />}
      {chart.type === 'pie' && <ChartPie chart={chart} />}
      {chart.type === 'scatter' && <ChartScatter chart={chart} />}
    </div>
  );
}
