import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '@state/PlanContext';
import { askAssistant, type ChatMessage } from './client';
import { ASSISTANT_LANGUAGES, STARTERS, type AssistantLanguage } from './languages';
import { speak, startRecording, stopSpeaking, transcribe, type Recorder } from './voice';
import styles from './AssistantPanel.module.css';

interface Bubble {
  readonly id: number;
  readonly from: 'you' | 'assistant' | 'notice';
  readonly text: string;
}

type Health = { assistant: boolean; language: boolean } | 'unknown' | 'offline';

const LANG_KEY = 'pravaah_assistant_lang';
const readLang = (): AssistantLanguage => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (ASSISTANT_LANGUAGES.some((l) => l.code === v)) return v as AssistantLanguage;
  } catch {
    // storage unavailable: use the default
  }
  return 'en-IN';
};

export const AssistantPanel: React.FC = () => {
  const plan = usePlan();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<AssistantLanguage>(readLang);
  const [bubbles, setBubbles] = useState<readonly Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [health, setHealth] = useState<Health>('unknown');
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const history = useRef<readonly ChatMessage[]>([]);
  const recorder = useRef<Recorder | null>(null);
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Always read the latest plan inside async work.
  const ctxRef = useRef(plan);
  ctxRef.current = plan;

  const push = useCallback((from: Bubble['from'], text: string): number => {
    const id = ++idRef.current;
    setBubbles((b) => [...b, { id, from, text }]);
    return id;
  }, []);

  useEffect(() => {
    if (!open || health !== 'unknown') return;
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad'))))
      .then((j: { assistant: boolean; language: boolean }) => setHealth({ assistant: j.assistant, language: j.language }))
      .catch(() => setHealth('offline'));
  }, [open, health]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => {
    recorder.current?.cancel();
    stopSpeaking();
  }, []);

  const changeLanguage = (code: AssistantLanguage) => {
    setLanguage(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      // not essential
    }
  };

  const send = useCallback(
    async (text: string, spokenAnswer = false) => {
      const q = text.trim();
      if (!q || busy) return;
      setDraft('');
      push('you', q);
      setBusy(true);
      const p = ctxRef.current;
      const result = await askAssistant(
        history.current,
        q,
        {
          scenario: p.scenario,
          rulePack: p.rulePack,
          decisions: p.decisions,
          activeEvents: p.activeEvents,
          currentPlan: p.currentPlan,
          optionsComparison: p.optionsComparison,
          sources: p.sources,
          isDegraded: p.isDegraded,
        },
        { navigate },
        { language }
      );
      setBusy(false);
      history.current = result.updated;
      const id = push(result.ok ? 'assistant' : 'notice', result.text);
      if (result.ok && spokenAnswer) {
        setSpeakingId(id);
        await speak(result.text, language);
        setSpeakingId(null);
      }
      inputRef.current?.focus();
    },
    [busy, language, navigate, push]
  );

  const toggleMic = async () => {
    if (recording) {
      const rec = recorder.current;
      recorder.current = null;
      setRecording(false);
      if (!rec) return;
      setBusy(true);
      const audio = await rec.stop();
      const t = await transcribe(audio, language);
      setBusy(false);
      if (t.ok) void send(t.text, true);
      else push('notice', t.error);
      return;
    }
    try {
      stopSpeaking();
      recorder.current = await startRecording();
      setRecording(true);
    } catch (e) {
      push('notice', e instanceof Error ? e.message : 'Could not start the microphone.');
    }
  };

  const listen = async (b: Bubble) => {
    if (speakingId === b.id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(b.id);
    await speak(b.text, language);
    setSpeakingId(null);
  };

  const starters = STARTERS[language];
  const unavailable = health !== 'unknown' && (health === 'offline' || !health.assistant);
  const langLabel = useMemo(() => ASSISTANT_LANGUAGES.find((l) => l.code === language)?.label ?? '', [language]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        <span className={styles.launcherDot} aria-hidden="true" />
        {open ? 'Close assistant' : 'Ask Pravaah'}
      </button>

      {open && (
        <section id="assistant-panel" className={styles.panel} role="dialog" aria-label="Pravaah assistant">
          <header className={styles.head}>
            <div>
              <h2 className={styles.title}>Ask Pravaah</h2>
              <p className={styles.sub}>Answers come from your plan. Simulated data.</p>
            </div>
            <label className={styles.langField}>
              <span className={styles.srOnly}>Language</span>
              <select
                className={styles.lang}
                value={language}
                onChange={(e) => changeLanguage(e.target.value as AssistantLanguage)}
                aria-label="Assistant language"
              >
                {ASSISTANT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div ref={listRef} className={styles.list} aria-live="polite" aria-relevant="additions">
            {bubbles.length === 0 && (
              <div className={styles.welcome}>
                <p>
                  Ask about your licence, your steps, fees or what happens if something changes. I
                  look up your plan each time, so the numbers match the screen.
                </p>
                <div className={styles.starters}>
                  {starters.map((s) => (
                    <button key={s} type="button" className={styles.chip} onClick={() => void send(s)} disabled={busy || unavailable}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {unavailable && (
              <p className={styles.notice} role="status">
                {health === 'offline'
                  ? 'The assistant server is not reachable. Run the app with its API (npm run dev, or deploy with the /api folder).'
                  : 'The assistant is not set up yet. Add GROQ_API_KEYS to the server environment, then reload.'}
              </p>
            )}

            {bubbles.map((b) => (
              <div key={b.id} className={`${styles.bubble ?? ''} ${styles[b.from] ?? ''}`}>
                <p>{b.text}</p>
                {b.from === 'assistant' && (
                  <button type="button" className={styles.listen} onClick={() => void listen(b)}>
                    {speakingId === b.id ? 'Stop' : `Listen in ${langLabel}`}
                  </button>
                )}
              </div>
            ))}
            {busy && (
              <div className={`${styles.bubble ?? ''} ${styles.assistant ?? ''}`} role="status">
                <span className={styles.typing} aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <button
              type="button"
              className={`${styles.mic ?? ''} ${recording ? (styles.micOn ?? '') : ''}`}
              onClick={() => void toggleMic()}
              aria-pressed={recording}
              aria-label={recording ? 'Stop recording and send' : 'Ask by speaking'}
              disabled={busy && !recording}
            >
              {recording ? 'Stop' : 'Speak'}
            </button>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={draft}
              rows={1}
              placeholder={recording ? 'Listening…' : 'Type your question'}
              aria-label="Your question"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              disabled={recording}
            />
            <button type="submit" className={styles.send} disabled={busy || !draft.trim() || unavailable}>
              Send
            </button>
          </form>
          <p className={styles.fineprint}>
            Speech goes to Sarvam&apos;s language service. Do not say real ID numbers.
          </p>
        </section>
      )}
    </>
  );
};
