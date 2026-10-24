import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './IntroGate.module.css';

const SEEN_KEY = 'pravaah_intro_seen';
const ANTHEM_SRC = '/audio/jana-gana-mana.ogg';
/** Extra loudness above the device volume. A compressor keeps it from clipping. */
const ANTHEM_GAIN = 1.4;
const MIN_LOADING_MS = 1400;
const ASSET_TIMEOUT_MS = 9000;

/** First stanza of Jana Gana Mana (Rabindranath Tagore; public domain). */
const LYRICS = [
  'जन गण मन अधिनायक जय हे',
  'भारत भाग्य विधाता',
  'पंजाब सिन्ध गुजरात मराठा',
  'द्राविड़ उत्कल बंग',
  'विन्ध्य हिमाचल यमुना गंगा',
  'उच्छल जलधि तरंग',
  'तव शुभ नामे जागे',
  'तव शुभ आशिष मागे',
  'गाहे तव जय गाथा',
  'जन गण मंगल दायक जय हे',
  'भारत भाग्य विधाता',
  'जय हे, जय हे, जय हे',
  'जय जय जय जय हे',
];

type Stage = 'loading' | 'ready' | 'playing' | 'leaving' | 'done';

function introAlreadySeen(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('intro') === '0') return true;
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Not essential; the intro may show again on reload.
  }
}

/** Ashoka-chakra-style wheel: 24 spokes, drawn in code. */
const Chakra: React.FC<{ readonly spinning: boolean }> = ({ spinning }) => (
  <svg viewBox="0 0 120 120" className={`${styles.chakra ?? ''} ${spinning ? (styles.chakraSpin ?? '') : ''}`} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="60" cy="60" r="55" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="9" strokeWidth="2.5" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return (
          <g key={i}>
            <line x1={60 + 9 * c} y1={60 + 9 * s} x2={60 + 52 * c} y2={60 + 52 * s} strokeWidth="1.6" />
            <circle cx={60 + 51 * Math.cos(a + 0.13)} cy={60 + 51 * Math.sin(a + 0.13)} r="1.5" fill="currentColor" stroke="none" />
          </g>
        );
      })}
    </g>
  </svg>
);

export interface IntroGateProps {
  readonly children: React.ReactNode;
}

export const IntroGate: React.FC<IntroGateProps> = ({ children }) => {
  const [stage, setStage] = useState<Stage>(() => (introAlreadySeen() ? 'done' : 'loading'));
  const [progress, setProgress] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const reduced = useRef(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const finish = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
    }
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    markSeen();
    setStage('leaving');
    window.setTimeout(() => setStage('done'), reduced.current ? 0 : 520);
  }, []);

  // 1. Real preloading: fonts, the 3D scene code, the anthem, and a warm-up of the API.
  useEffect(() => {
    if (stage !== 'loading') return;
    let cancelled = false;
    const started = Date.now();
    const total = 4;
    let done = 0;
    const tick = () => {
      done += 1;
      if (!cancelled) setProgress(done / total);
    };
    const guard = (p: Promise<unknown>) =>
      Promise.race([p.catch(() => undefined), new Promise((r) => window.setTimeout(r, ASSET_TIMEOUT_MS))]).then(tick);

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = ANTHEM_SRC;
    audioRef.current = audio;
    const audioReady = new Promise<void>((resolve) => {
      if (audio.readyState >= 3) resolve();
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => {
        setAudioFailed(true);
        resolve();
      }, { once: true });
      audio.load();
    });

    void Promise.all([
      guard(document.fonts?.ready ?? Promise.resolve()),
      guard(import('@three/scenes/CadVehicle/CadVehicleViewer')),
      guard(audioReady),
      guard(fetch('/api/health')),
    ]).then(() => {
      const wait = Math.max(0, MIN_LOADING_MS - (Date.now() - started));
      window.setTimeout(() => !cancelled && setStage('ready'), wait);
    });

    return () => {
      cancelled = true;
    };
  }, [stage]);

  useEffect(() => {
    if (stage === 'ready') enterRef.current?.focus();
  }, [stage]);

  // Escape skips at any stage.
  useEffect(() => {
    if (stage === 'done' || stage === 'leaving') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, finish]);

  const begin = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || audioFailed) {
      finish();
      return;
    }
    try {
      audio.volume = 1;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const src = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = ANTHEM_GAIN;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -10;
        comp.ratio.value = 6;
        src.connect(gain).connect(comp).connect(ctx.destination);
        ctxRef.current = ctx;
        await ctx.resume();
      }
      audio.onended = () => finish();
      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setLineCount(Math.min(LYRICS.length, Math.floor((audio.currentTime / audio.duration) * (LYRICS.length + 0.6)) + 1));
        }
      };
      setStage('playing');
      await audio.play();
    } catch {
      // The browser refused sound or playback failed: do not trap the visitor.
      finish();
    }
  }, [audioFailed, finish]);

  if (stage === 'done') return <>{children}</>;

  const pct = Math.round(progress * 100);
  const showSkip = true;

  return (
    <div
      className={`${styles.gate ?? ''} ${stage === 'leaving' ? (styles.leaving ?? '') : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Pravaah"
    >
      <div className={styles.flag} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      {showSkip && (
        <button type="button" className={styles.skip} onClick={finish}>
          Skip
        </button>
      )}

      <div className={styles.center}>
        <Chakra spinning={!reduced.current && stage !== 'ready'} />
        <h1 className={styles.brand}>Pravaah</h1>
        <p className={styles.hindi} lang="hi">
          प्रवाह
        </p>
        <p className={styles.tag}>Vehicle &amp; driving services made simple</p>

        {stage === 'loading' && (
          <div className={styles.loader} role="status" aria-live="polite">
            <div
              className={styles.bar}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="Preparing Pravaah"
            >
              <span style={{ width: `${Math.max(6, pct)}%` }} />
            </div>
            <p className={styles.loadText}>Preparing your workspace… {pct}%</p>
          </div>
        )}

        {stage === 'ready' && (
          <div className={styles.ready}>
            <button ref={enterRef} type="button" className={styles.enter} onClick={() => void begin()}>
              Enter Pravaah
            </button>
            <p className={styles.note}>
              {audioFailed
                ? 'The anthem could not be loaded, so we will go straight in.'
                : 'The national anthem will play. Please stand if you are able to.'}
            </p>
          </div>
        )}

        {stage === 'playing' && (
          <div className={styles.lyrics} aria-live="off">
            {LYRICS.map((line, i) => (
              <p key={i} lang="hi" className={i < lineCount ? styles.lineOn : styles.lineOff}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      <p className={styles.foot}>Prototype on simulated data. Not affiliated with MoRTH or Parivahan.</p>
    </div>
  );
};
