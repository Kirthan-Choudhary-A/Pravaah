import React from 'react';
import styles from './HeroPlate.module.css';

export interface HeroPlateFallbackProps {
  readonly expiryDaysBefore?: number;
}

export const HeroPlateFallback: React.FC<HeroPlateFallbackProps> = ({
  expiryDaysBefore = 16,
}) => {
  return (
    <div className={styles.fallbackContainer} aria-label="Registration plate and sample driving licence representation">
      {/* 2D High-fidelity SVG of Generic Plate */}
      <div className={styles.fallbackPlateWrapper}>
        <svg
          viewBox="0 0 520 120"
          className={styles.fallbackPlateSvg}
          role="img"
          aria-label="Generic registration plate reading KA 03 MJ 4578"
        >
          {/* Plate body with brushed metal gradient */}
          <defs>
            <linearGradient id="plateMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7f6f0" />
              <stop offset="50%" stopColor="#edeae1" />
              <stop offset="100%" stopColor="#e3dfd3" />
            </linearGradient>
            <linearGradient id="embossBorder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#343531" />
              <stop offset="100%" stopColor="#171815" />
            </linearGradient>
          </defs>

          {/* Border */}
          <rect x="4" y="4" width="512" height="112" rx="8" fill="url(#plateMetal)" stroke="url(#embossBorder)" strokeWidth="4" />
          <rect x="10" y="10" width="500" height="100" rx="6" fill="none" stroke="#b7b0a3" strokeWidth="1.5" />

          {/* Characters */}
          <text
            x="260"
            y="78"
            textAnchor="middle"
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="700"
            fontSize="64"
            fill="#171815"
            letterSpacing="6"
          >
            KA 03 MJ 4578
          </text>
        </svg>
      </div>

      {/* 2D High-fidelity SVG of Generic PVC Licence Card */}
      <div className={styles.fallbackCardWrapper}>
        <svg
          viewBox="0 0 400 240"
          className={styles.fallbackCardSvg}
          role="img"
          aria-label="Generic sample driving licence card"
        >
          <defs>
            <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3f0e8" />
              <stop offset="100%" stopColor="#e8e4d8" />
            </linearGradient>
          </defs>

          {/* PVC Card base */}
          <rect x="2" y="2" width="396" height="236" rx="14" fill="url(#cardBg)" stroke="#b7b0a3" strokeWidth="2" />

          {/* Header watermark */}
          <text x="24" y="40" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fontWeight="700" fill="#777965" letterSpacing="1">
            SAMPLE – NOT A REAL LICENCE
          </text>

          {/* Chip placeholder */}
          <rect x="24" y="60" width="48" height="38" rx="4" fill="#d8d3c5" stroke="#b7b0a3" strokeWidth="1" />

          {/* Details */}
          <text x="90" y="75" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fill="#5a5c56">LICENCE NUMBER</text>
          <text x="90" y="95" fontFamily="'IBM Plex Mono', monospace" fontSize="16" fontWeight="700" fill="#171815">
            DEMO-••••-1234
          </text>

          <text x="24" y="135" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fill="#5a5c56">CATEGORY</text>
          <text x="24" y="152" fontFamily="'IBM Plex Sans', sans-serif" fontSize="13" fontWeight="600" fill="#242522">LMV / TWO-WHEELER</text>

          <text x="24" y="185" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fill="#5a5c56">STATUS</text>
          <text x="24" y="205" fontFamily="'IBM Plex Sans', sans-serif" fontSize="14" fontWeight="700" fill="#2e5328">
            Safe (Renewed online – {expiryDaysBefore}d before expiry)
          </text>
        </svg>
      </div>

      {/* Static Annotations for Fallback/Mobile */}
      <div className={styles.fallbackAnnotations}>
        <div className={styles.annotationItem}>
          <span className={styles.annotationStep}>1. Heard Transcript</span>
          <span className={styles.annotationText}>Heard: "kay ay oh three…"</span>
        </div>
        <div className={styles.annotationItem}>
          <span className={styles.annotationStep}>2. Phonetic Correction</span>
          <span className={styles.annotationText}>O changed to 0 – the RTO part must be digits</span>
        </div>
        <div className={styles.annotationItem}>
          <span className={styles.annotationStep}>3. Ordered Plan</span>
          <span className={styles.annotationText}>
            Licence renewed online – Safe, {expiryDaysBefore} days before expiry (SIMULATED)
          </span>
        </div>
      </div>
    </div>
  );
};
