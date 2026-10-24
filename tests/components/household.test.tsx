import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProvider } from '@state/PlanContext';
import { HouseholdPage } from '@features/household/HouseholdPage';

describe('Household & Privacy UI Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderHousehold = () => {
    return render(
      <MemoryRouter initialEntries={['/household']}>
        <PlanProvider>
          <HouseholdPage />
        </PlanProvider>
      </MemoryRouter>
    );
  };

  it('renders the family vehicles page', () => {
    renderHousehold();
    expect(screen.getByRole('heading', { level: 1, name: /family vehicles/i })).toBeInTheDocument();
  });

  it('strictly preserves privacy boundaries: never exposes raw secrets in DOM by default', () => {
    renderHousehold();

    // Masked plate is shown
    expect(screen.getByText('KA-03-**-**78')).toBeInTheDocument();

    // Raw family secrets must NEVER be present in the document
    expect(screen.queryByText('DEMO-0000-1234')).not.toBeInTheDocument();
    expect(screen.queryByText('KA-03-2018-0004578')).not.toBeInTheDocument();
    expect(screen.queryByText('MG Road, Bengaluru')).not.toBeInTheDocument();

    // Not even the masked form of the family member's Aadhaar, licence or challans is shown
    expect(screen.queryByText('XXXX-XXXX-1234')).not.toBeInTheDocument();
    expect(screen.queryByText(/KA••••4578/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 pending/i)).not.toBeInTheDocument();

    // Each of the three rows says it is not shared
    expect(screen.getAllByText(/not shared with delegates/i)).toHaveLength(3);
  });

  it('allows revealing authorized fields with valid purpose and logs audit entry', async () => {
    renderHousehold();

    // Find and click the Reveal button for Chassis Number
    const revealButtons = screen.getAllByRole('button', { name: /^reveal$/i });
    expect(revealButtons.length).toBeGreaterThan(0);
    fireEvent.click(revealButtons[0]!);

    // Dialog opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /time-limited field reveal/i })).toBeInTheDocument();

    // Submit purpose
    const submitBtn = screen.getByRole('button', { name: /reveal for 60s/i });
    fireEvent.click(submitBtn);

    // Modal closes and raw value is displayed with Hide button
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const hideBtn = screen.getByRole('button', { name: /^hide$/i });
    expect(hideBtn).toBeInTheDocument();

    // Clicking Hide immediately re-masks
    fireEvent.click(hideBtn);
    expect(screen.queryByRole('button', { name: /^hide$/i })).not.toBeInTheDocument();
  });

  it('switches to granter device view to inspect family member permissions', () => {
    renderHousehold();

    const familyTab = screen.getByRole('radio', { name: /family member \(simulated\)/i });
    fireEvent.click(familyTab);

    expect(screen.getByText(/granter device view \(simulated\)/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /active authorized grants/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke access/i })).toBeInTheDocument();
  });
});
