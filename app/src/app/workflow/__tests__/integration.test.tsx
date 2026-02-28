import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js modules
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: { toBlob: vi.fn(async () => new Blob(['fake'])) },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  Table: vi.fn(),
  TableRow: vi.fn(),
  TableCell: vi.fn(),
  WidthType: {},
  BorderStyle: {},
  ShadingType: { CLEAR: 'clear' },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockIdeas = {
  ideas: [
    { id: 1, name: 'TestSaaS', category: 'B2B', oneLiner: '테스트', target: '개발자', problem: '문제', features: ['F1', 'F2', 'F3'], differentiation: '차별화', revenueModel: '구독', mvpDifficulty: '중', rationale: '이유' },
    { id: 2, name: 'TestApp', category: 'B2C', oneLiner: '테스트2', target: '학생', problem: '문제2', features: ['F4', 'F5', 'F6'], differentiation: '차별화2', revenueModel: '광고', mvpDifficulty: '하', rationale: '이유2' },
    { id: 3, name: 'TestAgent', category: 'B2B', oneLiner: '테스트3', target: '기업', problem: '문제3', features: ['F7', 'F8', 'F9'], differentiation: '차별화3', revenueModel: '라이선스', mvpDifficulty: '상', rationale: '이유3' },
  ],
};

