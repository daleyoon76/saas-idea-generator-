import { describe, it, expect } from 'vitest';

const { POST } = await import('../parse-docx/route');

// Helper: construct a mock NextRequest with formData()
function mockRequest(fileOptions?: { size: number; name: string }) {
  const mockFile = fileOptions
    ? { size: fileOptions.size, name: fileOptions.name, arrayBuffer: async () => new ArrayBuffer(4) }
    : null;

  return {
    formData: async () => ({
      get: (key: string) => (key === 'file' ? mockFile : null),
    }),
  } as never;
}

describe('POST /api/parse-docx', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await POST(mockRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('파일이 없습니다');
  });

  it('returns 400 for oversized files', async () => {
    const res = await POST(mockRequest({ size: 10 * 1024 * 1024 + 1, name: 'big.docx' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('10MB');
  });

  it('returns 500 with error message on parse failure', async () => {
    const res = await POST(mockRequest({ size: 1024, name: 'corrupt.docx' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
