import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-16) var(--space-4)',
        textAlign: 'center',
        maxWidth: '640px',
        margin: '0 auto',
        gap: 'var(--space-4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          letterSpacing: '0.1em',
          color: 'var(--terracotta)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        HTTP 404
      </span>
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--font-size-3xl)',
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--font-size-base)',
          color: 'var(--graphite)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        The requested path does not exist. All simulated vehicle and licence services
        are located within the primary application sections.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Link to="/">
          <Button variant="primary">Return to Story</Button>
        </Link>
        <Link to="/plan">
          <Button variant="secondary">Open Planner</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
