import { describe, it, expect } from 'vitest';
import { parseChartJson } from '../chart-schema';

describe('parseChartJson', () => {
  // ── 정상 5타입 파싱 ──────────────────────────
  const TYPES = ['bar', 'line', 'pie', 'scatter', 'radar'] as const;

  for (const type of TYPES) {
    it(`parses valid ${type} chart`, () => {
      const raw = JSON.stringify({
        type,
        title: `${type} chart`,
        data: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }],
      });
      const result = parseChartJson(raw);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(type);
      expect(result!.data).toHaveLength(2);
    });
  }

  // ── subject→name 매핑 ──────────────────────────
  it('maps subject→name for radar charts', () => {
    const raw = JSON.stringify({
      type: 'radar',
      data: [{ subject: '기술력', value: 80 }, { subject: '시장성', value: 70 }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].name).toBe('기술력');
    expect(result!.data[0]).not.toHaveProperty('subject');
  });

  // ── label→name 매핑 ──────────────────────────
  it('maps label→name when name is missing', () => {
    const raw = JSON.stringify({
      type: 'bar',
      data: [{ label: '항목1', value: 30 }, { label: '항목2', value: 50 }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].name).toBe('항목1');
    expect(result!.data[0]).not.toHaveProperty('label');
  });

  // ── 숫자형 문자열 → number 자동 변환 ──────────────────────────
  it('converts string numeric values to numbers', () => {
    const raw = JSON.stringify({
      type: 'bar',
      data: [{ name: 'A', value: '35' }, { name: 'B', value: '70.5' }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].value).toBe(35);
    expect(typeof result!.data[0].value).toBe('number');
    expect(result!.data[1].value).toBe(70.5);
  });

  it('does not convert non-numeric strings', () => {
    const raw = JSON.stringify({
      type: 'bar',
      data: [{ name: 'A', value: 10, category: 'tech' }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].category).toBe('tech');
  });

  it('preserves name as string (not converted to number)', () => {
    const raw = JSON.stringify({
      type: 'pie',
      data: [{ name: '100', value: 50 }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].name).toBe('100');
    expect(typeof result!.data[0].name).toBe('string');
  });

  // ── 코드 펜스 래퍼 제거 ──────────────────────────
  it('strips ```chart wrapper', () => {
    const raw = '```chart\n' + JSON.stringify({ type: 'pie', data: [{ name: 'X', value: 1 }] }) + '\n```';
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pie');
  });

  it('strips ```json wrapper', () => {
    const raw = '```json\n' + JSON.stringify({ type: 'line', data: [{ name: 'Q1', value: 100 }] }) + '\n```';
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('line');
  });

  it('strips bare ``` wrapper', () => {
    const raw = '```\n' + JSON.stringify({ type: 'scatter', data: [{ name: 'P', x: 1, y: 2 }] }) + '\n```';
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('scatter');
  });

  // ── 실패 케이스 ──────────────────────────
  it('returns null for invalid type', () => {
    const raw = JSON.stringify({ type: 'histogram', data: [{ name: 'A', value: 1 }] });
    expect(parseChartJson(raw)).toBeNull();
  });

  it('returns null for empty data array', () => {
    const raw = JSON.stringify({ type: 'bar', data: [] });
    expect(parseChartJson(raw)).toBeNull();
  });

  it('returns null for missing data', () => {
    const raw = JSON.stringify({ type: 'bar' });
    expect(parseChartJson(raw)).toBeNull();
  });

  it('returns null when item has no name/subject/label', () => {
    const raw = JSON.stringify({ type: 'pie', data: [{ value: 10 }] });
    expect(parseChartJson(raw)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseChartJson('not json at all')).toBeNull();
  });

  it('returns null for non-object parsed result', () => {
    expect(parseChartJson('"just a string"')).toBeNull();
  });

  // ── 줄바꿈 제거 ──────────────────────────
  it('removes newlines from name values', () => {
    const raw = JSON.stringify({
      type: 'bar',
      data: [{ name: 'Hello\nWorld', value: 10 }],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].name).toBe('Hello World');
  });

  // ── 멀티 시리즈 데이터 ──────────────────────────
  it('handles multi-series bar data with string numbers', () => {
    const raw = JSON.stringify({
      type: 'bar',
      title: '매출 비교',
      data: [
        { label: 'Q1', revenue: '100', cost: '60' },
        { label: 'Q2', revenue: '150', cost: '80' },
      ],
    });
    const result = parseChartJson(raw);
    expect(result).not.toBeNull();
    expect(result!.data[0].name).toBe('Q1');
    expect(result!.data[0].revenue).toBe(100);
    expect(result!.data[0].cost).toBe(60);
  });
});
