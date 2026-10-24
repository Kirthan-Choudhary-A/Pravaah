import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DEMO_STEPS } from './demoSteps';
import styles from './DemoGuidePanel.module.css';

export interface DemoGuidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const DemoGuidePanel: React.FC<DemoGuidePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const step = DEMO_STEPS[currentStepIdx] || DEMO_STEPS[0]!;

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= DEMO_STEPS.length) return;
      setCurrentStepIdx(index);
      const targetStep = DEMO_STEPS[index]!;
      navigate(targetStep.path);
    },
    [navigate]
  );

  const handleNext = useCallback(() => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      goToStep(currentStepIdx + 1);
    } else {
      onClose();
    }
  }, [currentStepIdx, goToStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStepIdx > 0) {
      goToStep(currentStepIdx - 1);
    }
  }, [currentStepIdx, goToStep]);

  // Sync currentStepIdx with URL if user navigates manually while demo guide is open
  useEffect(() => {
    if (!isOpen) return;
    const pathWithSearch = `${location.pathname}${location.search}`;
    const matchedIdx = DEMO_STEPS.findIndex(
      (s) => s.path === pathWithSearch || s.path === location.pathname
    );
    if (matchedIdx >= 0 && matchedIdx !== currentStepIdx) {
      setCurrentStepIdx(matchedIdx);
    }
  }, [location.pathname, location.search, isOpen, currentStepIdx]);

  // Keyboard navigation: N = next, P = prev, Esc = close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea or select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  return (
    <aside
      className={styles.demoPanel}
      aria-label="Judge demo guide panel"
      aria-live="polite"
    >
      <div className={styles.panelHeader}>
        <div className={styles.badgeRow}>
          <span className={styles.stepBadge}>Judge Demo Guide</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close demo guide (Esc)"
          title="Close demo guide (Esc)"
        >
          &times;
        </button>
      </div>

      <h3 className={styles.stepTitle}>
        {step.stepNumber}. {step.title}
      </h3>

      <p className={styles.narration}>{step.narration}</p>

      <div className={styles.takeawayBox}>
        <strong>Key takeaway</strong>
        {step.keyTakeaway}
      </div>

      <div className={styles.navRow}>
        <span className={styles.stepCounter}>
          Step {step.stepNumber} of {DEMO_STEPS.length}
        </span>
        <div className={styles.btnGroup}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className={styles.actionBtn}
            aria-label="Previous step (P)"
          >
            &larr; Prev
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            aria-label={
              currentStepIdx === DEMO_STEPS.length - 1
                ? 'Finish demo'
                : 'Next step (N)'
            }
          >
            {currentStepIdx === DEMO_STEPS.length - 1 ? 'Finish' : 'Next \u2192'}
          </button>
        </div>
      </div>

      <div className={styles.keyboardHints} aria-hidden="true">
        <span>[N] Next</span>
        <span>•</span>
        <span>[P] Prev</span>
        <span>•</span>
        <span>[Esc] Close</span>
      </div>
    </aside>
  );
};
