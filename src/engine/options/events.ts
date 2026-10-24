/**
 * Pure Event Applicator
 * Applies simulation events to plan inputs.
 */

import type { PlanInput, PlanningEvent } from '../model/types';

export function applyEvent(input: PlanInput, event: PlanningEvent): PlanInput {
  const currentEvents = input.events ? [...input.events] : [];
  currentEvents.push(event);

  let updatedScenario = { ...input.scenario };
  const updatedPack = { ...input.mergedPack };

  switch (event.type) {
    case 'unknownJurisdiction': {
      const targetState = event.targetState ?? 'SK';
      updatedScenario = {
        ...updatedScenario,
        move: {
          ...updatedScenario.move,
          toState: targetState,
          toRTO: `${targetState}-01`,
        },
      };
      break;
    }
    case 'slotCollapse': {
      const queueDays = event.queueDays ?? 28;
      updatedScenario = {
        ...updatedScenario,
        primarySlotQueue: queueDays,
      };
      break;
    }
    case 'tripExtended': {
      const extra = event.additionalDays ?? 7;
      updatedScenario = {
        ...updatedScenario,
        absence: {
          start: updatedScenario.absence.start,
          end: updatedScenario.absence.end + extra,
        },
      };
      break;
    }
    case 'formRejected':
    case 'aadhaarEarly':
    default:
      // These events are handled during task generation and scheduling via the events array
      break;
  }

  return {
    ...input,
    scenario: updatedScenario,
    mergedPack: updatedPack,
    events: currentEvents,
  };
}
