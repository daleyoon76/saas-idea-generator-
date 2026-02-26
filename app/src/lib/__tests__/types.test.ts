import { describe, it, expect } from 'vitest';
import { PROVIDER_CONFIGS, GUIDED_RESULT_KEY } from '../types';
import type { AIProvider } from '../types';

describe('PROVIDER_CONFIGS', () => {
  const providers: AIProvider[] = ['ollama', 'claude', 'gemini', 'openai'];

  it('has all 4 providers', () => {
    expect(Object.keys(PROVIDER_CONFIGS).sort()).toEqual(providers.sort());
  });

  for (const p of providers) {
    describe(`provider: ${p}`, () => {
      it('has label, description, defaultModel, models', () => {
        const cfg = PROVIDER_CONFIGS[p];
        expect(cfg.label).toBeTruthy();
        expect(cfg.description).toBeTruthy();
        expect(cfg.defaultModel).toBeTruthy();
        expect(cfg.models.length).toBeGreaterThanOrEqual(1);
      });

      it('defaultModel exists in models list', () => {
        const cfg = PROVIDER_CONFIGS[p];
        const ids = cfg.models.map(m => m.id);
        expect(ids).toContain(cfg.defaultModel);
      });

      it('all models have quality/speed/cost between 1 and 5', () => {
        for (const m of PROVIDER_CONFIGS[p].models) {
          expect(m.quality, `${m.id} quality`).toBeGreaterThanOrEqual(1);
          expect(m.quality, `${m.id} quality`).toBeLessThanOrEqual(5);
          expect(m.speed, `${m.id} speed`).toBeGreaterThanOrEqual(1);
          expect(m.speed, `${m.id} speed`).toBeLessThanOrEqual(5);
          expect(m.cost, `${m.id} cost`).toBeGreaterThanOrEqual(1);
          expect(m.cost, `${m.id} cost`).toBeLessThanOrEqual(5);
        }
      });
    });
  }
});

describe('GUIDED_RESULT_KEY', () => {
  it('is a non-empty string', () => {
    expect(GUIDED_RESULT_KEY).toBe('guided-result');
  });
});
