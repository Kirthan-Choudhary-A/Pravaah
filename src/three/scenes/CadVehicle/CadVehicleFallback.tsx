import React from 'react';

/** Line drawing of the bike for devices without WebGL, and for reduced-motion contexts. */
export const CadVehicleFallback: React.FC<{ readonly label?: string }> = ({
  label = 'Technical drawing of a two-wheeler',
}) => (
  <svg
    viewBox="0 0 520 300"
    role="img"
    aria-label={label}
    style={{ width: '100%', height: '100%', display: 'block' }}
  >
    <defs>
      <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#e2c27d" strokeOpacity="0.12" />
      </pattern>
    </defs>
    <rect width="520" height="300" fill="url(#cad-grid)" />
    <g fill="none" stroke="#e2c27d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="130" cy="205" r="62" />
      <circle cx="130" cy="205" r="46" strokeOpacity="0.6" />
      <circle cx="400" cy="205" r="62" />
      <circle cx="400" cy="205" r="46" strokeOpacity="0.6" />
      <path d="M130 205L205 128L330 118L378 160" />
      <path d="M205 128L275 205L205 205" />
      <path d="M205 128L170 118L120 118L100 135" />
      <path d="M330 118L360 78L378 70M360 78L335 78" />
      <path d="M378 160L400 205" />
      <path d="M232 100Q268 84 312 98L318 118L226 120Z" />
      <path d="M150 112H215" strokeWidth="5" />
      <path d="M70 215H190" strokeOpacity="0.7" />
    </g>
    <g stroke="#e2c27d" strokeOpacity="0.55" strokeWidth="1" fill="none">
      <path d="M68 276H462M68 270V282M462 270V282" />
    </g>
    <text x="265" y="268" fill="#e2c27d" fillOpacity="0.75" fontSize="12" textAnchor="middle" fontFamily="monospace">
      1.90 m
    </text>
  </svg>
);
