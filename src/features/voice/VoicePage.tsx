import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fontsource/noto-sans-devanagari';
import '@fontsource/noto-sans-telugu';
import '@fontsource/noto-sans-kannada';
import { usePlan } from '@state/PlanContext';
import { loadMergedRulePack } from '@data';
import {
  parsePlate,
  checkPlateClass,
  buildReadBack,
  type ParsedPlate,
  type ClassCheckResult,
  type ReadBackResult,
  type HouseholdVehicle,
} from '@engine';
import {
  ENGLISH_LETTERS,
  NATO_ALPHABET,
  ENGLISH_DIGITS,
  HINDI_DIGITS,
  TELUGU_DIGITS,
  KANNADA_DIGITS,
  FILLER_WORDS,
  STATE_NAMES,
  CONFIRMATION_PROMPTS,
  NATIVE_REVIEW_REQUIRED,
} from '../../i18n/words';
import { Button } from '@components/ui/Button';
import { Banner } from '@components/ui/Banner';
import { PageHeader } from '@components/layout/PageHeader';
import styles from './VoicePage.module.css';

// Web Speech API interface
interface SpeechRecognitionResultItem {
  readonly transcript?: string;
}

interface SpeechRecognitionEventLike {
  readonly results: {
    readonly [index: number]: {
      readonly [index: number]: SpeechRecognitionResultItem;
    };
  };
}

interface SpeechRecognitionErrorLike {
  readonly error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface IWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export const VoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { addVehicleAction, activeRole } = usePlan();

  const [transcriptInput, setTranscriptInput] = useState<string>(
    'kay ay oh three em jay four five seven eight'
  );
  const [selectedVehicleType, setSelectedVehicleType] = useState<'Car' | 'Two-Wheeler'>('Car');
  const [readBackLang, setReadBackLang] = useState<'en' | 'hi' | 'te' | 'kn'>('en');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Setup dictionaries
  const dict = useMemo(
    () => ({
      letterNames: ENGLISH_LETTERS,
      natoAlphabet: NATO_ALPHABET,
      digits: ENGLISH_DIGITS,
      hindiDigits: HINDI_DIGITS,
      teluguDigits: TELUGU_DIGITS,
      kannadaDigits: KANNADA_DIGITS,
      fillerWords: FILLER_WORDS,
    }),
    []
  );

  const readBackDict = useMemo(
    () => ({
      stateNames: STATE_NAMES,
      confirmationPrompts: CONFIRMATION_PROMPTS,
      englishDigits: ENGLISH_DIGITS,
      hindiDigits: HINDI_DIGITS,
      teluguDigits: TELUGU_DIGITS,
      kannadaDigits: KANNADA_DIGITS,
      natoAlphabet: NATO_ALPHABET,
    }),
    []
  );

  // Parse plate on transcript change
  const parseResult = useMemo(() => {
    if (!transcriptInput.trim()) return null;
    return parsePlate(transcriptInput, dict);
  }, [transcriptInput, dict]);

  const candidates = useMemo(() => parseResult?.candidates ?? [], [parseResult]);
  const [pickedPlate, setPickedPlate] = useState<string | null>(null);
  const candidate: ParsedPlate | null =
    candidates.find((c) => c.formatted === pickedPlate) ?? candidates[0] ?? null;

  // Class check (e.g. DL Car vs Two-Wheeler)
  const classCheck: ClassCheckResult | null = useMemo(() => {
    if (!candidate) return null;
    // Each state's own pack says whether its plates encode the vehicle class.
    return checkPlateClass(candidate, selectedVehicleType, loadMergedRulePack(candidate.state));
  }, [candidate, selectedVehicleType]);

  // Multilingual read-back
  const readBack: ReadBackResult | null = useMemo(() => {
    if (!candidate) return null;
    return buildReadBack(candidate, readBackLang, readBackDict);
  }, [candidate, readBackLang, readBackDict]);

