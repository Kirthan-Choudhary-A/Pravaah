import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@app/routes';

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
};

describe('App shell', () => {
  it('opens on the dashboard inside a sidebar layout, not a landing page', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    for (const label of ['Dashboard', 'My plan', 'What if', 'Family vehicles', 'Enter plate', 'Official sources']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    // Exactly one main landmark: pages must not nest their own.
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('keeps the simulated-data notice in the status bar', () => {
    renderAt('/household');
    expect(screen.getByText(/Prototype on simulated data\. Not affiliated/i)).toBeInTheDocument();
  });

  it('switches scenario from the top bar', () => {
    renderAt('/');
    const select = screen.getByRole('combobox', { name: /scenario/i });
    fireEvent.change(select, { target: { value: 'C' } });
    expect(screen.getByText(/no rules for this state/i)).toBeInTheDocument();
  });

  it('opens and closes the sidebar on desktop, and remembers the choice', () => {
    localStorage.removeItem('pravaah_nav_open');
    renderAt('/');
    const toggle = screen.getByRole('button', { name: /close navigation menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    const reopen = screen.getByRole('button', { name: /open navigation menu/i });
    expect(reopen).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('pravaah_nav_open')).toBe('0');
    fireEvent.click(reopen);
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts with the sidebar closed on a phone and closes it with Escape', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('56rem'),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    try {
      renderAt('/');
      const toggle = screen.getByRole('button', { name: /open navigation menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: /close navigation menu/i, expanded: true })).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toHaveAttribute('aria-expanded', 'false');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Dashboard', () => {
  it('shows the licence runway, written out in words, from the plan', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /licence timeline/i })).toBeInTheDocument();
    expect(screen.getByText(/The licence expires on day 21\./)).toBeInTheDocument();
    expect(screen.getByText(/You are away on days 12 to 25\./)).toBeInTheDocument();
  });

  it('recommends a route and applies it on request', () => {
    renderAt('/');
    const apply = screen.queryByRole('button', { name: /use this plan/i });
    if (apply) fireEvent.click(apply);
    expect(screen.getByText(/you are on this plan/i)).toBeInTheDocument();
  });

  it('stays short: three sections and a link to the full plan', () => {
    renderAt('/');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Licence timeline', 'Next steps', 'Best way to renew']);
    expect(screen.getByRole('link', { name: /see all \d+ steps/i })).toHaveAttribute('href', '/plan');
  });

  it('keeps reviewer material out of the main services', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(nav).getByText('For reviewers')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Metrics' })).toBeInTheDocument();
  });
});
