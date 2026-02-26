import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

// Mock react-markdown (heavy dependency)
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

// Mock docx library
vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: { toBlob: vi.fn() },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  Table: vi.fn(),
  TableRow: vi.fn(),
  TableCell: vi.fn(),
  WidthType: {},
  BorderStyle: {},
  ShadingType: {},
}));

// Mock fetch for provider check
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ ollama: false, claude: true, gemini: true, openai: false }),
});

import WorkflowPage from '../page';

describe('Workflow Page', () => {
  it('renders the page with SaaS Idea Generator title', () => {
    render(<WorkflowPage />);
    expect(screen.getByText('SaaS Idea Generator')).toBeInTheDocument();
  });

  it('renders provider buttons', () => {
    render(<WorkflowPage />);
    // Provider labels should be visible
    expect(screen.getAllByText(/Claude/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the workflow UI', () => {
    render(<WorkflowPage />);
    // The page should have some form of input or button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
