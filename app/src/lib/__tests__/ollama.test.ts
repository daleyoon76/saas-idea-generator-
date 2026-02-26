import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWithOllama, checkOllamaConnection, listModels } from '../ollama';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('generateWithOllama', () => {
  it('sends correct request to Ollama API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model: 'gemma2:9b', response: '응답 텍스트', done: true }),
    });

    const result = await generateWithOllama({ prompt: '테스트', model: 'gemma2:9b' });

    expect(result).toBe('응답 텍스트');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"gemma2:9b"'),
      }),
    );
  });

  it('uses default model when none specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model: 'llama3.2', response: 'ok', done: true }),
    });

    await generateWithOllama({ prompt: 'test' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('llama3.2');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(generateWithOllama({ prompt: 'test' })).rejects.toThrow('Ollama API error');
  });
});

describe('checkOllamaConnection', () => {
  it('returns true when Ollama is reachable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    expect(await checkOllamaConnection()).toBe(true);
  });

  it('returns false when Ollama is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    expect(await checkOllamaConnection()).toBe(false);
  });

  it('returns false on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    expect(await checkOllamaConnection()).toBe(false);
  });
});

describe('listModels', () => {
  it('returns model names', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: 'gemma2:9b' }, { name: 'llama3.2' }] }),
    });

    const models = await listModels();
    expect(models).toEqual(['gemma2:9b', 'llama3.2']);
  });

  it('returns empty array on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    expect(await listModels()).toEqual([]);
  });

  it('returns empty array when no models field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    expect(await listModels()).toEqual([]);
  });
});
