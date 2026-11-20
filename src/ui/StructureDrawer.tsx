import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { StructureMetadata } from '../core/schema/anatomy';
import type {
  AnatomyRegistry,
  AnatomySystemFilter,
} from '../core/anatomy/registry';
import type { SystemLoadStatus, WebGLStatus } from '../core/state/viewerStore';
import { formatLateralityChip, formatSystemLabel } from './types';
import { useDialogFocus } from './useDialogFocus';
import styles from './StructureDrawer.module.css';

export interface StructureDrawerProps {
  readonly open: boolean;
  readonly registry: AnatomyRegistry;
  readonly selectedId: string | null;
  readonly manifestStatus: SystemLoadStatus;
  readonly webglStatus: WebGLStatus;
  readonly isMobile: boolean;
  readonly suspended?: boolean;
  readonly drawerRef?: RefObject<HTMLElement | null>;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly onSelectStructure: (structure: StructureMetadata) => void;
}

/**
 * Gaveta pesquisável de estruturas anatômicas (ADR-005 e Seção 3.3 de UX):
 * alternativa textual 100% operável por teclado ao hover/toque 3D.
 * Lateral direita no desktop (>= 768 px) e bottom-sheet no mobile (< 768 px).
 */
export function StructureDrawer({
  open,
  registry,
  selectedId,
  manifestStatus,
  webglStatus,
  isMobile,
  suspended = false,
  drawerRef,
  returnFocusRef,
  onClose,
  onSelectStructure,
}: StructureDrawerProps) {
  const searchInputId = useId();
  const titleId = useId();

  const [query, setQuery] = useState('');
  const [filterSystem, setFilterSystem] = useState<AnatomySystemFilter>('all');

  const localContainerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const assignDrawerRef = useCallback(
    (node: HTMLElement | null) => {
      localContainerRef.current = node;
      if (drawerRef) {
        (drawerRef as MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    [drawerRef],
  );

  useDialogFocus({
    open,
    containerRef: localContainerRef,
    initialFocusRef: searchInputRef,
    returnFocusRef,
    trapFocus: isMobile,
    suspended,
    onClose,
  });

  const counts = registry.getCountBySystem();

  const results = useMemo(
    () => registry.search(query, filterSystem),
    [registry, query, filterSystem],
  );

  const handleClearQuery = (): void => {
    setQuery('');
    searchInputRef.current?.focus();
  };

  const handleResetFilters = (): void => {
    setQuery('');
    setFilterSystem('all');
    searchInputRef.current?.focus();
  };

  if (!open) {
    return null;
  }

  const isCatalogLoading =
    counts.all === 0 && (manifestStatus === 'idle' || manifestStatus === 'loading');

  return (
    <>
      {isMobile ? (
        <div
          className={styles.backdrop}
          aria-hidden="true"
          onClick={onClose}
          data-testid="structure-drawer-backdrop"
        />
      ) : null}

      <aside
        id="structure-drawer-panel"
        ref={assignDrawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal={isMobile ? true : undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="structure-drawer"
      >
        <div className={styles.handleBar} aria-hidden="true" />

        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Estruturas anatômicas
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Fechar lista de estruturas"
            onClick={onClose}
          >
            <span>Fechar</span>
          </button>
        </div>

        <div className={styles.controls}>
          {webglStatus === 'unsupported' ? (
            <p className={styles.fallbackNotice}>
              Modo de referência textual ativo (visualização 3D indisponível neste
              dispositivo).
            </p>
          ) : null}

          <div className={styles.searchField}>
            <label htmlFor={searchInputId} className={styles.searchLabel}>
              Buscar estrutura (PT-BR ou latim)
            </label>
            <div className={styles.searchInputWrap}>
              <input
                ref={searchInputRef}
                id={searchInputId}
                type="search"
                className={`${styles.searchInput} ${
                  query.length > 0 ? styles.searchInputWithClear : ''
                }`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: bíceps, clavícula, humerus..."
                autoComplete="off"
                spellCheck={false}
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  className={styles.clearButton}
                  aria-label="Limpar busca"
                  onClick={handleClearQuery}
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={styles.filterGroup}
            role="group"
            aria-label="Filtrar por sistema anatômico"
          >
            <button
              type="button"
              className={`${styles.filterButton} ${
                filterSystem === 'all' ? styles.filterButtonActive : ''
              }`}
              aria-pressed={filterSystem === 'all'}
              onClick={() => setFilterSystem('all')}
            >
              Todas ({counts.all})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${
                filterSystem === 'muscular' ? styles.filterButtonActive : ''
              }`}
              aria-pressed={filterSystem === 'muscular'}
              onClick={() => setFilterSystem('muscular')}
            >
              Músculos ({counts.muscular})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${
                filterSystem === 'skeletal' ? styles.filterButtonActive : ''
              }`}
              aria-pressed={filterSystem === 'skeletal'}
              onClick={() => setFilterSystem('skeletal')}
            >
              Ossos ({counts.skeletal})
            </button>
          </div>

          <p className={styles.resultsMeta}>
            {isCatalogLoading
              ? 'Carregando catálogo...'
              : `${results.length} de ${counts.all} estruturas`}
          </p>
        </div>

        <div className={styles.listContainer}>
          {isCatalogLoading ? (
            <div className={styles.emptyState}>
              <p>Carregando catálogo de estruturas anatômicas...</p>
            </div>
          ) : results.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {query.trim().length > 0
                  ? `Nenhuma estrutura encontrada para "${query.trim()}".`
                  : 'Nenhuma estrutura disponível neste filtro.'}
              </p>
              {query.length > 0 || filterSystem !== 'all' ? (
                <button
                  type="button"
                  className={styles.resetFilterButton}
                  onClick={handleResetFilters}
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          ) : (
            <ul className={styles.list} aria-label="Resultados de estruturas anatômicas">
              {results.map((structure) => {
                const isSelected = selectedId === structure.anatomyId;
                return (
                  <li key={structure.anatomyId}>
                    <button
                      type="button"
                      className={`${styles.itemButton} ${
                        isSelected ? styles.itemButtonSelected : ''
                      }`}
                      aria-pressed={isSelected}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => onSelectStructure(structure)}
                    >
                      <span className={styles.itemHeader}>
                        <span className={styles.itemNamePt}>
                          {structure.displayName['pt-BR']}
                        </span>
                        {isSelected ? (
                          <span className={styles.itemSelectedTag}>Selecionada</span>
                        ) : null}
                      </span>
                      <span className={styles.itemNameLa} lang="la">
                        {structure.displayName.la}
                      </span>
                      <span className={styles.itemMeta}>
                        <span className={styles.chip}>
                          <span
                            className={`${styles.dot} ${
                              structure.system === 'muscular'
                                ? styles.dotMuscular
                                : styles.dotSkeletal
                            }`}
                            aria-hidden="true"
                          />
                          {formatSystemLabel(structure.system)}
                        </span>
                        <span className={`${styles.chip} ${styles.chipSecondary}`}>
                          {formatLateralityChip(structure.laterality)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
