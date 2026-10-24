import React from 'react';
import type { RouteObject } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { PlanProvider } from '@state/index';
import { ErrorBoundary } from '@components/feedback/ErrorBoundary';
import { StoryPage } from '@features/story/StoryPage';
import { PlannerPage } from '@features/planner/PlannerPage';
import { SimulatorPage } from '@features/simulator/SimulatorPage';
import { HouseholdPage } from '@features/household/HouseholdPage';
import { VoicePage } from '@features/voice/VoicePage';
import { SourcesPage } from '@features/sources/SourcesPage';
import { MetricsPage } from '@features/metrics/MetricsPage';
import { NotFoundPage } from '@components/feedback/NotFoundPage';

const Root: React.FC = () => {
  return (
    <PlanProvider>
      <ErrorBoundary fallbackTitle="Pravaah Assistant Error">
        <Layout />
      </ErrorBoundary>
    </PlanProvider>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <StoryPage /> },
      { path: 'plan', element: <PlannerPage /> },
      { path: 'simulate', element: <SimulatorPage /> },
      { path: 'household', element: <HouseholdPage /> },
      { path: 'voice', element: <VoicePage /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: 'metrics', element: <MetricsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
