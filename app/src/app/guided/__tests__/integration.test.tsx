import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

mockFetch.mockImplementation(async (url: string) => {
  if (typeof url === 'string' && url.includes('/api/providers')) {
    return { ok: true, json: async () => ({ ollama: false, claude: true, gemini: true, openai: false }) };
  }
  if (typeof url === 'string' && url.includes('/api/search')) {
    return { ok: true, json: async () => ({ results: [] }) };
  }
  if (typeof url === 'string' && url.includes('/api/generate')) {
    return { ok: true, json: async () => ({ response: '# 기획서\n## 1. 핵심요약\n테스트' }) };
  }
  return { ok: true, json: async () => ({}) };
});

import GuidedPage from '../page';

beforeEach(() => {
  mockFetch.mockClear();
});

// Helper to navigate to a specific step by filling required fields
async function navigateToStep(user: ReturnType<typeof userEvent.setup>, targetStep: number) {
  // Wait for providers to load so the "다음" button isn't disabled
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalled();
  });

  // Step 1: Service name + one-liner (one-liner required)
  if (targetStep >= 2) {
    const oneLinerInput = screen.getByPlaceholderText(/AI 에이전트 팀이/i);
    await user.type(oneLinerInput, '테스트 서비스 설명');
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/카테고리는 무엇인가요/i)).toBeInTheDocument();
    });
  }

  // Step 2: Category selection
  if (targetStep >= 3) {
    await user.click(screen.getByText('웹 SaaS'));
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/타겟 고객은 누구인가요/i)).toBeInTheDocument();
    });
  }

  // Step 3: Target customer
  if (targetStep >= 4) {
    const targetInput = screen.getByPlaceholderText(/아이디어는 있지만/i);
    await user.type(targetInput, '1인 창업자');
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/어떤 문제를 해결하나요/i)).toBeInTheDocument();
    });
  }

  // Step 4: Problem (must be >= 10 chars)
  if (targetStep >= 5) {
    const problemInput = screen.getByPlaceholderText(/사업기획서를 처음부터/i);
    await user.type(problemInput, '시장 조사와 경쟁 분석에 너무 많은 시간이 소요됩니다');
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/핵심 기능은 무엇인가요/i)).toBeInTheDocument();
    });
  }

  // Step 5: Features (2 required)
  if (targetStep >= 6) {
    const featureInputs = screen.getAllByPlaceholderText(/예:/i);
    await user.type(featureInputs[0], '자동 시장 분석');
    await user.type(featureInputs[1], '경쟁 서비스 비교');
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/차별점은/i)).toBeInTheDocument();
    });
  }

  // Step 6: Differentiation
  if (targetStep >= 7) {
    const diffInput = screen.getByPlaceholderText(/기존 ChatGPT/i);
    await user.type(diffInput, '에이전트 팀 구조');
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/수익 모델은 무엇인가요/i)).toBeInTheDocument();
    });
  }

  // Step 7: Revenue model
  if (targetStep >= 8) {
    await user.click(screen.getByText('월 구독 (SaaS)'));
    await user.click(screen.getByRole('button', { name: /다음/i }));
    await waitFor(() => {
      expect(screen.getByText(/MVP 개발 난이도/i)).toBeInTheDocument();
    });
  }
}

