import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@app/routes';

describe('Route Navigation Smoke Tests', () => {
  const testCases = [
    { path: '/', expectedHeading: 'Dashboard' },
    { path: '/overview', expectedHeading: 'About Pravaah' },
    { path: '/plan', expectedHeading: 'Planner' },
    { path: '/simulate', expectedHeading: 'Simulator' },
    { path: '/household', expectedHeading: 'Household' },
    { path: '/voice', expectedHeading: 'Voice' },
    { path: '/sources', expectedHeading: 'Sources' },
  ];

  testCases.forEach(({ path, expectedHeading }) => {
    it(`renders route "${path}" with <h1>${expectedHeading}</h1> and simulated notice`, () => {
      const router = createMemoryRouter(routes, {
        initialEntries: [path],
      });

      render(<RouterProvider router={router} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(expectedHeading);

      const notice = screen.getByText(
        /Prototype on simulated data\. Not affiliated with MoRTH or Parivahan\./i
      );
      expect(notice).toBeInTheDocument();
    });
  });
});
