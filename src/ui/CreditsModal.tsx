import { useId, useRef, type MouseEvent, type RefObject } from 'react';
import type {
  CoverageMatrix,
  Manifest,
  MetadataDocument,
} from '../core/schema/anatomy';
import { useDialogFocus } from './useDialogFocus';
import styles from './CreditsModal.module.css';

const DEFAULT_LICENSE_URL =
  'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en';

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
 * exibe integralmente a atribuição obrigatória BodyParts3D (CC BY-SA 2.1 JP),
 * modificações realizadas, versões ativas do manifesto, escopo regional honesto
 * (22 estruturas da cintura escapular e membro superior), status pending_review
 * e aviso educacional explícito.
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

  const assetVersion = manifest?.assetVersion ?? 'v1';
  const metadataVersion = manifest?.metadataVersion ?? 'v1';
  const coverageMatrixVersion = manifest?.coverageMatrixVersion ?? 'v1';
  const licenseUrl = manifest?.license.licenseUrl ?? DEFAULT_LICENSE_URL;
  const terminologyReference =
    metadata?.terminologyReference ?? 'Terminologia Anatomica (TA2) / PT-BR';

  const presentStructures =
    coverageMatrix?.structures.filter((item) => item.presentInAsset) ?? null;
  const totalStructures = presentStructures ? presentStructures.length : 22;
  const skeletalCount = presentStructures
    ? presentStructures.filter((item) => item.system === 'skeletal').length
    : 10;
  const muscularCount = presentStructures
    ? presentStructures.filter((item) => item.system === 'muscular').length
    : 12;

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
              <em>
                BodyParts3D, Copyright © 2008 Life Science Integrated Database Center
                (DBCLS)
              </em>
              , licenciados sob{' '}
              <strong>
                Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)
              </strong>
              .
            </p>
            <p className={styles.paragraph}>
              <strong>Modificações realizadas nesta versão ({assetVersion}):</strong>{' '}
              recorte regional da cintura escapular e membro superior bilateral (36
              malhas), conversão de coordenadas para glTF 2.0 (Y-up em metros), soldagem
              de vértices, recálculo de normais, simplificação geométrica e compressão
              Meshopt. Os arquivos <code>.glb</code> resultantes são disponibilizados sob
              termos compatíveis <strong>CC BY-SA 2.1 JP</strong>.
            </p>
            <div>
              <a
                href={licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.licenseLink}
              >
                Consultar licença CC BY-SA 2.1 JP ({licenseUrl})
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
            <p className={styles.paragraph}>
              <strong>Escopo anatômico desta versão ({assetVersion}):</strong> exibe
              exclusivamente {totalStructures} estruturas ({skeletalCount} ossos e{' '}
              {muscularCount} músculos) da cintura escapular e do membro superior
              bilateral, conforme a matriz de cobertura publicada.
            </p>
            <p className={`${styles.paragraph} ${styles.secondaryText}`}>
              Não contempla ossos da mão, manguito rotador, cabeça, coluna vertebral,
              caixa torácica óssea, abdome ou membros inferiores nesta versão regional.
            </p>
            <p className={styles.paragraph}>
              <strong>Status de revisão científica atual:</strong> pendente de validação
              por revisor anatômico{' '}
              <span className={styles.reviewBadge}>pending_review</span>.
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
