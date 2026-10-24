import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ScheduledTask, Link, AbsenceWindow, TaskLane } from '../../../engine/model/types';
import { StudioLighting } from '../../lighting/StudioLighting';
import type { QualityTier } from '../../../hooks/useDeviceCapabilities';

export interface PlanLandscapeSceneProps {
  readonly tasks: readonly ScheduledTask[];
  readonly links?: readonly Link[] | undefined;
  readonly absence?: AbsenceWindow | undefined;
  readonly primarySlotQueue?: number | undefined;
  readonly selectedTaskId?: string | null | undefined;
  readonly onSelectTask?: ((taskId: string) => void) | undefined;
  readonly tier?: QualityTier | undefined;
  readonly resetTrigger?: number | undefined;
}

// Lane Z positions and layout
const LANE_Z_POSITIONS: Record<TaskLane, number> = {
  licence: 0,
  vehicle: 2.0,
  identity: 4.0,
  household: 6.0,
};

// Desaturated material colors for 3D blocks matching status tokens
function getTaskColor(status: string, isHovered: boolean, isSelected: boolean): string {
  if (isSelected) return '#171815'; // Dark high-contrast focus
  const s = status.toLowerCase();
  if (s.includes('safe')) return isHovered ? '#3b6733' : '#33582b';
  if (s.includes('risk')) return isHovered ? '#8c590e' : '#7a4b00';
  if (s.includes('missed')) return isHovered ? '#b03232' : '#962828';
  return isHovered ? '#61635b' : '#52544e';
}

// Procedural hatched canvas texture for owner absence window
function createHatchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eae7dd';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#b7b0a3';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = -64; i < 128; i += 16) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function createLaneTitleTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#b7b0a3';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#242522';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, canvas.height / 2);
  }
  return new THREE.CanvasTexture(canvas);
}

function createTickTexture(tick: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#52544e';
    ctx.fillText(`D${tick}`, canvas.width / 2, canvas.height / 2);
  }
  return new THREE.CanvasTexture(canvas);
}

function createTaskLabelTexture(name: string, status: string, isSelected: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isSelected ? '#171815' : '#242522';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isSelected ? '#faf9f5' : '#88857d';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = '#faf9f5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const shortName = name.length > 20 ? `${name.slice(0, 18)}…` : name;
    ctx.fillText(shortName, 16, canvas.height / 2);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = status === 'Safe' ? '#69a35e' : status === 'At risk' ? '#df9b32' : '#e65e5e';
    ctx.textAlign = 'right';
    ctx.fillText(status.toUpperCase(), canvas.width - 16, canvas.height / 2);
  }
  return new THREE.CanvasTexture(canvas);
}

function createSlotMarkerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbf0da';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#7a4b00';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a4b00';
    ctx.fillText('FIRST RTO SLOT', canvas.width / 2, canvas.height / 2);
  }
  return new THREE.CanvasTexture(canvas);
}

