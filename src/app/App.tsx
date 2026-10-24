import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { IntroGate } from '@features/intro/IntroGate';
import '@styles/globals.css';

const router = createBrowserRouter(routes);

export const App: React.FC = () => {
  return (
    <IntroGate>
      <RouterProvider router={router} />
    </IntroGate>
  );
};

export default App;
