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
    expect(screen.getByRole('heading', { level: 1, name: /enter a vehicle number/i })).toBeInTheDocument();
    expect(screen.getByText(/speech service/i)).toBeInTheDocument();
    // The microphone uses a cloud speech service; the page must say so and never claim "local".
    expect(screen.getByRole('note')).toHaveTextContent(/receives the audio/i);
    expect(screen.queryByText(/transcribed locally/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local speech recognition/i)).not.toBeInTheDocument();
  });

  it('parses Sample 1 with look-alike O->0 fix and displays segments and read-back', () => {
    renderVoice();

    // Default or Sample 1 is parsed
    expect(screen.getByLabelText(/parsed plate number: ka-03-mj-4578/i)).toBeInTheDocument();
    expect(screen.getByText(/corrected for you/i)).toBeInTheDocument();
    expect(screen.getByText(/corrected to/i)).toBeInTheDocument();

    // Multilingual read-back present
    expect(screen.getByText(/read back to you:/i)).toBeInTheDocument();
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

    // Saving stays blocked until the mismatch is resolved
    expect(screen.getByRole('button', { name: /yes, confirm & save/i })).toBeDisabled();
    // The plate says Car, so keeping Car settles it...
    fireEvent.click(screen.getByRole('button', { name: /keep car/i }));
    expect(screen.getByRole('button', { name: /yes, confirm & save/i })).toBeEnabled();
  });

  it('clears the plate when the user says the vehicle type is right and the plate is wrong', () => {
    renderVoice();
    fireEvent.click(screen.getByRole('button', { name: /sample 4: dl class mismatch/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep two-wheeler/i }));
    expect(screen.queryByLabelText(/parsed plate number/i)).not.toBeInTheDocument();
  });

  it('offers other readings and blocks saving an invalid plate', () => {
    renderVoice();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'KA01AB123' } });
    expect(screen.getByLabelText(/parsed plate number: ka-01-ab-0123/i)).toBeInTheDocument();
    const other = screen.getByRole('button', { name: 'KA-01-A-8123' });
    fireEvent.click(other);
    expect(screen.getByLabelText(/parsed plate number: ka-01-a-8123/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ZZ01AB1234' } });
    expect(screen.getByRole('button', { name: /yes, confirm & save/i })).toBeDisabled();
  });

  it('confirms and saves vehicle to household on clicking Confirm', () => {
    renderVoice();

    const confirmBtn = screen.getByRole('button', { name: /yes, confirm & save/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/vehicle ka-03-mj-4578 successfully registered in household!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view in household/i })).toBeInTheDocument();
  });
});
