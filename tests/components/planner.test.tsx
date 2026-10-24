import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@app/routes';

describe('Planner and Simulator Integration', () => {
  it('renders Planner with simulated notice, timeline, and checks', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/plan'],
    });

    render(<RouterProvider router={router} />);

    // SIMULATED badge exists
    expect(screen.getByText(/assumed processing times/i)).toBeInTheDocument();

    // Check headings
    expect(screen.getByRole('heading', { level: 1, name: /my plan/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /steps in order/i })).toBeInTheDocument();
    // Detail is one click away, not on the page by default
    expect(screen.getByText(/why each step comes before another/i)).toBeInTheDocument();
    expect(screen.getByText(/compare ways to renew your licence/i)).toBeInTheDocument();

    // Toggle to Table view in Timeline
    const tableBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(tableBtn);
    expect(screen.getByRole('table', { name: /tasks schedule & deadlines/i })).toBeInTheDocument();
  });

  it('renders Simulator with scenario picker and allows curveball injection', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/simulate'],
    });

    render(<RouterProvider router={router} />);

    // Simulator title
    expect(
      screen.getByRole('heading', { name: /what if something changes/i })
    ).toBeInTheDocument();

    // Curveball buttons exist
    const slotDelayBtn = screen.getByRole('button', {
      name: /rto slot queue delayed/i,
    });
    expect(slotDelayBtn).toBeInTheDocument();

    // Inject curveball
    fireEvent.click(slotDelayBtn);
    expect(slotDelayBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders Sources page with rule packs and official citations', () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/sources'],
    });

    render(<RouterProvider router={router} />);

    expect(
      screen.getByRole('heading', { name: /official sources/i })
    ).toBeInTheDocument();

    // Rule packs table
    expect(screen.getByText('Union of India (Central MV Act & CMVR)')).toBeInTheDocument();
    expect(screen.getByText('Karnataka Transport Department')).toBeInTheDocument();
  });
});
