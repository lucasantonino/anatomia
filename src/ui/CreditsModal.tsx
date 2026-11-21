import { useId, useRef, type MouseEvent, type RefObject } from 'react';
import type {
  CoverageMatrix,
  Manifest,
  MetadataDocument,
  ReviewStatus,
} from '../core/schema/anatomy';
import { useDialogFocus } from './useDialogFocus';
import styles from './CreditsModal.module.css';

const DEFAULT_SOURCE_NAME = 'BodyParts3D (DBCLS)';
const DEFAULT_LICENSE_IDENTIFIER = 'CC-BY-SA-2.1-JP';
const DEFAULT_ATTRIBUTION_TEXT =
  'BodyParts3D, Copyright © 2008 Life Science Integrated Database Center (DBCLS), licenciado sob Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP).';
const DEFAULT_LICENSE_URL =
  'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en';

function formatLicenseIdentifier(spdxOrIdentifier: string): string {
  if (spdxOrIdentifier.startsWith('CC-BY-SA-')) {
    const suffix = spdxOrIdentifier.slice('CC-BY-SA-'.length).replace(/-/g, ' ');
    return `CC BY-SA ${suffix}`;
  }
  return spdxOrIdentifier;
}

export interface CreditsModalProps {
  readonly open: boolean;
  readonly manifest: Manifest | null;
  readonly metadata?: MetadataDocument | null;
  readonly coverageMatrix?: CoverageMatrix | null;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
}

/**
 * Modal "Créditos, Licenças e Escopo" (docs/dossie-licenciamento.md Seção 2):
 * exibe dinamicamente a atribuição obrigatória e licença do manifesto ativo,
 * modificações realizadas, versões ativas, declaração oficial de cobertura,
 * status de revisão científica derivado dos metadados e aviso educacional.
 */
