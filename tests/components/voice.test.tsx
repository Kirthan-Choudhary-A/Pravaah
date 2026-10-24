import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProvider } from '@state/PlanContext';
import { VoicePage } from '@features/voice/VoicePage';

describe('Voice & Typed Plate Entry UI Tests', () => {
  const renderVoice = () => {
    return render(
      <MemoryRouter initialEntries={['/voice']}>
        <PlanProvider>
          <VoicePage />
        </PlanProvider>
      </MemoryRouter>
    );
  };

  it('renders Voice page with speech notices and input controls', () => {
    renderVoice();
    expect(screen.getByRole('heading', { level: 1, name: /voice & typed plate entry/i })).toBeInTheDocument();
    expect(screen.getByText(/local speech recognition/i)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/audio privacy notice/i);
  });

  it('parses Sample 1 with look-alike O->0 fix and displays segments and read-back', () => {
    renderVoice();

    // Default or Sample 1 is parsed
    expect(screen.getByLabelText(/parsed plate number: ka-03-mj-4578/i)).toBeInTheDocument();
    expect(screen.getByText(/phonetic & look-alike auto-corrections/i)).toBeInTheDocument();
    expect(screen.getByText(/corrected to/i)).toBeInTheDocument();

    // Multilingual read-back present
    expect(screen.getByText(/multilingual read-back:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /listen \(audio\)/i })).toBeInTheDocument();
  });

  it('switches to Telugu and Kannada showing native review warning badge', () => {
    renderVoice();

    const teluguTab = screen.getByRole('button', { name: /తెలుగు/i });
    fireEvent.click(teluguTab);

    expect(screen.getByText(/needs native speaker review/i)).toBeInTheDocument();
    expect(screen.getAllByText(/కర్ణాటక/i).length).toBeGreaterThan(0);

    const kannadaTab = screen.getByRole('button', { name: /ಕನ್ನಡ/i });
    fireEvent.click(kannadaTab);

    expect(screen.getByText(/needs native speaker review/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ಕರ್ನಾಟಕ/i).length).toBeGreaterThan(0);
  });

  it('flags Delhi class mismatch on Sample 4 without auto-correcting', () => {
    renderVoice();

    const sample4Btn = screen.getByRole('button', { name: /sample 4: dl class mismatch/i });
    fireEvent.click(sample4Btn);

    expect(screen.getByLabelText(/parsed plate number: dl-01-cab-1234/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/state plate \/ vehicle category mismatch/i);
    expect(screen.getByRole('button', { name: /keep car/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep two-wheeler/i })).toBeInTheDocument();
  });

  it('confirms and saves vehicle to household on clicking Confirm', () => {
    renderVoice();

    const confirmBtn = screen.getByRole('button', { name: /yes, confirm & save/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/vehicle ka-03-mj-4578 successfully registered in household!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view in household/i })).toBeInTheDocument();
  });
});
