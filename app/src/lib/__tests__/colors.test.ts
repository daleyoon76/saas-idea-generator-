import { describe, it, expect } from 'vitest';
import { CANYON, CANYON_DOCX } from '../colors';

describe('CANYON palette', () => {
  it('has all required color keys', () => {
    const required = ['bg', 'cardBg', 'border', 'textDark', 'textMid', 'textLight', 'accent', 'amber', 'amberLight', 'cream', 'selectedBg', 'error', 'errorBorder', 'errorText', 'success', 'docxSave'];
    for (const key of required) {
      expect(CANYON).toHaveProperty(key);
    }
  });

  it('all values are valid hex colors', () => {
    for (const [key, val] of Object.entries(CANYON)) {
      expect(val, `CANYON.${key}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('CANYON_DOCX', () => {
  it('strips # from all color values', () => {
    for (const [key, val] of Object.entries(CANYON_DOCX)) {
      expect(val, `CANYON_DOCX.${key}`).not.toContain('#');
      expect(val).toMatch(/^[0-9A-Fa-f]{6}$/);
    }
  });

  it('has the same keys as CANYON', () => {
    expect(Object.keys(CANYON_DOCX).sort()).toEqual(Object.keys(CANYON).sort());
  });

  it('values match CANYON with # removed', () => {
    for (const key of Object.keys(CANYON) as (keyof typeof CANYON)[]) {
      expect(CANYON_DOCX[key]).toBe(CANYON[key].replace('#', ''));
    }
  });
});
