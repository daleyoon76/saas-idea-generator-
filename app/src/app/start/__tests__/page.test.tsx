import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import StartPage from '../page';

describe('Start Page', () => {
  it('renders the page title', () => {
    render(<StartPage />);
    expect(screen.getByText('어떤 방식으로 시작하시겠어요?')).toBeInTheDocument();
  });

  it('renders guided question card with link to /guided', () => {
    render(<StartPage />);
    expect(screen.getByText('생각하고 계신 아이템이 있다면')).toBeInTheDocument();
    const guidedLink = screen.getByText('질문 시작하기').closest('a');
    expect(guidedLink).toHaveAttribute('href', '/guided');
  });

  it('renders keyword workflow card with link to /workflow', () => {
    render(<StartPage />);
    // Find any link to /workflow
    const links = screen.getAllByRole('link');
    const workflowLink = links.find(l => l.getAttribute('href') === '/workflow');
    expect(workflowLink).toBeTruthy();
  });

  it('has navigation with link back to home', () => {
    render(<StartPage />);
    const homeLink = screen.getByText('My CSO');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
