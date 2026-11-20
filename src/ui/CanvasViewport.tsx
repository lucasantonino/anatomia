import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import type { StructureMetadata } from '../core/schema/anatomy';
import type { WebGLStatus } from '../core/state/viewerStore';
import { AnatomyLabel } from './AnatomyLabel';
import type { AnatomyEnginePort, LabelDomElements } from './types';
import styles from './CanvasViewport.module.css';

const KEYBOARD_ORBIT_STEP_RAD = Math.PI / 18;
const KEYBOARD_ZOOM_IN_FACTOR = 0.85;
const KEYBOARD_ZOOM_OUT_FACTOR = 1.18;

export interface CanvasViewportProps {
  readonly engine: AnatomyEnginePort;
  readonly activeStructure: StructureMetadata | null;
  readonly isPinned: boolean;
  readonly webglStatus: WebGLStatus;
  readonly onCloseLabel: () => void;
  readonly onResetView: () => void;
}

/**
 * Contêiner de tela cheia do visualizador WebGL 2 + controle completo de câmera
 * via teclado (WCAG 2.2 AA) e ancoragem estável da etiqueta 2D projetada.
 */
export function CanvasViewport({
  engine,
  activeStructure,
  isPinned,
  webglStatus,
  onCloseLabel,
  onResetView,
}: CanvasViewportProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const labelElementsRef = useRef<LabelDomElements | null>(null);

  const handleAttachLabelElements = useCallback(
    (elements: LabelDomElements | null) => {
      labelElementsRef.current = elements;
      engine.attachLabelElements(elements);
    },
    [engine],
  );

  useEffect(() => {
    const container = canvasHostRef.current;
    if (!container) {
      return undefined;
    }

    engine.mount(container, labelElementsRef.current);

    return () => {
      engine.dispose();
    };
  }, [engine]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Permite que botões internos (ex.: fechar etiqueta) tratem suas próprias teclas
      if (event.target !== event.currentTarget) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) {
            engine.nudgePan(-1, 0);
          } else {
            engine.nudgeOrbit(KEYBOARD_ORBIT_STEP_RAD, 0);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) {
            engine.nudgePan(1, 0);
          } else {
            engine.nudgeOrbit(-KEYBOARD_ORBIT_STEP_RAD, 0);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (event.shiftKey) {
            engine.nudgePan(0, 1);
          } else {
            engine.nudgeOrbit(0, -KEYBOARD_ORBIT_STEP_RAD);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (event.shiftKey) {
            engine.nudgePan(0, -1);
          } else {
            engine.nudgeOrbit(0, KEYBOARD_ORBIT_STEP_RAD);
          }
          break;
        case '+':
        case '=':
          event.preventDefault();
          engine.nudgeZoom(KEYBOARD_ZOOM_IN_FACTOR);
          break;
        case '-':
        case '_':
          event.preventDefault();
          engine.nudgeZoom(KEYBOARD_ZOOM_OUT_FACTOR);
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          event.stopPropagation();
          onResetView();
          break;
        default:
          break;
      }
    },
    [engine, onResetView],
  );

  const managedByProjector = webglStatus !== 'unsupported';

  return (
    <div
      className={styles.viewport}
      tabIndex={0}
      role="application"
      aria-roledescription="Visualizador 3D interativo"
      aria-label="Visualizador 3D de anatomia humana. Use as setas para orbitar, Shift com setas para deslocar, mais e menos para aproximar ou afastar, e R para redefinir a visão."
      onKeyDown={handleKeyDown}
      data-testid="canvas-viewport"
    >
      <div ref={canvasHostRef} className={styles.canvasHost} />

      <AnatomyLabel
        structure={activeStructure}
        isPinned={isPinned}
        onClose={onCloseLabel}
        onAttachElements={handleAttachLabelElements}
        managedByProjector={managedByProjector}
      />
    </div>
  );
}
