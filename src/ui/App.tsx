import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { AnatomySystem, StructureMetadata } from '../core/schema/anatomy';
import {
  deriveLayerMode,
  formatLateralityLabelPtBr,
  getActiveAnatomyId,
  isMusclesVisible,
  viewerStore,
  type LayerMode,
  type QualityMode,
  type ViewerStore,
} from '../core/state/viewerStore';
import { AnatomyEngine } from '../scene/AnatomyEngine';
import { CanvasViewport } from './CanvasViewport';
import { CreditsModal } from './CreditsModal';
import { HelpModal } from './HelpModal';
import { LayerControls } from './LayerControls';
import { StatusOverlay } from './StatusOverlay';
import { StructureDrawer } from './StructureDrawer';
import type { AnatomyEnginePort } from './types';
import styles from './App.module.css';

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

export interface AppProps {
  readonly store?: ViewerStore;
  readonly engine?: AnatomyEnginePort;
}

function getIsMobileViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }
  return window.innerWidth < 768;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName;
  if (tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (tagName === 'INPUT') {
    const inputType = (target as HTMLInputElement).type.toLowerCase();
    return inputType !== 'range' && inputType !== 'button' && inputType !== 'checkbox';
  }
  return false;
}

/**
 * Componente raiz do Anatomia 3D:
 * - Conecta a store única (`viewerStore`) e a fachada imperativa (`AnatomyEngine`)
 * - Sincroniza `safeInsets` do LabelProjector via ResizeObserver
 * - Gerencia atalhos globais (`Esc`, `R`), foco e região `aria-live="polite"`
 */