function setupMockFetch() {
  mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : '';

    if (urlStr.includes('/api/providers')) {
      return { ok: true, json: async () => ({ ollama: false, claude: true, gemini: true, openai: false }) };
    }
    if (urlStr.includes('/api/search')) {
      return { ok: true, json: async () => ({ results: [{ title: 'Result', url: 'https://example.com', snippet: 'test' }] }) };
    }
    if (urlStr.includes('/api/reddit')) {
      return { ok: true, json: async () => ({ results: [] }) };
    }
    if (urlStr.includes('/api/trends')) {
      return { ok: true, json: async () => ({ results: [] }) };
    }
    if (urlStr.includes('/api/producthunt')) {
      return { ok: true, json: async () => ({ results: [] }) };
    }
    if (urlStr.includes('/api/generate')) {
      const body = opts?.body ? JSON.parse(opts.body as string) : {};
      if (body.type === 'generate-ideas') {
        return { ok: true, json: async () => ({ response: JSON.stringify(mockIdeas) }) };
      }
      if (body.type === 'business-plan') {
        return { ok: true, json: async () => ({ response: '# 사업기획서\n\n## 1. 핵심요약\n테스트 기획서 내용' }) };
      }
      if (body.type === 'generate-prd') {
        return { ok: true, json: async () => ({ response: '# TestSaaS PRD\n\nPRD 내용' }) };
      }
      if (body.type === 'extract-idea') {
        return { ok: true, json: async () => ({ response: JSON.stringify({ name: 'Imported', category: 'B2B', oneLiner: 'test', target: 'dev', problem: 'prob', features: ['f1'], differentiation: 'd', revenueModel: 'sub', mvpDifficulty: '중', rationale: 'r' }) }) };
      }
      return { ok: true, json: async () => ({ response: 'mock response' }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

import WorkflowPage from '../page';

beforeEach(() => {
  mockFetch.mockReset();
  setupMockFetch();
});

describe('Workflow Integration', () => {
  it('renders keyword input step initially', () => {
    render(<WorkflowPage />);

    const input = screen.getByPlaceholderText(/AI, 헬스케어/i);
    expect(input).toBeInTheDocument();
  });

  it('shows preset cards after providers load', async () => {
    render(<WorkflowPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/providers'));
    });

    expect(screen.getByText('AI 품질 모드 선택')).toBeInTheDocument();
  });

  it('renders navigation bar with My CSO title', () => {
    render(<WorkflowPage />);

    expect(screen.getByText('My CSO')).toBeInTheDocument();
    expect(screen.getByText('홈으로')).toBeInTheDocument();
  });

  it('renders phase indicator with step labels', () => {
    render(<WorkflowPage />);

    expect(screen.getByText('키워드 입력')).toBeInTheDocument();
    expect(screen.getByText('아이디어 선택')).toBeInTheDocument();
    expect(screen.getByText('기획서 초안 작성')).toBeInTheDocument();
    expect(screen.getByText('기획서 상세 작성')).toBeInTheDocument();
    expect(screen.getByText('개발문서 생성')).toBeInTheDocument();
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('shows AI quality preset selector section', () => {
    render(<WorkflowPage />);

    expect(screen.getByText('AI 품질 모드 선택')).toBeInTheDocument();
  });

  it('shows keyword input heading and optional note', () => {
    render(<WorkflowPage />);

    expect(screen.getByText(/서비스 아이템을 브레인스토밍/i)).toBeInTheDocument();
    expect(screen.getByText(/특별히 원하는 키워드가 있으면/i)).toBeInTheDocument();
  });

  it('renders 2 preset cards (기본/고품질)', () => {
    render(<WorkflowPage />);

    expect(screen.getByText(/기본/)).toBeInTheDocument();
    expect(screen.getByText(/고품질/)).toBeInTheDocument();
    expect(screen.getByText('비용 효율 최적화')).toBeInTheDocument();
    expect(screen.getByText('최고 품질 한국어')).toBeInTheDocument();
  });

  it('can select a different preset', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);

    // Click 고품질 preset card
    const premiumCard = screen.getByText('최고 품질 한국어').closest('div[class]')!;
    await user.click(premiumCard);

    // The generate button should still be present
    expect(screen.getByText(/아이디어 발굴 시작/i)).toBeInTheDocument();
  });

  it('generates ideas on form submit', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);

    // Wait for providers to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/providers'),
      );
    });

    // Preset is already selected by default (no provider selection needed)

    // Type keyword and submit
    const input = screen.getByPlaceholderText(/AI, 헬스케어/i);
    await user.type(input, 'AI 에이전트');

    // Click generate button
    const generateButton = screen.getByRole('button', { name: /아이디어 발굴 시작/i });
    await user.click(generateButton);

    // Wait for ideas to appear
    await waitFor(() => {
      expect(screen.getByText('TestSaaS')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('TestApp')).toBeInTheDocument();
    expect(screen.getByText('TestAgent')).toBeInTheDocument();
  }, 15000);

  it('selects idea and generates business plan', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Preset is already selected by default (no provider selection needed)

    // Type keyword and generate ideas
    const input = screen.getByPlaceholderText(/AI, 헬스케어/i);
    await user.type(input, 'AI');
    const genBtn = screen.getByRole('button', { name: /아이디어 발굴 시작/i });
    await user.click(genBtn);

    // Wait for ideas
    await waitFor(() => {
      expect(screen.getByText('TestSaaS')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on idea card to select
    const ideaCard = screen.getByText('TestSaaS').closest('div[style]');
    if (ideaCard) await user.click(ideaCard);

    // Click generate plan button
    const planBtn = screen.getByRole('button', { name: /기획서|사업|생성/i });
    await user.click(planBtn);

    // Wait for plan to render
    await waitFor(() => {
      const markdowns = screen.getAllByTestId('markdown');
      expect(markdowns.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  }, 20000);

  it('shows select-ideas step with selection UI', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);

    await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

    const claudeButtons = screen.getAllByText(/Claude/i);
    if (claudeButtons.length > 0) await user.click(claudeButtons[0]);

    const input = screen.getByPlaceholderText(/AI, 헬스케어/i);
    await user.type(input, 'AI');
    await user.click(screen.getByRole('button', { name: /아이디어 발굴 시작/i }));

    await waitFor(() => {
      expect(screen.getByText('TestSaaS')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check selection UI elements
    expect(screen.getByText(/진행할 아이디어를 선택해주세요/i)).toBeInTheDocument();
    expect(screen.getByText(/상세 사업기획서를 작성할 아이디어를 선택하세요/i)).toBeInTheDocument();
  }, 15000);

});
