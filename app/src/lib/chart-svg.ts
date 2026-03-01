// ── 차트 SVG 렌더러 (docx 임베딩용 정적 SVG 문자열 조립) ──────────────
import { CANYON } from './colors';
import type { ChartData } from './chart-schema';

/** docx 전용 정적 SVG 생성 (Recharts 없이 순수 문자열 조립) */
export function renderChartSvg(chart: ChartData): string {
  const W = 600, H = 400;
  const PAD = { top: 50, right: 30, bottom: 60, left: 70 };
  const colors = [CANYON.accent, CANYON.amber, CANYON.textMid, CANYON.amberLight, CANYON.deepRed, CANYON.success];
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  let body = '';
  const title = chart.title ? `<text x="${W / 2}" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="${CANYON.textDark}">${esc(chart.title)}</text>` : '';

  if (chart.type === 'bar' || chart.type === 'line') {
    const skip = new Set(['name', 'value', 'x', 'y']);
    const seriesKeys: string[] = [];
    for (const d of chart.data) {
      for (const k of Object.keys(d)) {
        if (!skip.has(k) && typeof d[k] === 'number' && !seriesKeys.includes(k)) seriesKeys.push(k);
      }
    }
    if (seriesKeys.length === 0 && chart.data.some(d => d.value !== undefined)) seriesKeys.push('value');

    let maxVal = 0;
    let minVal = 0;
    for (const d of chart.data) for (const k of seriesKeys) { const v = Number(d[k] ?? 0); if (v > maxVal) maxVal = v; if (v < minVal) minVal = v; }
    if (maxVal === 0 && minVal === 0) maxVal = 1;

    const niceRound = (v: number) => {
      if (v === 0) return 0;
      const abs = Math.abs(v);
      const mag = Math.pow(10, Math.floor(Math.log10(abs)));
      return Math.sign(v) * Math.ceil(abs / mag) * mag;
    };
    const niceMax = niceRound(maxVal) || 1;
    const niceMin = niceRound(minVal);
    const range = niceMax - niceMin;

    // y-axis grid + labels
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const y = PAD.top + plotH - (i / ticks) * plotH;
      const val = Math.round(niceMin + (i / ticks) * range);
      body += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}" stroke="${CANYON.border}" stroke-dasharray="3 3"/>`;
      body += `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${CANYON.textMid}">${val}</text>`;
    }

    // 음수 데이터 존재 시 0 기준선 표시
    if (niceMin < 0) {
      const zeroY = PAD.top + plotH - ((0 - niceMin) / range) * plotH;
      body += `<line x1="${PAD.left}" y1="${zeroY}" x2="${PAD.left + plotW}" y2="${zeroY}" stroke="${CANYON.textDark}" stroke-width="1.5"/>`;
    }

    const n = chart.data.length;
    const groupW = plotW / n;

    if (chart.type === 'bar') {
      const barW = Math.max(8, (groupW * 0.7) / seriesKeys.length);
      chart.data.forEach((d, i) => {
        const cx = PAD.left + i * groupW + groupW / 2;
        seriesKeys.forEach((k, si) => {
          const v = Number(d[k] ?? 0);
          const yPos = PAD.top + plotH - ((v - niceMin) / range) * plotH;
          const zeroPos = PAD.top + plotH - ((0 - niceMin) / range) * plotH;
          const barTop = Math.min(yPos, zeroPos);
          const barH = Math.abs(yPos - zeroPos);
          const bx = cx - (seriesKeys.length * barW) / 2 + si * barW;
          body += `<rect x="${bx}" y="${barTop}" width="${barW}" height="${Math.max(barH, 1)}" fill="${colors[si % colors.length]}" rx="2"/>`;
        });
        body += `<text x="${cx}" y="${PAD.top + plotH + 16}" text-anchor="middle" font-size="10" fill="${CANYON.textMid}">${esc(d.name)}</text>`;
      });
    } else {
      // line
      seriesKeys.forEach((k, si) => {
        const pts = chart.data.map((d, i) => {
          const x = PAD.left + i * groupW + groupW / 2;
          const y = PAD.top + plotH - ((Number(d[k] ?? 0) - niceMin) / range) * plotH;
          return `${x},${y}`;
        });
        body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${colors[si % colors.length]}" stroke-width="2"/>`;
        chart.data.forEach((d, i) => {
          const x = PAD.left + i * groupW + groupW / 2;
          const y = PAD.top + plotH - ((Number(d[k] ?? 0) - niceMin) / range) * plotH;
          body += `<circle cx="${x}" cy="${y}" r="3" fill="${colors[si % colors.length]}"/>`;
        });
      });
      chart.data.forEach((d, i) => {
        const cx = PAD.left + i * groupW + groupW / 2;
        body += `<text x="${cx}" y="${PAD.top + plotH + 16}" text-anchor="middle" font-size="10" fill="${CANYON.textMid}">${esc(d.name)}</text>`;
      });
    }

    if (chart.yLabel) body += `<text x="15" y="${PAD.top + plotH / 2}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}" transform="rotate(-90 15 ${PAD.top + plotH / 2})">${esc(chart.yLabel)}</text>`;

  } else if (chart.type === 'pie') {
    const total = chart.data.reduce((s, d) => s + (d.value ?? 0), 0) || 1;
    const cx = W / 2, cy = H / 2 + 10, r = 120;
    let startAngle = -Math.PI / 2;
    chart.data.forEach((d, i) => {
      const slice = ((d.value ?? 0) / total) * 2 * Math.PI;
      const endAngle = startAngle + slice;
      const large = slice > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      body += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}"/>`;
      const mid = startAngle + slice / 2;
      const lx = cx + (r + 20) * Math.cos(mid), ly = cy + (r + 20) * Math.sin(mid);
      const pct = Math.round(((d.value ?? 0) / total) * 100);
      body += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="${CANYON.textDark}">${esc(d.name)} ${pct}%</text>`;
      startAngle = endAngle;
    });

  } else if (chart.type === 'scatter') {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of chart.data) {
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); }
      if (d.y !== undefined) { minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
    }
    if (!isFinite(minX)) { minX = 0; maxX = 1; }
    if (!isFinite(minY)) { minY = 0; maxY = 1; }
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

    chart.data.forEach((d, i) => {
      const px = PAD.left + ((d.x ?? 0) - minX) / rangeX * plotW;
      const py = PAD.top + plotH - ((d.y ?? 0) - minY) / rangeY * plotH;
      body += `<circle cx="${px}" cy="${py}" r="6" fill="${colors[i % colors.length]}" opacity="0.8"/>`;
      body += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="10" fill="${CANYON.textDark}">${esc(d.name)}</text>`;
    });

    if (chart.xLabel) body += `<text x="${PAD.left + plotW / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}">${esc(chart.xLabel)}</text>`;
    if (chart.yLabel) body += `<text x="15" y="${PAD.top + plotH / 2}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}" transform="rotate(-90 15 ${PAD.top + plotH / 2})">${esc(chart.yLabel)}</text>`;

  } else if (chart.type === 'radar') {
    const cx = W / 2, cy = H / 2 + 10;
    const maxR = Math.min(plotW, plotH) / 2 - 20;
    const n = chart.data.length;
    if (n < 3) {
      body += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="${CANYON.textMid}">데이터 부족 (최소 3축 필요)</text>`;
    } else {
      const skip = new Set(['name', 'value', 'x', 'y']);
      const seriesKeys: string[] = [];
      for (const d of chart.data) {
        for (const k of Object.keys(d)) {
          if (!skip.has(k) && typeof d[k] === 'number' && !seriesKeys.includes(k)) seriesKeys.push(k);
        }
      }
      if (seriesKeys.length === 0 && chart.data.some(d => d.value !== undefined)) seriesKeys.push('value');

      let maxVal = 0;
      for (const d of chart.data) for (const k of seriesKeys) { const v = Number(d[k] ?? 0); if (v > maxVal) maxVal = v; }
      if (maxVal === 0) maxVal = 1;

      const angleStep = (2 * Math.PI) / n;

      const levels = 5;
      for (let lv = 1; lv <= levels; lv++) {
        const r = (lv / levels) * maxR;
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        body += `<polygon points="${pts}" fill="none" stroke="${CANYON.border}" stroke-dasharray="2 2"/>`;
      }

      for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const ex = cx + maxR * Math.cos(angle);
        const ey = cy + maxR * Math.sin(angle);
        body += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${CANYON.border}" stroke-width="0.5"/>`;
      }

      for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const lx = cx + (maxR + 18) * Math.cos(angle);
        const ly = cy + (maxR + 18) * Math.sin(angle);
        body += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${CANYON.textMid}">${esc(chart.data[i].name)}</text>`;
      }

      seriesKeys.forEach((k, si) => {
        const color = colors[si % colors.length];
        const pts = chart.data.map((d, i) => {
          const v = Number(d[k] ?? 0);
          const r = (v / maxVal) * maxR;
          const angle = -Math.PI / 2 + i * angleStep;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        body += `<polygon points="${pts}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>`;
        chart.data.forEach((d, i) => {
          const v = Number(d[k] ?? 0);
          const r = (v / maxVal) * maxR;
          const angle = -Math.PI / 2 + i * angleStep;
          body += `<circle cx="${cx + r * Math.cos(angle)}" cy="${cy + r * Math.sin(angle)}" r="3" fill="${color}"/>`;
        });
      });
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="white"/>${title}${body}</svg>`;
}
