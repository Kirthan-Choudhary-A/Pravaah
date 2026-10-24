import React from 'react';
import { SITE_CONFIG } from '@config/site.config';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer" role="contentinfo">
      <p>{SITE_CONFIG.simulatedNotice}</p>
    </footer>
  );
};
