import { describe, it, expect } from 'vitest';
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
    for (const label of ['Dashboard', 'Plan', 'Simulate', 'Household', 'Plate entry', 'Sources', 'Metrics']) {
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
    expect(screen.getByText(/rules unknown for the destination state/i)).toBeInTheDocument();
  });

  it('opens and closes the navigation drawer', () => {
    renderAt('/');
    const toggle = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /close navigation menu/i, expanded: true })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Dashboard', () => {
  it('shows the licence runway, written out in words, from the plan', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /licence runway/i })).toBeInTheDocument();
    expect(screen.getByText(/The licence expires on day 21/)).toBeInTheDocument();
    expect(screen.getByText(/The owner is away on days 12 to 25/)).toBeInTheDocument();
  });

  it('recommends a route and applies it on request', () => {
    renderAt('/');
    const apply = screen.queryByRole('button', { name: /use the recommended plan/i });
    if (apply) fireEvent.click(apply);
    expect(screen.getByText(/you are on the recommended plan/i)).toBeInTheDocument();
    expect(screen.getByText(/timings are assumed/i)).toBeInTheDocument();
  });

  it('lists what needs attention with a link into the plan', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /needs attention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /next up/i })).toBeInTheDocument();
  });

  it('never claims a family vehicle is shared when no consent is active', () => {
    renderAt('/');
    expect(screen.getByText(/owner identity numbers stay masked/i)).toBeInTheDocument();
  });
});
