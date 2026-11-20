import type { AnatomySystem } from '../core/schema/anatomy';
import type { ViewerLoadState, WebGLStatus } from '../core/state/viewerStore';
import styles from './StatusOverlay.module.css';

export interface StatusOverlayProps {
  readonly webglStatus: WebGLStatus;
  readonly loadState: ViewerLoadState;
  readonly onRetrySystem: (system: AnatomySystem) => void;
  readonly onRetryAll: () => void;
  readonly onOpenDrawer: () => void;
  readonly onReloadPage?: () => void;
}

/**
 * Feedback de carregamento progressivo, falhas parciais/totais com retry
 * e fallback gracioso sem WebGL 2 (Seção 3.4 de docs/ux-interacao-e-acessibilidade.md).
 */
export function StatusOverlay({
  webglStatus,
  loadState,
  onRetrySystem,
  onRetryAll,
  onOpenDrawer,
  onReloadPage,
}: StatusOverlayProps) {
  const handleReload = (): void => {
    if (onReloadPage) {
      onReloadPage();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (webglStatus === 'unsupported') {
    return (
      <div
        className={styles.blockingOverlay}
        data-testid="status-webgl-unsupported"
      >
        <section
          className={`${styles.card} ${styles.cardWarning}`}
          role="alert"
          aria-labelledby="status-webgl-unsupported-title"
        >
          <h2
            id="status-webgl-unsupported-title"
            className={`${styles.cardTitle} ${styles.cardTitleWarning}`}
          >
            Visualização 3D indisponível neste dispositivo
          </h2>
          <p className={styles.cardText}>
            Este navegador ou dispositivo não oferece suporte aos recursos gráficos
            necessários para exibir o modelo 3D interativo. Verifique se a aceleração
            gráfica está ativada nas configurações ou utilize um navegador atualizado.
          </p>
          <p className={styles.cardText}>
            Você ainda pode consultar e pesquisar todas as 22 estruturas anatômicas
            desta versão na lista textual.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onOpenDrawer}
            >
              Abrir lista de estruturas
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (webglStatus === 'context_lost') {
    return (
      <div
        className={styles.blockingOverlay}
        data-testid="status-webgl-context-lost"
      >
        <section
          className={`${styles.card} ${styles.cardWarning}`}
          role="alert"
          aria-labelledby="status-webgl-lost-title"
        >
          <h2
            id="status-webgl-lost-title"
            className={`${styles.cardTitle} ${styles.cardTitleWarning}`}
          >
            Visualização 3D interrompida temporariamente
          </h2>
          <p className={styles.cardText}>
            O recurso gráfico do navegador foi reiniciado. Aguarde a restauração
            automática ou recarregue a página para retomar o estudo em 3D.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleReload}
            >
              Recarregar página
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onOpenDrawer}
            >
              Abrir lista de estruturas
            </button>
          </div>
        </section>
      </div>
    );
  }

  const { manifest, skeletal, muscular } = loadState;
  const isTotalError =
    manifest === 'error' ||
    (skeletal.status === 'error' && muscular.status === 'error');

  if (isTotalError) {
    return (
      <div className={styles.blockingOverlay} data-testid="status-total-error">
        <section
          className={`${styles.card} ${styles.cardError}`}
          role="alert"
          aria-labelledby="status-total-error-title"
        >
          <h2
            id="status-total-error-title"
            className={`${styles.cardTitle} ${styles.cardTitleError}`}
          >
            Não foi possível carregar o modelo anatômico
          </h2>
          <p className={styles.cardText}>
            Houve uma falha ao baixar ou validar os arquivos do atlas 3D. Verifique sua
            conexão com a internet e tente novamente.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onRetryAll}
            >
              Tentar novamente
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Carregamento inicial bloqueante apenas até o esqueleto (ou musculatura, se esqueleto falhou) estar pronto
  const hasAnySystemLoaded =
    skeletal.status === 'loaded' || muscular.status === 'loaded';

  if (!hasAnySystemLoaded) {
    const progressValue =
      manifest !== 'loaded'
        ? 10
        : skeletal.status === 'error'
          ? muscular.progress
          : Math.max(10, skeletal.progress);

    const stageLabel =
      skeletal.status === 'error'
        ? 'Carregando musculatura...'
        : 'Carregando esqueleto...';

    const stageSubtext =
      manifest !== 'loaded'
        ? 'Validando catálogo e metadados anatômicos.'
        : 'O esqueleto ficará interativo assim que concluir esta etapa.';

    return (
      <div
        className={styles.blockingOverlay}
        data-testid="status-initial-loading"
      >
        <section
          className={styles.card}
          aria-label="Carregamento inicial do atlas anatômico"
        >
          <div className={styles.progressHeader}>
            <h2 className={styles.cardTitle}>{stageLabel}</h2>
            <span className={styles.progressPercent}>{progressValue}%</span>
          </div>

          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={stageLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <p className={styles.cardText}>{stageSubtext}</p>
        </section>
      </div>
    );
  }

  // A partir daqui o esqueleto (ou musculatura) já está interativo: apenas feedback não-bloqueante
  const showMuscularBackgroundLoading =
    skeletal.status === 'loaded' &&
    (muscular.status === 'loading' || muscular.status === 'idle');

  const showMuscularPartialError =
    skeletal.status === 'loaded' && muscular.status === 'error';

  const showSkeletalPartialError =
    muscular.status === 'loaded' && skeletal.status === 'error';

  if (
    !showMuscularBackgroundLoading &&
    !showMuscularPartialError &&
    !showSkeletalPartialError
  ) {
    return null;
  }

  return (
    <div className={styles.topFloatingHost} data-testid="status-nonblocking">
      {showMuscularBackgroundLoading ? (
        <div
          className={styles.backgroundPill}
          role="progressbar"
          aria-label="Carregando musculatura"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={muscular.progress}
          data-testid="status-muscular-loading"
        >
          <span>Carregando musculatura...</span>
          <div className={styles.miniBarTrack} aria-hidden="true">
            <div
              className={styles.miniBarFill}
              style={{ width: `${muscular.progress}%` }}
            />
          </div>
          <span>{muscular.progress}%</span>
        </div>
      ) : null}

      {showMuscularPartialError ? (
        <div
          className={styles.partialBanner}
          role="alert"
          data-testid="status-partial-error-muscular"
        >
          <p className={styles.partialText}>
            <span className={styles.partialTag}>Aviso: </span>
            não foi possível carregar a camada muscular. O esqueleto permanece
            disponível para exploração.
          </p>
          <button
            type="button"
            className={styles.retryInlineButton}
            onClick={() => onRetrySystem('muscular')}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {showSkeletalPartialError ? (
        <div
          className={styles.partialBanner}
          role="alert"
          data-testid="status-partial-error-skeletal"
        >
          <p className={styles.partialText}>
            <span className={styles.partialTag}>Aviso: </span>
            não foi possível carregar a camada esquelética. A musculatura permanece
            disponível para exploração.
          </p>
          <button
            type="button"
            className={styles.retryInlineButton}
            onClick={() => onRetrySystem('skeletal')}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </div>
  );
}
