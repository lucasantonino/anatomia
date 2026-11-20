import { useId, useRef, type MouseEvent, type RefObject } from 'react';
import { useDialogFocus } from './useDialogFocus';
import styles from './HelpModal.module.css';

export interface HelpModalProps {
  readonly open: boolean;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
}

/**
 * Modal "Como navegar" (Seções 3.4 e 4 de docs/ux-interacao-e-acessibilidade.md):
 * instruções objetivas separadas em Mouse / Trackpad, Toque e Teclado.
 */
export function HelpModal({ open, returnFocusRef, onClose }: HelpModalProps) {
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

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="help-modal-backdrop"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="help-modal"
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Como navegar
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            aria-label="Fechar janela Como navegar"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            Explore o modelo anatômico 3D usando mouse, gestos táteis ou teclado. Use
            os controles inferiores para alternar camadas entre músculos, ossos ou
            ambos.
          </p>

          <section className={styles.section} aria-labelledby="help-mouse-title">
            <h3 id="help-mouse-title" className={styles.sectionTitle}>
              Mouse / Trackpad
            </h3>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Orbitar modelo: </span>
                <span className={styles.actionDetail}>
                  arrastar mantendo o botão esquerdo pressionado.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Zoom: </span>
                <span className={styles.actionDetail}>
                  girar a roda do mouse ou fazer gesto de pinça no trackpad.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Deslocar enquadramento (Pan): </span>
                <span className={styles.actionDetail}>
                  arrastar com o botão direito ou segurar{' '}
                  <kbd className={styles.kbd}>Shift</kbd> e arrastar.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Identificar estrutura: </span>
                <span className={styles.actionDetail}>
                  passar o cursor sobre uma estrutura para exibir o rótulo; clicar fixa
                  a seleção.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Encerrar identificação: </span>
                <span className={styles.actionDetail}>
                  mover o cursor para fora, clicar no fundo preto, pressionar{' '}
                  <kbd className={styles.kbd}>Esc</kbd> ou usar o botão fechar da
                  etiqueta.
                </span>
              </li>
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="help-touch-title">
            <h3 id="help-touch-title" className={styles.sectionTitle}>
              Toque (Celular / Tablet)
            </h3>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Orbitar modelo: </span>
                <span className={styles.actionDetail}>arrastar com 1 dedo.</span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Zoom: </span>
                <span className={styles.actionDetail}>gesto de pinça com 2 dedos.</span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Deslocar enquadramento (Pan): </span>
                <span className={styles.actionDetail}>arrastar com 2 dedos.</span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Identificar estrutura: </span>
                <span className={styles.actionDetail}>
                  toque simples sobre a estrutura seleciona e exibe a etiqueta.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Encerrar identificação: </span>
                <span className={styles.actionDetail}>
                  tocar fora do modelo, no botão fechar da etiqueta ou em outra
                  estrutura.
                </span>
              </li>
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="help-keyboard-title">
            <h3 id="help-keyboard-title" className={styles.sectionTitle}>
              Teclado
            </h3>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Orbitar modelo: </span>
                <span className={styles.actionDetail}>
                  focar o visualizador 3D com <kbd className={styles.kbd}>Tab</kbd> e
                  usar as setas <kbd className={styles.kbd}>↑</kbd>{' '}
                  <kbd className={styles.kbd}>↓</kbd>{' '}
                  <kbd className={styles.kbd}>←</kbd>{' '}
                  <kbd className={styles.kbd}>→</kbd>.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Deslocar enquadramento (Pan): </span>
                <span className={styles.actionDetail}>
                  <kbd className={styles.kbd}>Shift</kbd> + setas direcionais.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Zoom: </span>
                <span className={styles.actionDetail}>
                  teclas <kbd className={styles.kbd}>+</kbd> /{' '}
                  <kbd className={styles.kbd}>=</kbd> para aproximar e{' '}
                  <kbd className={styles.kbd}>-</kbd> /{' '}
                  <kbd className={styles.kbd}>_</kbd> para afastar.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Lista acessível de estruturas: </span>
                <span className={styles.actionDetail}>
                  abrir <strong>Estruturas</strong>, pesquisar em português ou latim e
                  selecionar com <kbd className={styles.kbd}>Tab</kbd> +{' '}
                  <kbd className={styles.kbd}>Enter</kbd>.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.actionName}>Redefinir vista e fechar: </span>
                <span className={styles.actionDetail}>
                  tecla <kbd className={styles.kbd}>R</kbd> restaura a câmera;{' '}
                  <kbd className={styles.kbd}>Esc</kbd> fecha janelas, gaveta ou
                  etiqueta selecionada.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
