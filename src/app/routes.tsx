import type { RouteObject } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { StoryPage } from '@features/story/StoryPage';
import { PlannerPage } from '@features/planner/PlannerPage';
import { SimulatorPage } from '@features/simulator/SimulatorPage';
import { HouseholdPage } from '@features/household/HouseholdPage';
import { VoicePage } from '@features/voice/VoicePage';
import { SourcesPage } from '@features/sources/SourcesPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <StoryPage /> },
      { path: 'plan', element: <PlannerPage /> },
      { path: 'simulate', element: <SimulatorPage /> },
      { path: 'household', element: <HouseholdPage /> },
      { path: 'voice', element: <VoicePage /> },
      { path: 'sources', element: <SourcesPage /> },
    ],
  },
];
