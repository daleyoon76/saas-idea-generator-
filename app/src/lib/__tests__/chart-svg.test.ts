import { describe, it, expect } from 'vitest';
import { renderChartSvg } from '../chart-svg';
import { parseChartJson, type ChartData } from '../chart-schema';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(__dirname, '..', '..', '..', '__test-output__');

function saveSvg(name: string, svg: string) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${name}.svg`), svg, 'utf-8');
}

describe('renderChartSvg', () => {
  // ── 5가지 차트 타입 기본 렌더링 ──────────────────

  it('renders bar chart SVG', () => {
    const chart: ChartData = {
      type: 'bar',
      title: '분기별 매출',
      yLabel: '매출(억원)',
      data: [
        { name: 'Q1', value: 120 },
        { name: 'Q2', value: 180 },
        { name: 'Q3', value: 150 },
        { name: 'Q4', value: 220 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('01-bar', svg);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<rect');   // bars
    expect(svg).toContain('Q1');
    expect(svg).toContain('분기별 매출');
  });

  it('renders line chart SVG', () => {
    const chart: ChartData = {
      type: 'line',
      title: '월별 사용자 증가',
      data: [
        { name: '1월', value: 1000 },
        { name: '2월', value: 1500 },
        { name: '3월', value: 1200 },
        { name: '4월', value: 2000 },
        { name: '5월', value: 2500 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('02-line', svg);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('<circle');
  });

  it('renders pie chart SVG', () => {
    const chart: ChartData = {
      type: 'pie',
      title: '시장 점유율',
      data: [
        { name: '자사', value: 35 },
        { name: '경쟁A', value: 25 },
        { name: '경쟁B', value: 20 },
        { name: '기타', value: 20 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('03-pie', svg);
    expect(svg).toContain('<path');   // pie slices
    expect(svg).toContain('35%');
  });

  it('renders scatter chart SVG', () => {
    const chart: ChartData = {
      type: 'scatter',
      title: '가격 vs 만족도',
      xLabel: '가격(만원)',
      yLabel: '만족도',
      data: [
        { name: '제품A', x: 10, y: 80 },
        { name: '제품B', x: 30, y: 60 },
        { name: '제품C', x: 50, y: 90 },
        { name: '제품D', x: 20, y: 70 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('04-scatter', svg);
    expect(svg).toContain('<circle');
    expect(svg).toContain('제품A');
  });

  it('renders radar chart SVG', () => {
    const chart: ChartData = {
      type: 'radar',
      title: '경쟁력 분석',
      data: [
        { name: '기술력', value: 85 },
        { name: '시장성', value: 70 },
        { name: '팀역량', value: 90 },
        { name: '재무건전성', value: 60 },
        { name: '성장성', value: 80 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('05-radar', svg);
    expect(svg).toContain('<polygon');  // grid + data polygon
    expect(svg).toContain('기술력');
  });

  // ── 음수값 bar 차트 ──────────────────

  it('renders bar chart with negative values + zero baseline', () => {
    const chart: ChartData = {
      type: 'bar',
      title: '영업이익률 추이',
      yLabel: '%',
      data: [
        { name: '2023 Q1', value: -15 },
        { name: '2023 Q2', value: -5 },
        { name: '2023 Q3', value: 10 },
        { name: '2023 Q4', value: 25 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('06-bar-negative', svg);
    expect(svg).toContain('<svg');
    // 0 기준선 (stroke-width="1.5")
    expect(svg).toContain('stroke-width="1.5"');
    // y축 라벨에 음수값 포함
    expect(svg).toContain('-');
  });

  it('renders line chart with negative values', () => {
    const chart: ChartData = {
      type: 'line',
      title: '수익 추이 (음수 포함)',
      data: [
        { name: '1월', value: -30 },
        { name: '2월', value: -10 },
        { name: '3월', value: 20 },
        { name: '4월', value: 50 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('07-line-negative', svg);
    expect(svg).toContain('stroke-width="1.5"'); // zero baseline
    expect(svg).toContain('<polyline');
  });

  // ── 멀티 시리즈 bar 차트 ──────────────────

  it('renders multi-series bar chart', () => {
    const chart: ChartData = {
      type: 'bar',
      title: '매출 vs 비용',
      data: [
        { name: 'Q1', revenue: 100, cost: 60 },
        { name: 'Q2', revenue: 150, cost: 80 },
        { name: 'Q3', revenue: 120, cost: 70 },
      ],
    };
    const svg = renderChartSvg(chart);
    saveSvg('08-bar-multi', svg);
    // 2 시리즈 × 3 항목 = 6개 rect
    const rectCount = (svg.match(/<rect[^/]*rx="2"/g) || []).length;
    expect(rectCount).toBe(6);
  });

  // ── parseChartJson → renderChartSvg 파이프라인 (LLM 실제 출력 시뮬레이션) ──

  it('full pipeline: LLM output with label + string values → valid SVG', () => {
    const llmOutput = '```chart\n' + JSON.stringify({
      type: 'bar',
      title: 'TAM/SAM/SOM 분석',
      data: [
        { label: 'TAM', value: '5000' },
        { label: 'SAM', value: '1200' },
        { label: 'SOM', value: '300' },
      ],
    }) + '\n```';

    const parsed = parseChartJson(llmOutput);
    expect(parsed).not.toBeNull();
    expect(parsed!.data[0].name).toBe('TAM');
    expect(parsed!.data[0].value).toBe(5000);

    const svg = renderChartSvg(parsed!);
    saveSvg('09-pipeline-label-string', svg);
    expect(svg).toContain('TAM');
    expect(svg).toContain('<rect');
  });

  it('full pipeline: LLM radar with subject key', () => {
    const llmOutput = JSON.stringify({
      type: 'radar',
      title: '기술 경쟁력',
      data: [
        { subject: 'AI/ML', value: 90 },
        { subject: '클라우드', value: 75 },
        { subject: '보안', value: 80 },
        { subject: 'UX', value: 85 },
        { subject: '확장성', value: 70 },
      ],
    });

    const parsed = parseChartJson(llmOutput);
    expect(parsed).not.toBeNull();

    const svg = renderChartSvg(parsed!);
    saveSvg('10-pipeline-radar-subject', svg);
    expect(svg).toContain('AI/ML');
    expect(svg).toContain('<polygon');
  });

  // ── SVG 유효성 기본 검증 ──────────────────

  it('all generated SVGs have valid structure', () => {
    const charts: ChartData[] = [
      { type: 'bar', data: [{ name: 'A', value: 10 }] },
      { type: 'line', data: [{ name: 'A', value: 10 }] },
      { type: 'pie', data: [{ name: 'A', value: 10 }] },
      { type: 'scatter', data: [{ name: 'A', x: 1, y: 2 }] },
      { type: 'radar', data: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }, { name: 'C', value: 30 }] },
    ];
    for (const chart of charts) {
      const svg = renderChartSvg(chart);
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(svg).toMatch(/<\/svg>$/);
      expect(svg).toContain('width="600"');
      expect(svg).toContain('height="400"');
    }
  });
});
