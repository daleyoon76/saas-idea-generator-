import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and path
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
}));
vi.mock('html-to-docx', () => ({
  default: vi.fn(async () => Buffer.from('fake-docx')),
}));

const { POST } = await import('../save-plan/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/save-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/save-plan', () => {
  it('returns 400 when content is missing', async () => {
    const res = await POST(makeRequest({ ideaName: 'Test' }) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('content and ideaName are required');
  });

  it('returns 400 when ideaName is missing', async () => {
    const res = await POST(makeRequest({ content: '# Plan' }) as never);
    expect(res.status).toBe(400);
  });

  it('saves plan successfully and returns filename', async () => {
    const res = await POST(makeRequest({
      content: '# Test Plan\n\nContent here',
      ideaName: 'TestSaaS',
      keyword: 'AI',
      version: 'full',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.fileName).toContain('사업기획서');
    expect(data.fileName).toContain('AI');
    expect(data.fileName).toContain('Full');
    expect(data.fileName).toContain('TestSaaS');
    expect(data.fileName).toMatch(/\.docx$/);
  });

  it('uses "없음" when keyword is not provided', async () => {
    const res = await POST(makeRequest({
      content: '# Plan',
      ideaName: 'Test',
    }) as never);

    const data = await res.json();
    expect(data.fileName).toContain('없음');
  });

  it('uses "Draft" label by default', async () => {
    const res = await POST(makeRequest({
      content: '# Plan',
      ideaName: 'Test',
    }) as never);

    const data = await res.json();
    expect(data.fileName).toContain('Draft');
  });

  it('sanitizes special characters in filename', async () => {
    const res = await POST(makeRequest({
      content: '# Plan',
      ideaName: 'Test/SaaS:App',
      keyword: 'AI?Query',
    }) as never);

    const data = await res.json();
    // Special chars should be replaced with underscore
    expect(data.fileName).not.toMatch(/[/\\?%*:|"<>]/);
  });
});
