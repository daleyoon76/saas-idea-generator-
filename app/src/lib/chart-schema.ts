// ── 차트 JSON 스키마 + 파서 ──────────────────────────────

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<{ name: string; value?: number; x?: number; y?: number; [series: string]: string | number | undefined }>;
}

const VALID_TYPES = new Set(['bar', 'line', 'pie', 'scatter', 'radar']);

/**
 * LLM이 생성한 ```chart 코드 블록의 raw 문자열을 파싱하여 ChartData를 반환.
 * 파싱 실패 시 null.
 */
export function parseChartJson(raw: string): ChartData | null {
  try {
    // ```json 또는 ```chart 래퍼 제거
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json|chart)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // 타입 검증
    if (!parsed || typeof parsed !== 'object') return null;
    if (!VALID_TYPES.has(parsed.type)) return null;
    if (!Array.isArray(parsed.data) || parsed.data.length === 0) return null;

    // data 배열 항목 검증 + 정규화
    for (const item of parsed.data) {
      if (typeof item !== 'object' || item === null) return null;
      // subject→name / label→name 매핑 (LLM이 다른 키를 사용하는 경우)
      if (typeof item.name !== 'string' && typeof item.subject === 'string') {
        item.name = item.subject;
        delete item.subject;
      }
      if (typeof item.name !== 'string' && typeof item.label === 'string') {
        item.name = item.label;
        delete item.label;
      }
      if (typeof item.name !== 'string') return null;
      // name 값의 줄바꿈 제거 (모든 차트 타입 공통)
      item.name = item.name.replace(/\n/g, ' ');

      // 숫자형 문자열 → number 자동 변환 (LLM이 "value": "35" 같이 출력하는 경우)
      for (const key of Object.keys(item)) {
        if (key === 'name') continue;
        if (typeof item[key] === 'string' && item[key].trim() !== '' && !isNaN(Number(item[key]))) {
          item[key] = Number(item[key]);
        }
      }
    }

    return parsed as ChartData;
  } catch {
    return null;
  }
}
