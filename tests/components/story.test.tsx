import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@app/routes';

const renderStory = () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
};

describe('Story page tells only what the engine and data support', () => {
  it('derives the scenario tester from the plan, not from typed-in numbers', () => {
    renderStory();
    // Scenario A: licence expires on day 21 and the best plan finishes on day 31.
    expect(screen.getByText('Day 21')).toBeInTheDocument();
    expect(screen.getByText(/plan finishes on day 31/i)).toBeInTheDocument();
    expect(screen.getByText(/renew the licence online first/i)).toBeInTheDocument();
    expect(screen.getByText(/licence renewed in time/i)).toBeInTheDocument();
  });

  it('shows degraded mode, with no guessed dates, for the unknown state', () => {
    renderStory();
    fireEvent.click(screen.getByRole('button', { name: /scenario c/i }));
    expect(screen.getByText(/degraded mode: rules unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/no dates or fees are guessed/i)).toBeInTheDocument();
  });

  it('does not claim verified rules, 100% privacy or zero traps', () => {
    const { container } = renderStory();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/verified legal rules/i);
    expect(text).not.toMatch(/100% private/i);
    expect(text).not.toMatch(/zero portal traps/i);
    expect(text).not.toMatch(/exact legal/i);
    // The only mention of verification says nothing is verified yet.
    expect(within(container).getAllByText(/unverified/i).length).toBeGreaterThan(0);
  });
});
