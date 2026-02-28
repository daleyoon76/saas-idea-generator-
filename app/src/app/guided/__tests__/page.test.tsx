import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock fetch for provider check
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ ollama: false, claude: true, gemini: true, openai: false }),
});

import GuidedPage from '../page';

describe('Guided Page', () => {
  it('renders the page with navigation', () => {
    render(<GuidedPage />);
    // Guided page has a back link to /start
    const links = screen.getAllByRole('link');
    const backLink = links.find(l => l.getAttribute('href') === '/start');
    expect(backLink).toBeTruthy();
  });

  it('renders preset selection button', () => {
    render(<GuidedPage />);
    expect(screen.getByText(/모드/)).toBeInTheDocument();
  });

  it('renders guided step UI elements', () => {
    render(<GuidedPage />);
    // Should have input fields or buttons for the guided flow
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
