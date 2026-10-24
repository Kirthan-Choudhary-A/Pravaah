import React from 'react';
import { NavLink } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';

export const Header: React.FC = () => {
  return (
    <header className="site-header" role="banner">
      <nav className="site-nav" aria-label="Main navigation">
        <span className="brand-title">{SITE_CONFIG.name}</span>
        <div className="nav-links">
          {SITE_CONFIG.routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={route.path === '/'}
            >
              {route.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
};
