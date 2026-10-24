import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IntroGate } from '@features/intro/IntroGate';

const Child = () => <p>the app</p>;
let playImpl: () => Promise<void>;
let failLoad = false;
let instances: HTMLMediaElement[] = [];

beforeEach(() => {
  sessionStorage.clear();
  instances = [];
  failLoad = false;
  playImpl = () => Promise.resolve();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
    instances.push(this);
    queueMicrotask(() => this.dispatchEvent(new Event(failLoad ? 'error' : 'canplaythrough')));
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => playImpl());
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ready = () => screen.findByRole('button', { name: /enter pravaah/i }, { timeout: 5000 });

describe('Intro gate', () => {
  it('goes straight to the app when the intro was already seen', () => {
    sessionStorage.setItem('pravaah_intro_seen', '1');
    render(<IntroGate><Child /></IntroGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows real preload progress, then an Enter button once everything is ready', async () => {
    render(<IntroGate><Child /></IntroGate>);
    expect(screen.getByRole('dialog', { name: /welcome to pravaah/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /preparing pravaah/i })).toBeInTheDocument();
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
    const enter = await ready();
    expect(enter).toHaveFocus();
    expect(screen.getByText(/national anthem will play/i)).toBeInTheDocument();
  });

  it('can be skipped at any stage, including while loading, and remembers it', async () => {
    render(<IntroGate><Child /></IntroGate>);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText('the app')).toBeInTheDocument();
    expect(sessionStorage.getItem('pravaah_intro_seen')).toBe('1');
  });

  it('Escape skips too', async () => {
    render(<IntroGate><Child /></IntroGate>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByText('the app')).toBeInTheDocument();
  });

  it('plays the anthem at full volume on Enter, shows the lyrics, and opens the app when it ends', async () => {
    render(<IntroGate><Child /></IntroGate>);
    fireEvent.click(await ready());
    await waitFor(() => expect(screen.getByText(/जन गण मन अधिनायक/)).toBeInTheDocument());
    const audio = instances[0]!;
    expect(audio.volume).toBe(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    act(() => {
      audio.dispatchEvent(new Event('ended'));
      (audio as HTMLAudioElement).onended?.(new Event('ended'));
    });
    expect(await screen.findByText('the app')).toBeInTheDocument();
  });

  it('never traps the visitor if the browser refuses sound', async () => {
    playImpl = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    render(<IntroGate><Child /></IntroGate>);
    fireEvent.click(await ready());
    expect(await screen.findByText('the app')).toBeInTheDocument();
  });

  it('goes in if the anthem file cannot be loaded', async () => {
    failLoad = true;
    render(<IntroGate><Child /></IntroGate>);
    fireEvent.click(await ready());
    expect(await screen.findByText('the app')).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
