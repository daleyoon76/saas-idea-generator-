import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/link as a simple anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import Home from '../page';

describe('Landing Page', () => {
  it('renders hero section with title', () => {
    render(<Home />);
    expect(screen.getByText(/당신의 아이디어를/)).toBeInTheDocument();
    expect(screen.getByText(/사업기획서로 완성합니다/)).toBeInTheDocument();
  });

  it('renders all 6 feature cards', () => {
    render(<Home />);
    expect(screen.getByText('실시간 시장 조사')).toBeInTheDocument();
    expect(screen.getByText('AI 아이디어 발굴')).toBeInTheDocument();
    expect(screen.getByText('에이전트 팀 기획서')).toBeInTheDocument();
    expect(screen.getByText('PRD 자동 생성')).toBeInTheDocument();
    expect(screen.getByText('다중 AI 모델 지원')).toBeInTheDocument();
    expect(screen.getByText('.md / .docx 저장')).toBeInTheDocument();
  });

  it('renders all 4 workflow steps', () => {
    render(<Home />);
    expect(screen.getByText('아이디어 입력')).toBeInTheDocument();
    expect(screen.getByText('시장 조사')).toBeInTheDocument();
    expect(screen.getByText('기획서 작성')).toBeInTheDocument();
    expect(screen.getByText('다운로드')).toBeInTheDocument();
  });

  it('has links to /start page', () => {
    render(<Home />);
    const links = screen.getAllByRole('link', { name: /시작/i });
    expect(links.length).toBeGreaterThanOrEqual(2); // nav + hero + bottom CTA
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/start');
    }
  });

  it('renders footer', () => {
    render(<Home />);
    expect(screen.getByText(/Powered by/)).toBeInTheDocument();
  });
});
