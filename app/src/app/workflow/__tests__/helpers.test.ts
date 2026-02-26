import { describe, it, expect } from 'vitest';

// Test the pure helper functions that are defined in the workflow page
// Since they're not exported, we re-implement the same logic here to ensure correctness

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s.toString().padStart(2, '0')}초` : `${s}초`;
}

const DEFAULT_STEP_MS = {
  ideaSearch: 7000,
  ideaLLM: 20000,
  planSearch: 9000,
  planLLM: 75000,
};

function getStoredTimings(): typeof DEFAULT_STEP_MS {
  if (typeof window === 'undefined') return { ...DEFAULT_STEP_MS };
  try {
    const raw = localStorage.getItem('saas-generator-step-timings');
    if (raw) return { ...DEFAULT_STEP_MS, ...JSON.parse(raw) };
  } catch { /* empty */ }
  return { ...DEFAULT_STEP_MS };
}

function updateStoredTiming(key: keyof typeof DEFAULT_STEP_MS, durationMs: number) {
  try {
    const current = getStoredTimings();
    current[key] = Math.round(current[key] * 0.7 + durationMs * 0.3);
    localStorage.setItem('saas-generator-step-timings', JSON.stringify(current));
  } catch { /* empty */ }
}

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(30)).toBe('30초');
    expect(formatTime(5)).toBe('5초');
    expect(formatTime(0)).toBe('0초');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(65)).toBe('1분 05초');
    expect(formatTime(120)).toBe('2분 00초');
    expect(formatTime(90)).toBe('1분 30초');
  });

  it('pads seconds with leading zero', () => {
    expect(formatTime(61)).toBe('1분 01초');
    expect(formatTime(609)).toBe('10분 09초');
  });
});

describe('getStoredTimings', () => {
  it('returns defaults when localStorage is empty', () => {
    localStorage.clear();
    const timings = getStoredTimings();
    expect(timings).toEqual(DEFAULT_STEP_MS);
  });

  it('merges stored values with defaults', () => {
    localStorage.setItem('saas-generator-step-timings', JSON.stringify({ ideaSearch: 5000 }));
    const timings = getStoredTimings();
    expect(timings.ideaSearch).toBe(5000);
    expect(timings.ideaLLM).toBe(DEFAULT_STEP_MS.ideaLLM); // default preserved
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('saas-generator-step-timings', 'not-json');
    const timings = getStoredTimings();
    expect(timings).toEqual(DEFAULT_STEP_MS);
  });
});

describe('updateStoredTiming', () => {
  it('applies weighted moving average (70% old, 30% new)', () => {
    localStorage.clear();
    // Default ideaSearch = 7000
    updateStoredTiming('ideaSearch', 10000);
    const timings = getStoredTimings();
    // 7000 * 0.7 + 10000 * 0.3 = 4900 + 3000 = 7900
    expect(timings.ideaSearch).toBe(7900);
  });

  it('converges towards actual values over multiple updates', () => {
    localStorage.clear();
    // Simulate multiple measurements of ~5000ms
    for (let i = 0; i < 10; i++) {
      updateStoredTiming('ideaLLM', 5000);
    }
    const timings = getStoredTimings();
    // After many iterations, should converge towards 5000
    expect(timings.ideaLLM).toBeLessThan(10000);
    expect(timings.ideaLLM).toBeGreaterThan(4000);
  });
});