export function CreditsModal({
  open,
  manifest,
  metadata = null,
  coverageMatrix = null,
  returnFocusRef,
  onClose,
}: CreditsModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    returnFocusRef,
    trapFocus: true,
    onClose,
  });

  if (!open) {
    return null;
  }

  const assetVersion =
    manifest?.assetVersion ??
    metadata?.assetVersion ??
    coverageMatrix?.assetVersion ??
    'v1';
  const metadataVersion =
    manifest?.metadataVersion ?? metadata?.metadataVersion ?? 'v1';
  const coverageMatrixVersion =
    manifest?.coverageMatrixVersion ??
    coverageMatrix?.coverageMatrixVersion ??
    'v1';
  const terminologyReference =
    metadata?.terminologyReference ?? 'Terminologia Anatomica (TA2) / PT-BR';

  const sourceName = manifest?.license.sourceName ?? DEFAULT_SOURCE_NAME;
  const licenseIdentifier =
    manifest?.license.spdxOrIdentifier ?? DEFAULT_LICENSE_IDENTIFIER;
  const licenseDisplay = formatLicenseIdentifier(licenseIdentifier);
  const attributionText =
    manifest?.license.attributionText ?? DEFAULT_ATTRIBUTION_TEXT;
  const licenseUrl = manifest?.license.licenseUrl ?? DEFAULT_LICENSE_URL;

  const totalMeshes = manifest
    ? manifest.systems.skeletal.meshCount + manifest.systems.muscular.meshCount
    : 0;

  const presentCoverageStructures =
    coverageMatrix?.structures.filter((item) => item.presentInAsset) ?? null;
  const countSource = presentCoverageStructures ?? metadata?.structures ?? null;

  const totalStructures = countSource ? countSource.length : 0;
  const skeletalCount = countSource
    ? countSource.filter((item) => item.system === 'skeletal').length
    : 0;
  const muscularCount = countSource
    ? countSource.filter((item) => item.system === 'muscular').length
    : 0;

  const reviewStatus: ReviewStatus =
    metadata &&
    metadata.structures.length > 0 &&
    metadata.structures.every((structure) => structure.review.status === 'approved')
      ? 'approved'
      : 'pending_review';

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="credits-modal-backdrop"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="credits-modal"
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Créditos, Licenças e Escopo
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            aria-label="Fechar janela de créditos e licenças"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section} aria-labelledby="credits-license-title">
            <h3 id="credits-license-title" className={styles.sectionTitle}>
              Atribuição obrigatória do ativo 3D
            </h3>
            <p className={styles.paragraph}>
              <strong>Modelos anatômicos 3D:</strong> derivados de{' '}
              <strong>{sourceName}</strong> — <em>{attributionText}</em> Licença:{' '}
              <strong>{licenseDisplay}</strong>.
            </p>
            <p className={styles.paragraph}>
              <strong>Modificações realizadas nesta versão ({assetVersion}):</strong>{' '}
              segmentação anatômica
              {totalMeshes > 0 ? ` (${totalMeshes} malhas)` : ''}, conversão de
              coordenadas para glTF 2.0 (Y-up em metros), soldagem de vértices,
              recálculo de normais, simplificação geométrica e compressão Meshopt. Os
              arquivos <code>.glb</code> resultantes são disponibilizados sob termos
              compatíveis <strong>{licenseDisplay}</strong>.
            </p>
            <div>
              <a
                href={licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.licenseLink}
              >
                Consultar licença {licenseDisplay} ({licenseUrl})
              </a>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="credits-versions-title">
            <h3 id="credits-versions-title" className={styles.sectionTitle}>
              Versões ativas e referência terminológica
            </h3>
            <dl className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <dt className={styles.metaTerm}>assetVersion</dt>
                <dd className={styles.metaValue}>{assetVersion}</dd>
              </div>
              <div className={styles.metaCard}>
                <dt className={styles.metaTerm}>metadataVersion</dt>
                <dd className={styles.metaValue}>{metadataVersion}</dd>
              </div>
              <div className={styles.metaCard}>
                <dt className={styles.metaTerm}>coverageMatrixVersion</dt>
                <dd className={styles.metaValue}>{coverageMatrixVersion}</dd>
              </div>
            </dl>
            <p className={`${styles.paragraph} ${styles.secondaryText}`}>
              Referência terminológica: {terminologyReference}.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="credits-scope-title">
            <h3 id="credits-scope-title" className={styles.sectionTitle}>
              Transparência de cobertura e revisão científica
            </h3>
            {totalStructures > 0 ? (
              <p className={styles.paragraph}>
                <strong>Escopo anatômico desta versão ({assetVersion}):</strong>{' '}
                contempla {totalStructures} estruturas ({skeletalCount} ossos e{' '}
                {muscularCount} músculos), conforme a matriz de cobertura publicada.
              </p>
            ) : (
              <p className={styles.paragraph}>
                <strong>Escopo anatômico desta versão ({assetVersion}):</strong>{' '}
                carregando declaração oficial da matriz de cobertura publicada.
              </p>
            )}
            {coverageMatrix?.scopeStatement ? (
              <p className={`${styles.paragraph} ${styles.secondaryText}`}>
                {coverageMatrix.scopeStatement}
              </p>
            ) : null}
            <p className={styles.paragraph}>
              <strong>Status de revisão científica atual:</strong>{' '}
              {reviewStatus === 'approved'
                ? 'validado por revisor anatômico'
                : 'pendente de validação por revisor anatômico'}{' '}
              <span
                className={`${styles.reviewBadge} ${
                  reviewStatus === 'approved' ? styles.reviewBadgeApproved : ''
                }`}
              >
                {reviewStatus}
              </span>
              .
            </p>
          </section>

          <section
            className={styles.educationalBox}
            aria-labelledby="credits-educational-title"
          >
            <h3 id="credits-educational-title" className={styles.educationalTitle}>
              Aviso educacional
            </h3>
            <p className={styles.paragraph}>
              O Anatomia 3D é uma ferramenta estritamente educacional e não constitui
              dispositivo médico, orientação clínica, diagnóstico ou substituto para
              ensino supervisionado e atlas anatômicos de referência.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
