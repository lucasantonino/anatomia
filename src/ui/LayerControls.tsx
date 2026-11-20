import { useId, type ChangeEvent, type RefObject } from 'react';
import {
  MUSCLE_GHOST_OPACITY_THRESHOLD,
  type LayerMode,
  type QualityMode,
} from '../core/state/viewerStore';
import styles from './LayerControls.module.css';

export interface LayerControlsProps {
  readonly layerMode: LayerMode;
  readonly musclesVisible: boolean;
  readonly muscleOpacity: number;
  readonly qualityMode: QualityMode;
  readonly drawerDesktopOpen?: boolean;
  readonly dockRef?: RefObject<HTMLElement | null>;
  readonly onLayerModeChange: (mode: LayerMode) => void;
  readonly onToggleMuscles: () => void;
  readonly onMuscleOpacityChange: (opacity: number) => void;
  readonly onResetView: () => void;
  readonly onQualityModeChange: (mode: QualityMode) => void;
}

const LAYER_OPTIONS: ReadonlyArray<{
  readonly mode: LayerMode;
  readonly label: string;
  readonly dotClass: string | undefined;
}> = [
  { mode: 'muscular', label: 'Músculos', dotClass: styles.indicatorMuscle },
  { mode: 'skeletal', label: 'Ossos', dotClass: styles.indicatorBone },
  { mode: 'both', label: 'Ambos', dotClass: styles.indicatorBoth },
];

/**
 * Barra inferior de controles de camadas, opacidade experimental muscular,
 * redefinição de vista e qualidade gráfica (ADR-006 e Seção 3.1 de UX).
 */
export function LayerControls({
  layerMode,
  musclesVisible,
  muscleOpacity,
  qualityMode,
  drawerDesktopOpen = false,
  dockRef,
  onLayerModeChange,
  onToggleMuscles,
  onMuscleOpacityChange,
  onResetView,
  onQualityModeChange,
}: LayerControlsProps) {
  const opacitySliderId = useId();
  const opacityPercent = Math.round(muscleOpacity * 100);
  const showOpacityControl = layerMode === 'both';
  const isGhostMode =
    showOpacityControl && muscleOpacity <= MUSCLE_GHOST_OPACITY_THRESHOLD;

  const handleOpacityInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const percentValue = Number(event.target.value);
    if (!Number.isNaN(percentValue)) {
      onMuscleOpacityChange(percentValue / 100);
    }
  };

  const nextQualityMode: QualityMode = qualityMode === 'auto' ? 'reduced' : 'auto';
  const qualityLabelFull =
    qualityMode === 'auto' ? 'Automática' : 'Reduzida';
  const qualityLabelCompact = qualityMode === 'auto' ? 'Auto' : 'Red.';

  return (
    <section
      ref={dockRef}
      className={`${styles.dock} ${drawerDesktopOpen ? styles.dockWithDrawer : ''}`}
      aria-label="Controles de visualização anatômica"
      data-testid="layer-controls"
    >
      <div className={styles.topControlsRow}>
        <div
          className={styles.segmentedGroup}
          role="group"
          aria-label="Camadas anatômicas"
        >
          {LAYER_OPTIONS.map((option) => {
            const isActive = layerMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                className={`${styles.segmentButton} ${
                  isActive ? styles.segmentButtonActive : ''
                }`}
                aria-pressed={isActive}
                onClick={() => onLayerModeChange(option.mode)}
              >
                <span
                  className={`${styles.indicator ?? ''} ${option.dotClass ?? ''}`}
                  aria-hidden="true"
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.controlButton} ${styles.toggleButton} ${
              musclesVisible ? styles.toggleButtonActive : ''
            }`}
            aria-pressed={musclesVisible}
            onClick={onToggleMuscles}
          >
            <span
              className={`${styles.togglePill} ${
                musclesVisible ? styles.togglePillActive : ''
              }`}
              aria-hidden="true"
            />
            <span>Mostrar músculos</span>
            <span className={styles.toggleStateBadge} aria-hidden="true">
              {musclesVisible ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.controlButton} ${styles.compactButton}`}
            aria-label="Redefinir visão"
            onClick={onResetView}
          >
            <span aria-hidden="true">↺</span>
            <span>
              Redefinir{' '}
              <span className={styles.labelFullOnly}>visão</span>
            </span>
          </button>

          <button
            type="button"
            className={`${styles.controlButton} ${styles.compactButton}`}
            aria-label={`Qualidade: ${qualityLabelFull}. Alternar para ${
              nextQualityMode === 'reduced' ? 'Reduzida' : 'Automática'
            }`}
            aria-pressed={qualityMode === 'reduced'}
            onClick={() => onQualityModeChange(nextQualityMode)}
          >
            <span className={styles.labelCompactOnly} aria-hidden="true">
              Qual.: {qualityLabelCompact}
            </span>
            <span className={styles.labelFullOnly}>
              Qualidade: {qualityLabelFull}
            </span>
          </button>
        </div>
      </div>

      {showOpacityControl ? (
        <div className={styles.opacitySection}>
          <div className={styles.opacityRow}>
            <label htmlFor={opacitySliderId} className={styles.opacityLabel}>
              Opacidade{' '}
              <span className={styles.labelFullOnly}>dos músculos</span>
            </label>
            <input
              id={opacitySliderId}
              type="range"
              className={styles.rangeInput}
              aria-label="Opacidade dos músculos"
              min={15}
              max={100}
              step={5}
              value={opacityPercent}
              aria-valuemin={15}
              aria-valuemax={100}
              aria-valuenow={opacityPercent}
              aria-valuetext={`${opacityPercent}%`}
              onChange={handleOpacityInput}
            />
            <output htmlFor={opacitySliderId} className={styles.opacityValue}>
              {opacityPercent}%
            </output>
          </div>

          {isGhostMode ? (
            <p className={styles.ghostHint} data-testid="muscle-ghost-hint">
              Seleção direta de ossos ativa (músculos translúcidos)
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