  // Demo samples
  const handleSelectSample = (transcript: string, vType: 'Car' | 'Two-Wheeler') => {
    setTranscriptInput(transcript);
    setPickedPlate(null);
    setSelectedVehicleType(vType);
    setSavedSuccess(null);
  };

  // Web Speech API Microphone Toggle
  const toggleListening = () => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setMicError(
        'SpeechRecognition API is not supported in this browser. Use typed input or demo samples.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = readBackLang === 'hi' ? 'hi-IN' : readBackLang === 'te' ? 'te-IN' : readBackLang === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const spoken = event.results[0]?.[0]?.transcript;
        if (spoken) {
          setTranscriptInput(spoken);
        }
      };

      recognition.onerror = (e: SpeechRecognitionErrorLike) => {
        setMicError(`Microphone error: ${e.error || 'Permission denied or capture failed'}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMicError(`Failed to initialize microphone: ${msg}`);
      setIsListening(false);
    }
  };

  // Speech synthesis audio playback
  const handlePlayAudio = () => {
    if (!readBack || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(readBack.fullSpeech);
    utterance.lang =
      readBackLang === 'hi'
        ? 'hi-IN'
        : readBackLang === 'te'
          ? 'te-IN'
          : readBackLang === 'kn'
            ? 'kn-IN'
            : 'en-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Confirm and Save
  const mismatch = classCheck?.status === 'mismatch';

  // Choosing what the plate says settles it; choosing the other means the plate is wrong.
  const resolveMismatch = (choice: 'Car' | 'Two-Wheeler') => {
    if (classCheck?.detectedClass === choice) {
      setSelectedVehicleType(choice);
    } else {
      setTranscriptInput('');
      setPickedPlate(null);
    }
  };
  const saveBlockedReason = !candidate
    ? 'Enter a plate first.'
    : !candidate.isValid
      ? (candidate.error ?? 'This plate is not valid.')
      : mismatch
        ? 'Resolve the vehicle category mismatch above first.'
        : null;

  const handleConfirmSave = () => {
    if (!candidate || saveBlockedReason) return;

    const newVehicle: HouseholdVehicle = {
      id: `veh-${Date.now()}`,
      plate: candidate.formatted,
      vehicleType: selectedVehicleType,
      ownerRole: activeRole,
      // No deadline is invented: renewal dates come from the owner or a verified source.
      renewalItems: [],
    };

    addVehicleAction(newVehicle);
    setSavedSuccess(`Vehicle ${candidate.formatted} successfully registered in household!`);
  };

  // Raw token display
  const rawTokens = useMemo(() => {
    return transcriptInput
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(Boolean);
  }, [transcriptInput]);

  return (
    <div className={styles.pageContainer}>
        <PageHeader
          title="Voice & Typed Plate Entry"
          description="Type or speak your vehicle number in English, Hindi, Telugu or Kannada. Look-alike mix-ups are corrected by position, Delhi class letters are checked against your vehicle type, and the number is read back before anything is saved."
          actions={
            <span className={styles.simulatedBadge}>
              <span aria-hidden="true">🎙️</span> BROWSER SPEECH SERVICE
            </span>
          }
        />

        <div className={styles.privacyNotice} role="note">
          <span>🛡️</span>
          <span>
            <strong>Audio Privacy Notice:</strong> Typed input and the demo samples stay in your
            browser. The microphone button uses your browser&apos;s speech service (in Chrome, a
            Google service), which receives the audio. Do not speak a real registration number.
            Live speech accuracy is not yet tested.
          </span>
        </div>

        {/* Input Section */}
        <section className={styles.inputSection} aria-label="Registration Entry Mode">
          {/* Quick Demo Samples */}
          <div className={styles.samplesRow}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--graphite)' }}>
              Or click a demo spoken sample:
            </span>
            <div className={styles.samplesGrid}>
              <button
                type="button"
                className={styles.sampleButton}
                onClick={() =>
                  handleSelectSample(
                    'kay ay oh three em jay four five seven eight',
                    'Car'
                  )
                }
              >
                <span className={styles.sampleTitle}>Sample 1: KA-03 ('oh' fix)</span>
                <span className={styles.sampleTranscript}>kay ay oh three em jay 4 5 7 8</span>
              </button>

              <button
                type="button"
                className={styles.sampleButton}
                onClick={() =>
                  handleSelectSample(
                    'tee ess zero nine ee eight double four seven one',
                    'Car'
                  )
                }
              >
                <span className={styles.sampleTitle}>Sample 2: TS-09 ('eight'-&gt;B fix)</span>
                <span className={styles.sampleTranscript}>tee ess 09 ee 8 double 4 7 1</span>
              </button>

              <button
                type="button"
                className={styles.sampleButton}
                onClick={() =>
                  handleSelectSample(
                    'kay ay zero three em jay chaar paanch saat aath',
                    'Car'
                  )
                }
              >
                <span className={styles.sampleTitle}>Sample 3: Hindi Numbers</span>
                <span className={styles.sampleTranscript}>KA 03 MJ chaar paanch saat aath</span>
              </button>

              <button
                type="button"
                className={styles.sampleButton}
                onClick={() =>
                  handleSelectSample(
                    'dee el one see ay bee one two three four',
                    'Two-Wheeler'
                  )
                }
              >
                <span className={styles.sampleTitle}>Sample 4: DL Class Mismatch</span>
                <span className={styles.sampleTranscript}>DL 1C AB 1234 (Two-Wheeler)</span>
              </button>
            </div>
          </div>

          {/* Typed & Mic Input */}
          <div className={styles.inputGroup}>
            <input
              type="text"
              className={styles.textInput}
              value={transcriptInput}
              onChange={(e) => {
                setTranscriptInput(e.target.value);
                setSavedSuccess(null);
              }}
              placeholder="Speak or type transcript e.g. 'KA 03 MJ 4578' or 'kay ay oh three...'"
              aria-label="Plate transcript input"
            />

            <button
              type="button"
              className={`${styles.micButton} ${isListening ? styles.micButtonListening : ''}`}
              onClick={toggleListening}
              aria-pressed={isListening}
            >
              <span aria-hidden="true">{isListening ? '⏹️' : '🎙️'}</span>
              <span>{isListening ? 'Listening...' : 'Microphone'}</span>
            </button>
          </div>

          {micError && (
            <div style={{ color: 'var(--status-missed)', fontSize: 'var(--font-size-xs)' }}>
              {micError}
            </div>
          )}

          {/* Vehicle Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Vehicle Category:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="radio"
                name="vType"
                checked={selectedVehicleType === 'Car'}
                onChange={() => setSelectedVehicleType('Car')}
              />
              Car (Light Motor Vehicle)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="radio"
                name="vType"
                checked={selectedVehicleType === 'Two-Wheeler'}
                onChange={() => setSelectedVehicleType('Two-Wheeler')}
              />
              Two-Wheeler (Motorcycle/Scooter)
            </label>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PARSED RESULT SEGMENTS */}
        {/* ============================================================== */}
        {candidate && (
          <section className={styles.resultsSection} aria-label="Parsed Plate Results">
            {/* Heard Transcript */}
            <div className={styles.segmentsGroup}>
              <div className={styles.segmentTitle}>Heard Transcript Tokens</div>
              <div className={styles.tokenList}>
                {rawTokens.map((token, idx) => {
                  const isFiller = FILLER_WORDS.has(token);
                  return (
                    <span
                      key={`${token}-${idx}`}
                      className={`${styles.tokenBadge} ${isFiller ? styles.tokenFiller : ''}`}
                      title={isFiller ? 'Filler word ignored by parser' : undefined}
                    >
                      {token}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Formatted Plate Display */}
            <div className={styles.resultPlateBadge} aria-label={`Parsed plate number: ${candidate.formatted}`}>
              {candidate.formatted}
            </div>

            {candidates.length > 1 && (
              <div className={styles.fixesBox} role="group" aria-label="Other possible readings">
                <div className={styles.fixesTitle}>
                  <span>Other possible readings ({candidates.length - 1}) &mdash; tap the one you meant</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {candidates.map((c) => (
                    <Button
                      key={c.formatted}
                      variant={c.formatted === candidate.formatted ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={c.formatted === candidate.formatted}
                      onClick={() => setPickedPlate(c.formatted)}
                    >
                      {c.formatted}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Positional Fixes */}
            {candidate.fixes.length > 0 && (
              <div className={styles.fixesBox} role="alert">
                <div className={styles.fixesTitle}>
                  <span>⚠️</span>
                  <span>Phonetic & Look-Alike Auto-Corrections ({candidate.fixes.length})</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                  {candidate.fixes.map((fix, idx) => (
                    <li key={idx}>
                      Look-alike <code>'{fix.original}'</code> corrected to <code>'{fix.corrected}'</code> at position {fix.position + 1}: {fix.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Class Check Mismatch Warning */}
            {classCheck && classCheck.status === 'mismatch' && (
              <div className={styles.classMismatchBox} role="alert">
                <div style={{ fontWeight: 700, color: 'var(--status-missed)' }}>
                  ⚠️ State Plate / Vehicle Category Mismatch
                </div>
                <div>{classCheck.question}</div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resolveMismatch('Car')}
                  >
                    Keep Car
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resolveMismatch('Two-Wheeler')}
                  >
                    Keep Two-Wheeler
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MULTILINGUAL READ-BACK */}
            {/* ============================================================== */}
            {readBack && (
              <div className={styles.readBackSection}>
                <div className={styles.readBackHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                      Multilingual Read-Back:
                    </span>
                    {NATIVE_REVIEW_REQUIRED[readBackLang] && (
                      <span className={styles.reviewBadge}>Needs native speaker review</span>
                    )}
                  </div>

                  {/* Language Switcher Tabs */}
                  <div className={styles.readBackLangTabs}>
                    {(['en', 'hi', 'te', 'kn'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={`${styles.langTabBtn} ${readBackLang === lang ? styles.langTabBtnActive : ''}`}
                        onClick={() => setReadBackLang(lang)}
                        aria-pressed={readBackLang === lang}
                      >
                        {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : lang === 'te' ? 'తెలుగు' : 'ಕನ್ನಡ'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spoken Content Box with Indic Fonts */}
                <div
                  className={`${styles.readBackContentBox} ${
                    readBackLang === 'hi'
                      ? styles.fontHindi
                      : readBackLang === 'te'
                        ? styles.fontTelugu
                        : readBackLang === 'kn'
                          ? styles.fontKannada
                          : ''
                  }`}
                >
                  <div className={styles.spokenSegmentsList}>
                    {readBack.segments.map((seg, idx) => (
                      <div key={idx} className={styles.spokenSegmentItem}>
                        <span className={styles.segmentKind}>{seg.kind}</span>
                        <span className={styles.segmentText}>{seg.text}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontStyle: 'italic', color: 'var(--charcoal)' }}>
                      "{readBack.fullSpeech}"
                    </div>

                    <Button variant="secondary" size="sm" onClick={handlePlayAudio}>
                      🔊 Listen (Audio)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation & Save Row */}
            {savedSuccess ? (
              <Banner variant="info" title="Vehicle Saved">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                  <span>{savedSuccess}</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="primary" size="sm" onClick={() => navigate('/household')}>
                      View in Household
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/plan')}>
                      View in Planner
                    </Button>
                  </div>
                </div>
              </Banner>
            ) : (
              <div className={styles.actionFooterRow}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--iron)' }}>
                  {CONFIRMATION_PROMPTS[readBackLang]}
                </span>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setTranscriptInput('');
                    setSavedSuccess(null);
                  }}
                >
                  No, Fix It
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmSave}
                  disabled={saveBlockedReason !== null}
                >
                  Yes, Confirm &amp; Save
                </Button>
                {saveBlockedReason && (
                  <span role="note" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-missed)' }}>
                    {saveBlockedReason}
                  </span>
                )}
              </div>
            )}
          </section>
        )}
    </div>
  );
};
