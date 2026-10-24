import React, { useMemo, useState } from 'react';
import { ReactFlow, Controls, Background, MarkerType, type Node, type Edge } from '@xyflow/react';
import type { ScheduledTask, Link, LinkType } from '@engine/model/types';
import { StatusTag } from '@components/ui/StatusTag';
import styles from './DependencyGraph.module.css';

export interface DependencyGraphProps {
  readonly tasks: readonly ScheduledTask[];
  readonly links: readonly Link[];
  readonly selectedTaskId?: string | null;
  readonly onSelectTask: (taskId: string) => void;
  readonly className?: string;
}

const EDGE_STYLES: Record<
  LinkType,
  {
    stroke: string;
    strokeDasharray?: string;
    label: string;
    markerEnd?: { type: MarkerType; color: string };
  }
> = {
  needs: {
    stroke: 'var(--graphite)',
    label: 'needs',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#242522' },
  },
  unlocks: {
    stroke: 'var(--graphite)',
    strokeDasharray: '8, 4',
    label: 'unlocks',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#242522' },
  },
  reuses: {
    stroke: 'var(--olive)',
    strokeDasharray: '2, 4',
    label: 'reuses',
    markerEnd: { type: MarkerType.Arrow, color: '#777965' },
  },
  propagates: {
    stroke: 'var(--iron)',
    strokeDasharray: '6, 3, 2, 3',
    label: 'propagates to',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5A5C56' },
  },
  invalidates: {
    stroke: 'var(--status-missed)',
    strokeDasharray: '4, 4',
    label: '✕ invalidates',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#962828' },
  },
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  tasks,
  links,
  selectedTaskId,
  onSelectTask,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  // Compute layered columns (topological layout)
  const { nodes, edges } = useMemo(() => {
    // Build adjacency for precedence links
    const incomingPrecedence = new Map<string, string[]>();
    for (const t of tasks) {
      incomingPrecedence.set(t.id, []);
    }

    for (const l of links) {
      if (l.type === 'needs' || l.type === 'unlocks') {
        const cur = incomingPrecedence.get(l.to);
        if (cur) cur.push(l.from);
      }
    }

    // Assign layers by longest path
    const layers = new Map<string, number>();
    const getLayer = (id: string, visited = new Set<string>()): number => {
      if (layers.has(id)) return layers.get(id)!;
      if (visited.has(id)) return 0; // Avoid cycles

      visited.add(id);
      const preds = incomingPrecedence.get(id) || [];
      if (preds.length === 0) {
        layers.set(id, 0);
        return 0;
      }

      let maxPredLayer = 0;
      for (const p of preds) {
        maxPredLayer = Math.max(maxPredLayer, getLayer(p, new Set(visited)) + 1);
      }
      layers.set(id, maxPredLayer);
      return maxPredLayer;
    };

    for (const t of tasks) {
      getLayer(t.id);
    }

    // Group tasks by layer
    const layerGroups = new Map<number, ScheduledTask[]>();
    for (const t of tasks) {
      const l = layers.get(t.id) ?? 0;
      if (!layerGroups.has(l)) layerGroups.set(l, []);
      layerGroups.get(l)!.push(t);
    }

    // Generate flow nodes
    const flowNodes: Node[] = [];
    const layerKeys = Array.from(layerGroups.keys()).sort((a, b) => a - b);

    for (const layer of layerKeys) {
      const group = layerGroups.get(layer) || [];
      group.forEach((task, indexInLayer) => {
        const isSelected = selectedTaskId === task.id;
        const normStatus = task.status.toLowerCase().replace(/\s+/g, '-');
        const nodeStatusStyle = styles[`nodeStatus_${normStatus}`] ?? '';

        flowNodes.push({
          id: task.id,
          position: {
            x: layer * 280 + 30,
            y: indexInLayer * 130 + 30,
          },
          data: {
            label: (
              <div
                className={`${styles.nodeCard ?? ''} ${
                  isSelected ? (styles.nodeSelected ?? '') : ''
                } ${nodeStatusStyle}`}
                onClick={() => onSelectTask(task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTask(task.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Task: ${task.name}. Status: ${task.status}. Lane: ${task.lane}.`}
              >
                <div className={styles.nodeHeader}>
                  <span className={styles.nodeLane}>{task.lane}</span>
                  <StatusTag status={task.status} size="sm" />
                </div>
                <div className={styles.nodeTitle}>{task.name}</div>
                <div className={styles.nodeFooter}>
                  <span>
                    D{task.start}→D{task.end}
                  </span>
                  <span>LSD: D{task.lsd}</span>
                </div>
              </div>
            ),
          },
          selectable: true,
        });
      });
    }

    // Generate flow edges
    const flowEdges: Edge[] = links.map((link, idx) => {
      const styleConfig = EDGE_STYLES[link.type] || EDGE_STYLES.needs;
      return {
        id: `e-${link.from}-${link.to}-${link.type}-${idx}`,
        source: link.from,
        target: link.to,
        type: 'smoothstep',
        animated: link.type === 'invalidates',
        label: styleConfig.label,
        labelStyle: {
          fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)',
          fill: styleConfig.stroke,
        },
        labelBgStyle: {
          fill: 'var(--paper)',
          fillOpacity: 0.9,
          stroke: 'var(--stone)',
          strokeWidth: 1,
        },
        style: {
          stroke: styleConfig.stroke,
          strokeWidth: 1.5,
          ...(styleConfig.strokeDasharray ? { strokeDasharray: styleConfig.strokeDasharray } : {}),
        },
        ...(styleConfig.markerEnd ? { markerEnd: styleConfig.markerEnd } : {}),
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [tasks, links, selectedTaskId, onSelectTask]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.toolbar}>
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Link Types:</span>
          <span className={styles.legendItem}>
            <span className={styles.lineNeeds} /> needs
          </span>
          <span className={styles.legendItem}>
            <span className={styles.lineUnlocks} /> unlocks
          </span>
          <span className={styles.legendItem}>
            <span className={styles.lineReuses} /> reuses
          </span>
          <span className={styles.legendItem}>
            <span className={styles.linePropagates} /> propagates
          </span>
          <span className={styles.legendItem}>
            <span className={styles.lineInvalidates} /> invalidates
          </span>
        </div>

        <div className={styles.viewToggleGroup}>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${
              viewMode === 'graph' ? (styles.viewBtnActive ?? '') : ''
            }`}
            onClick={() => setViewMode('graph')}
            aria-pressed={viewMode === 'graph'}
          >
            Graph View
          </button>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${
              viewMode === 'list' ? (styles.viewBtnActive ?? '') : ''
            }`}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
          >
            Links as List
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className={styles.linksListContainer}>
          <h4 className={styles.listHeading}>
            Dependency and Consequence Registry ({links.length} links)
          </h4>
          <ul className={styles.linksList} aria-label="Task dependencies list">
            {links.map((link, idx) => {
              const fromTask = taskMap.get(link.from);
              const toTask = taskMap.get(link.to);
              const styleConfig = EDGE_STYLES[link.type] || EDGE_STYLES.needs;

              return (
                <li key={`${link.from}-${link.to}-${link.type}-${idx}`} className={styles.linkItem}>
                  <div className={styles.linkHeader}>
                    <button
                      type="button"
                      className={styles.linkTaskBtn}
                      onClick={() => onSelectTask(link.from)}
                    >
                      {fromTask?.name ?? link.from}
                    </button>
                    <span className={styles.linkTypeBadge} style={{ color: styleConfig.stroke }}>
                      ── [{link.type}] ──▶
                    </span>
                    <button
                      type="button"
                      className={styles.linkTaskBtn}
                      onClick={() => onSelectTask(link.to)}
                    >
                      {toTask?.name ?? link.to}
                    </button>
                  </div>
                  <p className={styles.linkReason}>{link.reason}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div
          className={styles.graphContainer}
          role="region"
          aria-label="Dependency graph visualization"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--stone)" gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};