export function App({ store: storeProp, engine: engineProp }: AppProps = {}) {
  const activeStore = storeProp ?? viewerStore;

  const engineRef = useRef<AnatomyEnginePort | null>(null);
  if (engineRef.current === null) {
    engineRef.current = engineProp ?? new AnatomyEngine({ store: activeStore });
  }
  const activeEngine = engineProp ?? engineRef.current;

  const state = useSyncExternalStore(
    activeStore.subscribe,
    activeStore.getState,
    activeStore.getState,
  );
  const catalog = useSyncExternalStore(
    activeEngine.subscribeCatalog,
    activeEngine.getCatalogSnapshot,
    activeEngine.getCatalogSnapshot,
  );

  const [isMobile, setIsMobile] = useState<boolean>(getIsMobileViewport);

  const headerRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const creditsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateMatch = (): void => {
      setIsMobile(mediaQuery.matches);
    };
    updateMatch();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMatch);
      return () => {
        mediaQuery.removeEventListener('change', updateMatch);
      };
    }

    mediaQuery.addListener(updateMatch);
    return () => {
      mediaQuery.removeListener(updateMatch);
    };
  }, []);

  // Medição de safeInsets (header, dock inferior e gaveta lateral) via ResizeObserver
  useEffect(() => {
    const syncSafeInsets = (): void => {
      const viewportHeight =
        typeof window !== 'undefined' ? window.innerHeight : 720;
      const headerRect = headerRef.current?.getBoundingClientRect();
      const controlsRect = controlsRef.current?.getBoundingClientRect();
      const drawerRect =
        state.drawerOpen && !isMobile
          ? drawerRef.current?.getBoundingClientRect()
          : undefined;

      const top = Math.max(12, Math.round((headerRect?.bottom ?? 56) + 10));
      const controlsHeight = controlsRect
        ? Math.max(controlsRect.height, viewportHeight - controlsRect.top)
        : 108;
      const bottom = Math.max(12, Math.round(controlsHeight + 10));
      const right = Math.max(12, Math.round((drawerRect?.width ?? 0) + 12));

      activeEngine.setSafeInsets({
        top,
        right,
        bottom,
        left: 12,
      });
    };

    syncSafeInsets();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(syncSafeInsets);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }
    if (state.drawerOpen && !isMobile && drawerRef.current) {
      observer.observe(drawerRef.current);
    }

    window.addEventListener('resize', syncSafeInsets);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSafeInsets);
    };
  }, [activeEngine, state.drawerOpen, isMobile, state.visibleSystems, state.muscleOpacity]);

  const resolveSystem = useCallback(
    (anatomyId: string): AnatomySystem | undefined => {
      return catalog.registry.getById(anatomyId)?.system;
    },
    [catalog.registry],
  );

  const handleResetView = useCallback(() => {
    activeEngine.resetView();
    activeStore.announce('Vista anatômica redefinida.');
  }, [activeEngine, activeStore]);

  // Atalhos globais de teclado fora de campos de texto: Esc e R
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) {
        return;
      }

      const currentState = activeStore.getState();

      if (event.key === 'Escape') {
        if (currentState.helpOpen || currentState.creditsOpen) {
          event.preventDefault();
          activeStore.closeAllModals();
          return;
        }
        if (currentState.drawerOpen) {
          event.preventDefault();
          activeStore.setDrawerOpen(false);
          return;
        }
        if (currentState.selectedId !== null) {
          event.preventDefault();
          activeStore.clearSelection();
          activeStore.announce('Seleção removida.');
        }
        return;
      }

      if (
        (event.key === 'r' || event.key === 'R') &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !currentState.helpOpen &&
        !currentState.creditsOpen &&
        !isEditableKeyboardTarget(event.target)
      ) {
        event.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeStore, handleResetView]);

  const handleLayerModeChange = useCallback(
    (mode: LayerMode) => {
      activeStore.setLayerMode(mode, resolveSystem);
    },
    [activeStore, resolveSystem],
  );

  const handleToggleMuscles = useCallback(() => {
    activeStore.toggleMuscles(resolveSystem);
  }, [activeStore, resolveSystem]);

  const handleMuscleOpacityChange = useCallback(
    (opacity: number) => {
      activeStore.setMuscleOpacity(opacity);
    },
    [activeStore],
  );

  const handleQualityModeChange = useCallback(
    (mode: QualityMode) => {
      activeStore.setQualityMode(mode);
    },
    [activeStore],
  );

  const handleCloseLabel = useCallback(() => {
    activeStore.clearSelection();
    activeStore.announce('Etiqueta fechada.');
  }, [activeStore]);

  const handleSelectStructure = useCallback(
    (structure: StructureMetadata) => {
      const currentState = activeStore.getState();

      if (currentState.webglStatus === 'unsupported') {
        if (!currentState.visibleSystems.has(structure.system)) {
          activeStore.setLayerMode('both', resolveSystem);
        }
        const laterality = formatLateralityLabelPtBr(structure.laterality);
        activeStore.setSelectedId(
          structure.anatomyId,
          `Selecionado: ${structure.displayName['pt-BR']}, ${structure.displayName.la}, ${laterality}`,
          resolveSystem,
        );
        if (isMobile) {
          activeStore.setDrawerOpen(false);
        }
        return;
      }

      const result = activeStore.selectStructure(structure);
      if (result.selected) {
        activeEngine.focusStructure(structure.anatomyId);
        if (isMobile) {
          activeStore.setDrawerOpen(false);
        }
      }
    },
    [activeStore, activeEngine, isMobile, resolveSystem],
  );

  const handleRetrySystem = useCallback(
    (system: AnatomySystem) => {
      void activeEngine.retrySystem(system);
    },
    [activeEngine],
  );

  const handleRetryAll = useCallback(() => {
    void activeEngine.retryAll();
  }, [activeEngine]);

  const handleOpenDrawer = useCallback(() => {
    activeStore.setDrawerOpen(true);
  }, [activeStore]);

  const handleCloseDrawer = useCallback(() => {
    activeStore.setDrawerOpen(false);
  }, [activeStore]);

  const handleCloseHelp = useCallback(() => {
    activeStore.setHelpOpen(false);
  }, [activeStore]);

  const handleCloseCredits = useCallback(() => {
    activeStore.setCreditsOpen(false);
  }, [activeStore]);

  const layerMode = deriveLayerMode(state.visibleSystems);
  const musclesVisible = isMusclesVisible(state);
  const activeAnatomyId = getActiveAnatomyId(state);
  const activeStructure =
    activeAnatomyId !== null
      ? (catalog.registry.getById(activeAnatomyId) ?? null)
      : null;
  const isLabelPinned =
    state.selectedId !== null &&
    (state.hoveredId === null || state.hoveredId === state.selectedId);

  const drawerDesktopOpen = state.drawerOpen && !isMobile;
  const assetVersion = catalog.manifest?.assetVersion ?? 'v1';

  return (
    <div className={styles.shell}>
      <header
        ref={headerRef}
        className={`${styles.header} ${
          drawerDesktopOpen ? styles.headerWithDrawer : ''
        }`}
      >
        <div className={styles.brand}>
          <h1 className={styles.title}>Anatomia 3D</h1>
          <span
            className={styles.versionBadge}
            aria-label={`Versão ${assetVersion}`}
          >
            {assetVersion}
          </span>
        </div>

        <nav className={styles.nav} aria-label="Ações principais do atlas">
          <button
            ref={drawerTriggerRef}
            type="button"
            className={`${styles.headerButton} ${
              state.drawerOpen ? styles.headerButtonActive : ''
            }`}
            aria-label={
              state.drawerOpen
                ? 'Fechar lista de estruturas'
                : 'Abrir lista de estruturas'
            }
            aria-expanded={state.drawerOpen}
            aria-controls="structure-drawer-panel"
            onClick={() => activeStore.setDrawerOpen(!state.drawerOpen)}
          >
            <span className={styles.compactText} aria-hidden="true">
              Lista
            </span>
            <span className={styles.fullTextMobileHidden}>Estruturas</span>
          </button>

          <button
            ref={helpTriggerRef}
            type="button"
            className={`${styles.headerButton} ${styles.iconOnlyMobile} ${
              state.helpOpen ? styles.headerButtonActive : ''
            }`}
            aria-label="Como navegar"
            aria-haspopup="dialog"
            aria-expanded={state.helpOpen}
            onClick={() => activeStore.setHelpOpen(true)}
          >
            <span className={styles.iconGlyph} aria-hidden="true">
              ?
            </span>
            <span className={styles.desktopOnlyText}>Como navegar</span>
          </button>

          <button
            ref={creditsTriggerRef}
            type="button"
            className={`${styles.headerButton} ${styles.iconOnlyMobile} ${
              state.creditsOpen ? styles.headerButtonActive : ''
            }`}
            aria-label="Créditos, licenças e escopo"
            aria-haspopup="dialog"
            aria-expanded={state.creditsOpen}
            onClick={() => activeStore.setCreditsOpen(true)}
          >
            <span className={styles.iconGlyph} aria-hidden="true">
              i
            </span>
            <span className={styles.desktopOnlyText}>Créditos</span>
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <CanvasViewport
          engine={activeEngine}
          activeStructure={activeStructure}
          isPinned={isLabelPinned}
          webglStatus={state.webglStatus}
          onCloseLabel={handleCloseLabel}
          onResetView={handleResetView}
        />
      </main>

      <LayerControls
        layerMode={layerMode}
        musclesVisible={musclesVisible}
        muscleOpacity={state.muscleOpacity}
        qualityMode={state.qualityMode}
        drawerDesktopOpen={drawerDesktopOpen}
        dockRef={controlsRef}
        onLayerModeChange={handleLayerModeChange}
        onToggleMuscles={handleToggleMuscles}
        onMuscleOpacityChange={handleMuscleOpacityChange}
        onResetView={handleResetView}
        onQualityModeChange={handleQualityModeChange}
      />

      <StatusOverlay
        webglStatus={state.webglStatus}
        loadState={state.loadState}
        totalStructures={catalog.registry.size}
        onRetrySystem={handleRetrySystem}
        onRetryAll={handleRetryAll}
        onOpenDrawer={handleOpenDrawer}
      />

      <StructureDrawer
        open={state.drawerOpen}
        registry={catalog.registry}
        selectedId={state.selectedId}
        manifestStatus={state.loadState.manifest}
        webglStatus={state.webglStatus}
        isMobile={isMobile}
        suspended={state.helpOpen || state.creditsOpen}
        drawerRef={drawerRef}
        returnFocusRef={drawerTriggerRef}
        onClose={handleCloseDrawer}
        onSelectStructure={handleSelectStructure}
      />

      <HelpModal
        open={state.helpOpen}
        returnFocusRef={helpTriggerRef}
        onClose={handleCloseHelp}
      />

      <CreditsModal
        open={state.creditsOpen}
        manifest={catalog.manifest}
        metadata={catalog.metadata}
        coverageMatrix={catalog.coverageMatrix}
        returnFocusRef={creditsTriggerRef}
        onClose={handleCloseCredits}
      />

      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="live-announcer"
        data-announcement-seq={state.announcementSeq}
      >
        <span key={state.announcementSeq}>{state.announcement}</span>
      </div>
    </div>
  );
}

export default App;
