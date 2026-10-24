import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusTag } from '@components/ui/StatusTag';
import { BasisTag } from '@components/ui/BasisTag';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import { Panel } from '@components/ui/Panel';
import { FeesTable } from '@components/plan/FeesTable';
import type { FeeSummary } from '@engine/model/types';

describe('Design System UI Components', () => {
  describe('StatusTag', () => {
    it('always displays the status as a text word, never color alone', () => {
      render(
        <div>
          <StatusTag status="Safe" />
          <StatusTag status="At risk" />
          <StatusTag status="Missed" />
          <StatusTag status="Unknown" />
        </div>
      );

      expect(screen.getByText('Safe')).toBeInTheDocument();
      expect(screen.getByText('At risk')).toBeInTheDocument();
      expect(screen.getByText('Missed')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders accessible symbols along with the label', () => {
      render(<StatusTag status="Safe" />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent('●');
      expect(statusElement).toHaveTextContent('Safe');
    });
  });

  describe('BasisTag', () => {
    it('labels modelled rules as "modelled rule (assumed)"', () => {
      render(<BasisTag basis="modelled" />);
      expect(screen.getByText('modelled rule (assumed)')).toBeInTheDocument();
    });

    it('labels official statutes cleanly', () => {
      render(<BasisTag basis="statute" />);
      expect(screen.getByText('Statute')).toBeInTheDocument();
    });
  });

  describe('SegmentedControl', () => {
    it('renders with ARIA radiogroup semantics', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          label="Test Options"
          value="opt1"
          onChange={onChange}
          options={[
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' },
          ]}
        />
      );

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
      expect(radios[1]).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(radios[1]!);
      expect(onChange).toHaveBeenCalledWith('opt2');
    });
  });

  describe('Panel (Inspector Overlay)', () => {
    it('renders dialog with aria-modal and closes on close button', () => {
      const onClose = vi.fn();
      render(
        <Panel isOpen={true} onClose={onClose} title="Task Details">
          <p>Task Content</p>
        </Panel>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Task Content')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: 'Close inspector' });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('FeesTable', () => {
    const mockFees: FeeSummary = {
      items: [
        {
          id: 'dl-renewal-fee',
          label: 'Licence Renewal Fee',
          amount: 200,
          tag: 'Official',
          sourceIds: ['cmvr-rule-32'],
          lastChecked: '2026-03-01',
          verified: false,
          note: 'Rule 32 standard renewal fee',
        },
      ],
      officialTotal: 200,
      estimateCount: 0,
      hiddenCount: 0,
      hasUnverified: true,
    };

    it('renders official fee amounts', () => {
      render(<FeesTable fees={mockFees} />);
      expect(screen.getByText('Licence Renewal Fee')).toBeInTheDocument();
      expect(screen.getAllByText(/200/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/fee rules unverified/i)).toBeInTheDocument();
    });

    it('shows degraded mode without amounts when state rules are unknown', () => {
      render(<FeesTable fees={mockFees} isDegraded={true} stateName="Sikkim" />);
      expect(
        screen.getByText(/rules unknown – confirm with the rto for sikkim/i)
      ).toBeInTheDocument();
      expect(screen.queryByText('₹200')).not.toBeInTheDocument();
    });
  });
});
