/**
 * Tests for workflow page step rendering and interactions.
 * These tests exercise the full idea generation → selection → plan view flow
 * to maximize coverage of the large workflow page component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    { id: 1, name: 'TestSaaS', category: 'B2B', oneLiner: '한 줄 설명', target: '개발자', problem: '기존 도구가 느림', features: ['자동화', '대시보드', '알림'], differentiation: 'AI 기반 자동화', revenueModel: '월 구독', mvpDifficulty: '중', rationale: '시장 성장세' },
    { id: 2, name: 'TestApp', category: 'B2C', oneLiner: '소비자 앱', target: '학생', problem: '비용이 비쌈', features: ['무료 플랜', '소셜 공유', '모바일'], differentiation: '무료 기본 제공', revenueModel: '광고', mvpDifficulty: '하', rationale: '큰 시장' },
    { id: 3, name: 'TestAgent', category: 'B2B', oneLiner: 'AI 에이전트', target: '기업', problem: '인력 부족', features: ['에이전트', '파이프라인', 'API'], differentiation: '멀티 에이전트', revenueModel: '라이선스', mvpDifficulty: '상', rationale: '트렌드' },
  ],
};

const mockPlanContent = `# TestSaaS 사업기획서

## 1. 핵심요약
TestSaaS는 개발자를 위한 B2B SaaS 서비스입니다.

## 2. 시장 분석
### 2.1 시장 규모
글로벌 시장 규모는 100억 달러입니다.

### 2.2 성장 트렌드
연 20% 성장 중입니다.

## 3. 경쟁 분석
| 경쟁사 | 강점 | 약점 |
|--------|------|------|
| CompA  | 속도 | 비용 |
| CompB  | 기능 | UX   |

## 4. 비즈니스 모델
월 구독 기반의 SaaS 모델입니다.

## 5. 기술 스택
- **프론트엔드**: Next.js
- **백엔드**: Node.js
- **데이터베이스**: PostgreSQL`;

function setupMockFetch() {
  mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : '';
    if (urlStr.includes('/api/providers')) {
      return { ok: true, json: async () => ({ ollama: false, claude: true, gemini: true, openai: false }) };
    }
    if (urlStr.includes('/api/search')) {
      return { ok: true, json: async () => ({ results: [{ title: 'Test', url: 'https://example.com', snippet: 'snippet' }] }) };
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
        return { ok: true, json: async () => ({ response: mockPlanContent }) };
      }
      if (body.type === 'generate-prd') {
        return { ok: true, json: async () => ({ response: '# PRD\n\n## Overview\nPRD content here' }) };
      }
      if (body.type === 'extract-idea') {
        return { ok: true, json: async () => ({ response: JSON.stringify({ name: 'Imported', category: 'B2B', oneLiner: 'imported', target: 'dev', problem: 'prob', features: ['f1'], differentiation: 'd', revenueModel: 'sub', mvpDifficulty: '중', rationale: 'r' }) }) };
      }
      return { ok: true, json: async () => ({ response: 'mock' }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

import WorkflowPage from '../page';

beforeEach(() => {
  mockFetch.mockReset();
  setupMockFetch();
});

// Helper: generates ideas and waits for selection step
async function navigateToSelectIdeas(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

  const claudeButtons = screen.getAllByText(/Claude/i);
  if (claudeButtons.length > 0) await user.click(claudeButtons[0]);

  const input = screen.getByPlaceholderText(/AI, 헬스케어/i);
  await user.type(input, 'AI');
  await user.click(screen.getByRole('button', { name: /아이디어 발굴 시작/i }));

  await waitFor(() => {
    expect(screen.getByText('TestSaaS')).toBeInTheDocument();
  }, { timeout: 5000 });
}

// Helper: generates ideas, selects first idea, generates plan, waits for view
async function navigateToViewPlan(user: ReturnType<typeof userEvent.setup>) {
  await navigateToSelectIdeas(user);

  // Click idea card
  const ideaCard = screen.getByText('TestSaaS').closest('div[style]');
  if (ideaCard) await user.click(ideaCard);

  // Click generate plan
  const planBtn = screen.getByRole('button', { name: /사업기획서 작성/i });
  await user.click(planBtn);

  // Wait for plan view
  await waitFor(() => {
    const markdowns = screen.getAllByTestId('markdown');
    expect(markdowns.length).toBeGreaterThanOrEqual(1);
  }, { timeout: 5000 });
}

describe('Workflow Step: Select Ideas', () => {
  it('shows idea cards with details', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    // Idea details
    expect(screen.getByText('한 줄 설명')).toBeInTheDocument();
    expect(screen.getByText('소비자 앱')).toBeInTheDocument();

    // Categories (B2B appears twice)
    expect(screen.getAllByText('B2B').length).toBe(2);
    expect(screen.getByText('B2C')).toBeInTheDocument();

    // MVP difficulty badges
    expect(screen.getByText('난이도 중')).toBeInTheDocument();
    expect(screen.getByText('난이도 하')).toBeInTheDocument();
    expect(screen.getByText('난이도 상')).toBeInTheDocument();
  }, 15000);

  it('shows target and revenue model in idea cards', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    expect(screen.getByText('타깃: 개발자')).toBeInTheDocument();
    expect(screen.getByText('수익모델: 월 구독')).toBeInTheDocument();
    expect(screen.getByText('타깃: 학생')).toBeInTheDocument();
  }, 15000);

  it('shows feature tags in idea cards', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    expect(screen.getByText('자동화')).toBeInTheDocument();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('무료 플랜')).toBeInTheDocument();
  }, 15000);

  it('shows problem description in idea cards', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    // Problem is shown with "해결 문제:" prefix
    const problemElements = screen.getAllByText(/해결 문제:/);
    expect(problemElements.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('shows raw response toggle', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    expect(screen.getByText('AI 원본 응답 보기')).toBeInTheDocument();
  }, 15000);

  it('can toggle multiple idea selections', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    // Select first idea
    const card1 = screen.getByText('TestSaaS').closest('div[style]');
    if (card1) await user.click(card1);

    // Select second idea
    const card2 = screen.getByText('TestApp').closest('div[style]');
    if (card2) await user.click(card2);

    // Should show count in button
    const planBtn = screen.getByRole('button', { name: /사업기획서 작성 \(2개 선택\)/i });
    expect(planBtn).toBeInTheDocument();
  }, 15000);

  it('shows reset and abort buttons', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    expect(screen.getByText('처음으로')).toBeInTheDocument();
    expect(screen.getByText('진행 중단')).toBeInTheDocument();
  }, 15000);

  it('disables plan button when no idea selected', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToSelectIdeas(user);

    const planBtn = screen.getByRole('button', { name: /사업기획서 작성 \(0개 선택\)/i });
    expect(planBtn).toBeDisabled();
  }, 15000);
});

describe('Workflow Step: View Plan', () => {
  it('shows plan content in markdown', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    const markdowns = screen.getAllByTestId('markdown');
    expect(markdowns.length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it('shows plan title (idea name)', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Title should be the idea name
    const titles = screen.getAllByText('TestSaaS');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it('shows save buttons (.md and .docx)', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    expect(screen.getByText('.md 저장')).toBeInTheDocument();
    expect(screen.getByText('.docx 저장')).toBeInTheDocument();
  }, 20000);

  it('shows action buttons (새로 시작, PRD, 풀버전)', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    expect(screen.getByText('새로 시작')).toBeInTheDocument();
    expect(screen.getByText(/개발문서\(PRD\) 생성하기/)).toBeInTheDocument();
    expect(screen.getByText(/풀버전 사업기획서 생성/)).toBeInTheDocument();
  }, 20000);

  it('shows scroll buttons (아래로, 위로)', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    expect(screen.getByText(/아래로/)).toBeInTheDocument();
    expect(screen.getByText('위로')).toBeInTheDocument();
  }, 20000);
});

describe('Workflow Step: View Plan → PRD', () => {
  it('generates PRD from view-plan step', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Click "개발문서(PRD) 생성하기" button
    const prdBtn = screen.getByText(/개발문서\(PRD\) 생성하기/);
    await user.click(prdBtn);

    // Should show PRD view with content
    await waitFor(() => {
      expect(screen.getByText(/TestSaaS PRD/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // PRD view elements
    expect(screen.getByText(/마크다운 \(개발자용\)/)).toBeInTheDocument();
    expect(screen.getByText(/AI용 서식/)).toBeInTheDocument();
    expect(screen.getByText('사업기획서로 돌아가기')).toBeInTheDocument();
    expect(screen.getByText('새로 시작')).toBeInTheDocument();
    expect(screen.getByText('.md 저장')).toBeInTheDocument();
    expect(screen.getByText('.docx 저장')).toBeInTheDocument();
  }, 25000);

  it('shows .md save dialog from view-plan', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Click .md save
    await user.click(screen.getByText('.md 저장'));

    // Should show save dialog
    await waitFor(() => {
      expect(screen.getByText(/마크다운\(.md\)으로 저장/)).toBeInTheDocument();
    });

    expect(screen.getByText('취소')).toBeInTheDocument();
    expect(screen.getByText('저장')).toBeInTheDocument();
  }, 25000);

  it('shows .docx save dialog from view-plan', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Click .docx save
    await user.click(screen.getByText('.docx 저장'));

    // Should show save dialog
    await waitFor(() => {
      expect(screen.getByText(/워드\(.docx\) 파일로 저장/)).toBeInTheDocument();
    });

    // Should show filename
    expect(screen.getByText(/사업기획서.*TestSaaS.*\.docx/)).toBeInTheDocument();
  }, 25000);

  it('can cancel save dialog', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Open save dialog
    await user.click(screen.getByText('.md 저장'));
    await waitFor(() => {
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    // Cancel
    await user.click(screen.getByText('취소'));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/마크다운\(.md\)으로 저장/)).not.toBeInTheDocument();
    });
  }, 25000);
});

describe('Workflow: Save Execution', () => {
  it('can execute .md save from dialog', async () => {
    const user = userEvent.setup();

    // Mock URL.createObjectURL and revokeObjectURL for download
    const mockCreateObjectURL = vi.fn(() => 'blob:mock');
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });

    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Open .md save dialog
    await user.click(screen.getByText('.md 저장'));
    await waitFor(() => {
      expect(screen.getByText('저장')).toBeInTheDocument();
    });

    // Click save
    await user.click(screen.getByText('저장'));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/마크다운\(.md\)으로 저장/)).not.toBeInTheDocument();
    });
  }, 25000);

  it('can execute .docx save from dialog', async () => {
    const user = userEvent.setup();

    const mockCreateObjectURL = vi.fn(() => 'blob:mock');
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });

    render(<WorkflowPage />);
    await navigateToViewPlan(user);

    // Open .docx save dialog
    await user.click(screen.getByText('.docx 저장'));
    await waitFor(() => {
      expect(screen.getByText('저장')).toBeInTheDocument();
    });

    // Click save
    await user.click(screen.getByText('저장'));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/워드\(.docx\) 파일로 저장/)).not.toBeInTheDocument();
    });
  }, 25000);
});

describe('Workflow: Import Flow', () => {
  it('import paste: can type text and trigger analysis', async () => {
    const user = userEvent.setup();
    render(<WorkflowPage />);

    await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });
    const claudeButtons = screen.getAllByText(/Claude/i);
    if (claudeButtons.length > 0) await user.click(claudeButtons[0]);

    // Switch to import > paste
    await user.click(screen.getByText('기존 기획서 가져오기'));
    await user.click(screen.getByText('텍스트 붙여넣기'));

    // Type plan content
    const textarea = screen.getByPlaceholderText(/사업기획서 내용을 여기에 붙여넣으세요/i);
    await user.type(textarea, '# 기존 사업기획서\n\n## 핵심요약\n테스트 기획서입니다.');

    // Click analyze
    const analyzeBtn = screen.getByRole('button', { name: /기획서 분석 시작/i });
    await user.click(analyzeBtn);

    // It should call extract-idea API (may quickly transition to view-plan)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('extract-idea'),
        }),
      );
    }, { timeout: 5000 });
  }, 15000);
});