describe('Guided Page Integration', () => {
  it('renders step 1 with service name and one-liner inputs', () => {
    render(<GuidedPage />);

    expect(screen.getByText(/어떤 서비스를 만들고 싶으신가요/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/예: My CSO/i)).toBeInTheDocument();
  });

  it('shows progress indicator on step 1', () => {
    render(<GuidedPage />);

    expect(screen.getByText(/질문 1 \/ 8/i)).toBeInTheDocument();
  });

  it('shows provider selection', async () => {
    render(<GuidedPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Claude/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows back link to /start on step 1', () => {
    render(<GuidedPage />);

    const links = screen.getAllByRole('link');
    const backLink = links.find(l => l.getAttribute('href') === '/start');
    expect(backLink).toBeTruthy();
  });

  it('can fill step 1 and advance to step 2 (category)', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    const oneLinerInput = screen.getByPlaceholderText(/AI 에이전트 팀이/i);
    await user.type(oneLinerInput, '테스트 서비스 설명');

    const nextBtn = screen.getByRole('button', { name: /다음/i });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/카테고리는 무엇인가요/i)).toBeInTheDocument();
    });

    expect(screen.getByText('웹 SaaS')).toBeInTheDocument();
    expect(screen.getByText('모바일 앱')).toBeInTheDocument();
    expect(screen.getByText('AI 에이전트')).toBeInTheDocument();
    expect(screen.getByText('플랫폼·마켓플레이스')).toBeInTheDocument();
    expect(screen.getByText('API·개발자 도구')).toBeInTheDocument();
  });

  it('shows "이전" button from step 2 for back navigation', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 2);

    const backButtons = screen.getAllByRole('button', { name: /이전/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('can navigate to step 3 (target customer)', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 3);

    expect(screen.getByText(/타겟 고객은 누구인가요/i)).toBeInTheDocument();
    expect(screen.getByText(/질문 3 \/ 8/i)).toBeInTheDocument();
  });

  it('can navigate to step 4 (problem)', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 4);

    expect(screen.getByText(/어떤 문제를 해결하나요/i)).toBeInTheDocument();
    expect(screen.getByText(/질문 4 \/ 8/i)).toBeInTheDocument();
  });

  it('can navigate to step 5 (features)', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 5);

    expect(screen.getByText(/핵심 기능은 무엇인가요/i)).toBeInTheDocument();
    expect(screen.getByText('기능 1 (필수)')).toBeInTheDocument();
    expect(screen.getByText('기능 2 (필수)')).toBeInTheDocument();
    expect(screen.getByText('기능 3 (선택)')).toBeInTheDocument();
  });

  it('can navigate to step 6 (differentiation)', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 6);

    expect(screen.getByText(/차별점은/i)).toBeInTheDocument();
    expect(screen.getByText(/질문 6 \/ 8/i)).toBeInTheDocument();
  });

  it('can navigate to step 7 (revenue model) with options', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 7);

    expect(screen.getByText(/수익 모델은 무엇인가요/i)).toBeInTheDocument();
    expect(screen.getByText('월 구독 (SaaS)')).toBeInTheDocument();
    expect(screen.getByText('거래 수수료')).toBeInTheDocument();
    expect(screen.getByText('프리미엄')).toBeInTheDocument();
    expect(screen.getByText('광고')).toBeInTheDocument();
    expect(screen.getByText('API 과금')).toBeInTheDocument();
  });

  it('can navigate to step 8 (MVP difficulty) with options', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 8);

    expect(screen.getByText(/MVP 개발 난이도/i)).toBeInTheDocument();
    expect(screen.getByText(/쉬움 \(하\)/i)).toBeInTheDocument();
    expect(screen.getByText(/보통 \(중\)/i)).toBeInTheDocument();
    expect(screen.getByText(/어려움 \(상\)/i)).toBeInTheDocument();

    // Step 8 should show "사업기획서 생성" button instead of "다음"
    expect(screen.getByRole('button', { name: /사업기획서 생성/i })).toBeInTheDocument();
  });

  it('can navigate back from step 3 to step 2', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);
    await navigateToStep(user, 3);

    // Click back button (get first match)
    const backButtons = screen.getAllByRole('button', { name: /이전/i });
    await user.click(backButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/카테고리는 무엇인가요/i)).toBeInTheDocument();
    });
  });

  it('renders without errors on main element', () => {
    render(<GuidedPage />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('can fill all 8 steps and trigger plan generation', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    // Navigate to step 8
    await navigateToStep(user, 8);

    // Select MVP difficulty
    await user.click(screen.getByText(/보통 \(중\)/i));

    // Click "사업기획서 생성" button
    const generateBtn = screen.getByRole('button', { name: /사업기획서 생성/i });
    await user.click(generateBtn);

    // Should transition to generating state
    await waitFor(() => {
      expect(screen.getByText(/사업기획서를 작성하고 있습니다/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 30000);

  it('shows generating progress with timer', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    await navigateToStep(user, 8);
    await user.click(screen.getByText(/보통 \(중\)/i));
    await user.click(screen.getByRole('button', { name: /사업기획서 생성/i }));

    await waitFor(() => {
      expect(screen.getByText(/사업기획서를 작성하고 있습니다/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Progress bar and timer should be visible
    expect(screen.getByText(/경과 시간/i)).toBeInTheDocument();
  }, 30000);

  it('shows provider panel toggle', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    // Click the compact provider button in nav
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // The compact provider button contains the provider name
    const navButtons = screen.getAllByRole('button');
    const providerBtn = navButtons.find(btn => btn.textContent?.includes('Claude'))!;
    await user.click(providerBtn);

    // Should show provider panel with all providers
    await waitFor(() => {
      expect(screen.getByText('Ollama')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });
  });

  it('shows spec badges in provider panel', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

    // The compact provider button contains the provider name
    const navButtons = screen.getAllByRole('button');
    const providerBtn = navButtons.find(btn => btn.textContent?.includes('Claude'))!;
    await user.click(providerBtn);

    await waitFor(() => {
      const qualityLabels = screen.getAllByText('품질');
      expect(qualityLabels.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('optional service name input works', async () => {
    const user = userEvent.setup();
    render(<GuidedPage />);

    // Fill service name (optional)
    const nameInput = screen.getByPlaceholderText(/예: My CSO/i);
    await user.type(nameInput, 'TestService');

    // Fill one-liner (required)
    const oneLinerInput = screen.getByPlaceholderText(/AI 에이전트 팀이/i);
    await user.type(oneLinerInput, '테스트 서비스');

    // Should be able to advance
    await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });
    const nextBtn = screen.getByRole('button', { name: /다음/i });
    expect(nextBtn).not.toBeDisabled();
  });
});
