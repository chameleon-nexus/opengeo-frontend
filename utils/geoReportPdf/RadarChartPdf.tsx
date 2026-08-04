import React from 'react';
import { Polygon, Polyline, Svg, Text, View } from '@react-pdf/renderer';
import type { RadarRow } from '../miniReportEnrich';

const CX = 120;
const CY = 105;
const R = 72;

function pointAt(rows: RadarRow[], index: number, radiusScale: number, valueKey: 'brand' | 'industry'): { x: number; y: number } {
  const n = rows.length || 1;
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
  const value = Math.max(0, Math.min(100, rows[index]?.[valueKey] ?? 0)) / 100;
  const r = R * radiusScale * value;
  return {
    x: CX + Math.cos(angle) * r,
    y: CY + Math.sin(angle) * r,
  };
}

function polygonPoints(rows: RadarRow[], valueKey: 'brand' | 'industry', radiusScale: number): string {
  return rows
    .map((_, i) => {
      const p = pointAt(rows, i, radiusScale, valueKey);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

function axisPoint(index: number, rows: RadarRow[], radiusScale: number): { x: number; y: number } {
  const n = rows.length || 1;
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
  return {
    x: CX + Math.cos(angle) * R * radiusScale,
    y: CY + Math.sin(angle) * R * radiusScale,
  };
}

export const RadarChartPdf: React.FC<{ rows: RadarRow[]; showIndustry?: boolean }> = ({
  rows,
  showIndustry = false,
}) => {
  if (!rows.length) {
    return <View style={{ height: 80 }} />;
  }

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={240} height={210} viewBox="0 0 240 210">
        {rings.map((scale) => (
          <Polyline
            key={scale}
            points={rows
              .map((_, i) => {
                const p = axisPoint(i, rows, scale);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            stroke="#e2e8f0"
            strokeWidth={0.8}
            fill="none"
          />
        ))}
        {rows.map((_, i) => {
          const p = axisPoint(i, rows, 1);
          return <Polyline key={`axis-${i}`} points={`${CX},${CY} ${p.x},${p.y}`} stroke="#e2e8f0" strokeWidth={0.8} />;
        })}
        {showIndustry ? (
          <Polygon points={polygonPoints(rows, 'industry', 1)} fill="#94a3b8" fillOpacity={0.2} stroke="#94a3b8" strokeWidth={1} />
        ) : null}
        <Polygon points={polygonPoints(rows, 'brand', 1)} fill="#8b5cf6" fillOpacity={0.35} stroke="#8b5cf6" strokeWidth={1.5} />
        {rows.map((row, i) => {
          const p = axisPoint(i, rows, 1.18);
          return (
            <Text
              key={row.subject}
              x={p.x - 18}
              y={p.y - 3}
              style={{ fontSize: 7, fill: '#64748b', fontFamily: 'NotoSansSC' }}
            >
              {row.subject.length > 8 ? `${row.subject.slice(0, 7)}…` : row.subject}
            </Text>
          );
        })}
      </Svg>
      {showIndustry ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 8, color: '#94a3b8', fontFamily: 'NotoSansSC' }}>● 行业均值</Text>
        </View>
      ) : null}
    </View>
  );
};