export const PlanLandscapeScene: React.FC<PlanLandscapeSceneProps> = ({
  tasks,
  links = [],
  absence,
  primarySlotQueue,
  selectedTaskId,
  onSelectTask,
  tier = 'full',
  resetTrigger = 0,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const hatchTexture = useMemo(() => createHatchTexture(), []);
  const slotTexture = useMemo(() => createSlotMarkerTexture(), []);

  // Compute plan bounds
  const maxDay = useMemo(() => {
    let m = 35;
    tasks.forEach((t) => {
      if (t.end > m) m = t.end;
    });
    return m + 5;
  }, [tasks]);

  // Active lanes present in current tasks
  const activeLanes = useMemo(() => {
    const set = new Set<TaskLane>();
    tasks.forEach((t) => set.add(t.lane));
    return Array.from(set);
  }, [tasks]);

  // 5-day ticks
  const dayTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let d = 0; d <= maxDay; d += 5) {
      ticks.push(d);
    }
    return ticks;
  }, [maxDay]);

  // Lane Title Textures
  const laneTextures = useMemo(() => {
    const map = new Map<TaskLane, THREE.CanvasTexture>();
    activeLanes.forEach((lane) => {
      const label = lane === 'household' ? 'Household Lane' : `${lane} Lane`;
      map.set(lane, createLaneTitleTexture(label));
    });
    return map;
  }, [activeLanes]);

  // Day Tick Textures
  const tickTextures = useMemo(() => {
    const map = new Map<number, THREE.CanvasTexture>();
    dayTicks.forEach((d) => {
      map.set(d, createTickTexture(d));
    });
    return map;
  }, [dayTicks]);

  // Task Label Textures
  const taskLabelTextures = useMemo(() => {
    const map = new Map<string, { normal: THREE.CanvasTexture; selected: THREE.CanvasTexture }>();
    tasks.forEach((t) => {
      const status = t.end > (t.lsd ?? 999) ? 'Missed' : t.end === (t.lsd ?? 999) ? 'At risk' : 'Safe';
      map.set(t.id, {
        normal: createTaskLabelTexture(t.name, status, false),
        selected: createTaskLabelTexture(t.name, status, true),
      });
    });
    return map;
  }, [tasks]);

  // Clean up textures
  useEffect(() => {
    return () => {
      hatchTexture.dispose();
      slotTexture.dispose();
      laneTextures.forEach((t) => t.dispose());
      tickTextures.forEach((t) => t.dispose());
      taskLabelTextures.forEach((pair) => {
        pair.normal.dispose();
        pair.selected.dispose();
      });
    };
  }, [hatchTexture, slotTexture, laneTextures, tickTextures, taskLabelTextures]);

  // Reset view on trigger
  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(16, 22, 28);
      controlsRef.current.target.set(16, 0, 3);
      controlsRef.current.update();
    }
  }, [resetTrigger, camera]);

  return (
    <>
      <StudioLighting tier={tier} shadowOffset={-0.1} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[16, 0, 3]}
        minDistance={8}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.05} // Prevent going below floor
        enableDamping
        dampingFactor={0.06}
      />

      {/* Main Coordinate Grid: X = Days, Z = Lanes */}
      <group position={[0, 0, 0]}>
        {/* Floor Base Slab */}
        <mesh position={[maxDay / 2, -0.15, 3]} receiveShadow>
          <boxGeometry args={[maxDay + 4, 0.2, 10]} />
          <meshStandardMaterial color="#eae7dd" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Lane Slabs */}
        {activeLanes.map((lane) => {
          const zPos = LANE_Z_POSITIONS[lane];
          const laneTex = laneTextures.get(lane);

          return (
            <group key={lane} position={[0, 0, zPos]}>
              <mesh position={[maxDay / 2, -0.04, 0]} receiveShadow>
                <boxGeometry args={[maxDay + 2, 0.08, 1.8]} />
                <meshStandardMaterial color="#f3f0e8" roughness={0.8} metalness={0.05} />
              </mesh>

              {/* Lane title billboard */}
              {laneTex && (
                <mesh position={[-1.2, 0.15, 0]} rotation={[-Math.PI / 2.5, 0, 0]}>
                  <planeGeometry args={[2.2, 0.55]} />
                  <meshBasicMaterial map={laneTex} transparent />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Day Ticks on Floor */}
        {dayTicks.map((tick) => {
          const tickTex = tickTextures.get(tick);
          return (
            <group key={tick} position={[tick, 0, -1.2]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, activeLanes.length * 2.2 + 1]} />
                <meshBasicMaterial color="#b7b0a3" />
              </mesh>
              {tickTex && (
                <mesh position={[0, 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.8, 0.4]} />
                  <meshBasicMaterial map={tickTex} transparent />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Absence Hatch Window Band */}
        {absence && (
          <mesh
            position={[(absence.start + absence.end) / 2, 0.01, 1.5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[absence.end - absence.start, 6.5]} />
            <meshBasicMaterial map={hatchTexture} transparent opacity={0.65} />
          </mesh>
        )}

        {/* First RTO Slot Queue Marker Line */}
        {primarySlotQueue !== undefined && (
          <group position={[primarySlotQueue, 0.05, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.08, 1.6]} />
              <meshBasicMaterial color="#7a4b00" />
            </mesh>
            <mesh position={[0, 0.35, -0.6]} rotation={[-Math.PI / 3, 0, 0]}>
              <planeGeometry args={[1.6, 0.4]} />
              <meshBasicMaterial map={slotTexture} transparent />
            </mesh>
          </group>
        )}

        {/* Dependency Links (Curved Bezier Tubes) */}
        {links.map((link, idx) => {
          const fromTask = tasks.find((t) => t.id === link.from);
          const toTask = tasks.find((t) => t.id === link.to);
          if (!fromTask || !toTask) return null;

          const p1 = new THREE.Vector3(fromTask.end, 0.25, LANE_Z_POSITIONS[fromTask.lane]);
          const p2 = new THREE.Vector3(toTask.start, 0.25, LANE_Z_POSITIONS[toTask.lane]);
          const midX = (p1.x + p2.x) / 2;
          const height = Math.abs(p1.z - p2.z) > 0.1 ? 1.4 : 0.6;
          const midPoint = new THREE.Vector3(midX, height, (p1.z + p2.z) / 2);

          const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
          const points = curve.getPoints(24);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);

          const isInvalidates = link.type === 'invalidates';
          const linkColor = isInvalidates ? '#962828' : '#777965';
          const lineObj = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
              color: linkColor,
              transparent: true,
              opacity: 0.8,
            })
          );

          return (
            <primitive key={`${link.from}-${link.to}-${idx}`} object={lineObj} />
          );
        })}

        {/* 3D Task Rounded Blocks */}
        {tasks.map((task) => {
          const duration = Math.max(0.9, task.end - task.start);
          const xPos = task.start + duration / 2;
          const zPos = LANE_Z_POSITIONS[task.lane];
          const isSelected = selectedTaskId === task.id;
          const isHovered = hoveredTaskId === task.id;
          const status = task.end > (task.lsd ?? 999) ? 'Missed' : task.end === (task.lsd ?? 999) ? 'At risk' : 'Safe';
          const color = getTaskColor(status, isHovered, isSelected);

          const texPair = taskLabelTextures.get(task.id);
          const currentTex = isSelected ? texPair?.selected : texPair?.normal;

          return (
            <group
              key={task.id}
              position={[xPos, 0.25, zPos]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTask?.(task.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredTaskId(task.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredTaskId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              {/* Task box */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[duration, 0.45, 0.85]} />
                <meshStandardMaterial
                  color={color}
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>

              {/* Edge outline if selected or hovered */}
              {(isSelected || isHovered) && (
                <lineSegments position={[0, 0, 0]}>
                  <edgesGeometry args={[new THREE.BoxGeometry(duration + 0.04, 0.49, 0.89)]} />
                  <lineBasicMaterial
                    color={isSelected ? '#faf9f5' : '#b7b0a3'}
                  />
                </lineSegments>
              )}

              {/* Canvas Task Label above block */}
              {currentTex && (
                <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 3, 0, 0]}>
                  <planeGeometry args={[Math.max(1.8, duration * 0.9), 0.35]} />
                  <meshBasicMaterial map={currentTex} transparent />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
};
