import { useEffect, useRef } from 'react';
import type { StructureMetadata } from '../core/schema/anatomy';
import {
  formatLateralityChip,
  formatSystemLabel,
  type LabelDomElements,
} from './types';
import styles from './AnatomyLabel.module.css';

export interface AnatomyLabelProps {
  readonly structure: StructureMetadata | null;
  readonly isPinned: boolean;
  readonly onClose: () => void;
  readonly onAttachElements?: (elements: LabelDomElements | null) => void;
  readonly managedByProjector?: boolean;
}

/**
 * Etiqueta 2D projetada sobre o viewport 3D (ADR-005 e Seção 3.2 de UX).
 * Mantém os nós DOM (cartão, linha e ponto marcador) sempre montados para
 * atualização imperativa a 60 FPS pelo LabelProjector sem flicker nem reflow.
 */
export function AnatomyLabel({
  structure,
  isPinned,
  onClose,
  onAttachElements,
  managedByProjector = true,
}: AnatomyLabelProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<SVGLineElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    if (!onAttachElements) {
      return undefined;
    }
    const cardElement = cardRef.current;
    if (!cardElement) {
      return undefined;
    }

    onAttachElements({
      cardElement,
      lineElement: lineRef.current,
      dotElement: dotRef.current,
    });

    return () => {
      onAttachElements(null);
    };
  }, [onAttachElements]);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement || managedByProjector) {
      return;
    }
    // Em modo fallback estático (sem WebGL) ou testes isolados, limpa estilos imperativos
    cardElement.style.removeProperty('transform');
    cardElement.style.removeProperty('visibility');
  }, [managedByProjector, structure]);

  const isActive = structure !== null;
  const showCloseButton = isActive && isPinned;
  const isFallbackStatic = isActive && !managedByProjector;

  const overlayClasses = [
    styles.overlay,
    isFallbackStatic ? styles.overlayFallback : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardClasses = [
    styles.card,
    isActive && isPinned ? styles.cardPinned : '',
    isFallbackStatic ? styles.cardStatic : '',
    !isActive ? styles.cardHidden : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClasses}
      data-testid="anatomy-label-overlay"
      data-fallback-static={isFallbackStatic ? 'true' : 'false'}
    >
      {managedByProjector ? (
        <svg className={styles.connectorSvg} aria-hidden="true">
          <line
            ref={lineRef}
            className={styles.connectorLine}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
          />
          <circle
            ref={dotRef}
            className={styles.connectorDot}
            cx="0"
            cy="0"
            r="3"
          />
        </svg>
      ) : null}

      <div
        ref={cardRef}
        className={cardClasses}
        role="region"
        aria-label="Estrutura anatômica identificada"
        aria-hidden={!isActive}
        data-testid="anatomy-label-card"
        data-active={isActive ? 'true' : 'false'}
        data-pinned={showCloseButton ? 'true' : 'false'}
        data-anatomy-id={structure?.anatomyId ?? ''}
      >
        {structure ? (
          <>
            <div className={styles.headerRow}>
              <div className={styles.titles}>
                <p className={styles.namePt}>{structure.displayName['pt-BR']}</p>
                <p className={styles.nameLa} lang="la">
                  {structure.displayName.la}
                </p>
              </div>
              {showCloseButton ? (
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="Fechar etiqueta"
                  onClick={onClose}
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>

            <div className={styles.metaRow}>
              <span className={styles.chip}>
                <span
                  className={`${styles.systemDot} ${
                    structure.system === 'muscular'
                      ? styles.systemDotMuscular
                      : styles.systemDotSkeletal
                  }`}
                  aria-hidden="true"
                />
                {formatSystemLabel(structure.system)}
              </span>
              <span className={`${styles.chip} ${styles.chipLaterality}`}>
                {formatLateralityChip(structure.laterality)}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
