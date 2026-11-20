# Especificação de UX, Interação e Acessibilidade (WCAG 2.2 AA)

Este documento define a experiência visual, os tokens de design clínico, os *layouts* responsivos (`320 px` a telas largas de desktop), as regras de interação por mouse, toque e teclado e os requisitos verificáveis de acessibilidade para a interface do **Anatomia 3D**.

---

## 1. Diretrizes Visuais e Design Tokens (`src/ui/styles/tokens.css`)

A estética segue um **atlas médico-científico contemporâneo sobre fundo preto puro (`#000000`)**, priorizando leitura anatômica de volume/profundidade sem elementos decorativos ou estéticos de videogame (Seção 10.1 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md)).

### Paleta e Contraste (WCAG 2.2 AA verificado)

| Token CSS | Valor sugerido | Uso | Requisito de contraste |
|---|---|---|---|
| `--bg-canvas` | `#000000` | Fundo integral do viewport 3D | Base absoluta |
| `--surface-panel` | `rgba(18, 20, 24, 0.90)` | Superfície de barras, gaveta e etiqueta (com `backdrop-filter: blur(10px)`) | Alto contraste contra `#F4F6FA` (`> 14:1`) |
| `--surface-elevated` | `#181B22` | Modais, botões ativos em repouso e fundo de lista | Contraste `> 13:1` |
| `--border-subtle` | `rgba(255, 255, 255, 0.16)` | Separação limpa de painéis sem ruído visual | — |
| `--border-strong` | `rgba(255, 255, 255, 0.36)` | Controles interativos e divisórias focadas | `>= 3:1` |
| `--text-primary` | `#F4F6FA` | Títulos, nomes em PT-BR e rótulos de ação | `> 15:1` |
| `--text-secondary` | `#B8C0CC` | Subtítulo em Latim, metadados de lateralidade e hints | `> 8.5:1` |
| `--accent-primary` | `#58B8FF` | Foco visível, item ativo no segmentado e estado selecionado | `> 8.2:1` sobre `--surface-elevated` |
| `--accent-muscle` | `#E07A72` | Marcador visual do sistema muscular (sempre junto a texto `Muscular`) | `> 5.8:1` |
| `--accent-bone` | `#E5DEC9` | Marcador visual do sistema ósseo (sempre junto a texto `Ósseo`) | `> 12:1` |
| `--status-warning` | `#F2B84B` | Avisos não bloqueantes (ex.: falha parcial de uma camada, modo fantasma) | `> 9.5:1` |
| `--status-error` | `#FF6B6B` | Mensagens de erro crítico (WebGL indisponível / falha de carga) | `> 6.1:1` |
| `--focus-ring` | `2px solid #7CCBFF` + `offset: 2px` | Anel de foco por teclado em **todos** os controles | `>= 3:1` |

### Regra de Independência de Cor
Nenhum estado da interface (camada selecionada, muscular vs. ósseo, realce ativo) pode depender exclusivamente de cor (Seção 15 da spec):
- Controles segmentados usam `aria-pressed` / `aria-checked`, preenchimento de superfície elevado e borda destacada.
- Etiquetas e itens da gaveta exibem rótulo textual explícito (`Muscular` / `Ósseo`) além do indicador cromático.

---

## 2. Arquitetura Responsiva (320 px até Desktop Ultrawide)

### 2.1 Layout Desktop (`>= 768 px`)

```text
+-------------------------------------------------------------------------+
| [Anatomia 3D · v1]                     [Estruturas] [Como navegar] [?]  |
|                                                                         |
|                                               +-----------------------+ |
|                                               | Músculo bíceps braq.  | |
|                   ÁREA 3D                     | Musculus biceps brach.| |
|              (fundo #000000)                  | [Muscular] [Lado esq.]| |
|                                               +-----------------------+ |
|                                                          /              |
|                                                         o (âncora 3D)   |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | [Músculos | Ossos | Ambos]  [Mostrar músculos: ON]                |  |
|  | Opacidade músculos: [====o===] 100%   [Redefinir] [Qualidade:Auto]|  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

Quando a gaveta **Estruturas** é aberta no desktop, desliza pela lateral direita (`width: min(360px, 34vw)`) sem recarregar o canvas; o `LabelProjector` recebe a largura ocupada pela gaveta nas `safeInsets` para não deixar a etiqueta escondida atrás dela.

### 2.2 Layout Mobile (`320 px – 767 px`)

```text
+-----------------------------------+
| Anatomia 3D      [Lista] [?] [i]  |
+-----------------------------------+
|                                   |
|      +---------------------+      |
|      | Clavícula           | [x]  |
|      | Clavicula           |      |
|      | [Ósseo] [Lado dir.] |      |
|      +---------------------+      |
|                 |                 |
|                 o (âncora)        |
|                                   |
|            ÁREA 3D                |
|         (fundo #000000)           |
|                                   |
+-----------------------------------+
| [Músculos | Ossos | Ambos]        |
| [Mostrar músculos]  [Redefinir]   |
| Opacidade: [=====o===] 70%        |
+-----------------------------------+
```

- **Alvos de toque:** todo botão, item da lista, fechamento de etiqueta e pino de controle possui área clicável mínima de **`44 × 44 px`** (Seção 14 da spec).
- **Safe areas:** respeito a `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` para iOS Safari / Chrome Android.
- **Em `320 px` de largura:** os rótulos da barra superior compactam para ícones + `aria-label` completo ou abreviação clara (`Estruturas` -> `Lista`, mantendo alvos `>= 44 px`), e a barra inferior empilha em no máximo 2 linhas limpas para preservar >= 65% da altura útil para o canvas 3D.
- **Gaveta no mobile:** abre como *bottom-sheet* até `55vh`, permitindo continuar vendo a estrutura destacada na metade superior da tela ao tocar em um item da lista.

---

## 3. Especificação Detalhada dos Componentes

### 3.1 Barra de Controles de Camada (`LayerControls.tsx`)
- **Grupo segmentado de camadas (`role="group"` com `aria-label="Camadas anatômicas"` e botões com `aria-pressed`):**
  - `Músculos` (`visibleSystems = {'muscular'}`)
  - `Ossos` (`visibleSystems = {'skeletal'}`)
  - `Ambos` (`visibleSystems = {'muscular', 'skeletal'}`)
- **Atalho rápido `Mostrar músculos`:** botão *toggle* (`aria-pressed`) sempre visível ao lado ou logo abaixo no mobile. Desativá-lo quando somente `Músculos` estiver ativo alterna automaticamente para `Ossos` (transição explícita sem tela vazia, conforme ADR-006).
- **Controle experimental de opacidade muscular:**
  - Exibido **somente quando `Ambos` estiver ativo** (para não sugerir efeito quando a camada muscular está oculta ou isolada).
  - `<input type="range" min="15" max="100" step="5" />` com rótulo `Opacidade dos músculos`, valor percentual ao vivo (`100%`, `60%`, etc.) e altura de toque >= 44 px.
  - Quando o valor for `<= 25%`, exibe dica textual discreta: *"Seleção direta de ossos ativa (músculos translúcidos)"*.
- **`Redefinir visão`:** restaura posição, alvo e zoom iniciais da câmera sem alterar a camada escolhida.
- **Seletor `Qualidade` (`Automática` / `Reduzida`):** permite reduzir manualmente resolução (`DPR = 1.0`) em dispositivos limitados sem perder dados anatômicos (Seção 14).

### 3.2 Etiqueta 2D Projetada (`AnatomyLabel.tsx`)
Estrutura visual exibida quando `activeAnatomyId !== null`:
1. **Cabeçalho:** Nome em **PT-BR** em negrito (`15 px`–`16 px`) + botão fechar (`44 × 44 px`, visível quando a etiqueta está fixada por toque/clique ou seleção pela lista).
2. **Subtítulo científico:** Nome em **Latim** (*Terminologia Anatomica*) em itálico (`13 px`, `--text-secondary`).
3. **Linha de metadados:** chip de camada (`Muscular` ou `Ósseo`) + chip de lateralidade (`Lado direito` ou `Lado esquerdo`).
4. **Conector visual:** linha SVG fina (`1.5 px`) ligando o ponto projetado da `labelAnchor` (com pequeno marcador circular de `6 px` no ponto anatômico) até a borda mais próxima do cartão.
5. **Região acessível no DOM:** mesmo quando o cartão se move por `translate3d` (ou fica temporariamente fora de visão se atrás da câmera), as informações textuais da estrutura ativa existem no DOM e alimentam uma região `aria-live="polite"`.

### 3.3 Gaveta Textual Pesquisável (`StructureDrawer.tsx`)
Requisito obrigatório da Seção 15 (alternativa funcional completa ao *hover* 3D):
- **Abertura:** botão `Estruturas` no cabeçalho (atalho lógico após os controles principais ou acessível via `Tab`); fecha por botão `Fechar`, clique no *backdrop* (mobile) ou tecla `Esc`.
- **Campo de busca:** `<input type="search" />` com rótulo visível `Buscar estrutura (PT-BR ou latim)` e botão limpar quando preenchido.
- **Filtro rápido na lista:** `Todas (22)` | `Músculos (12)` | `Ossos (10)` (contagens dinâmicas da matriz carregada).
- **Comportamento ao selecionar um item:**
  1. Se a camada da estrutura selecionada estiver oculta (ex.: usuário estava vendo só `Ossos` e escolheu `Músculo bíceps braquial`), habilita automaticamente o sistema necessário (ou exibe ambos) e anuncia via `aria-live` para que o usuário nunca selecione algo invisível.
  2. Define `selectedId` (realça todas as malhas da estrutura e exibe a etiqueta 2D).
  3. Invoca `focusStructure(anatomyId)` na câmera (suave em ~450 ms, ou instantânea se `prefers-reduced-motion: reduce`).
  4. No mobile (`< 768 px`), recolhe automaticamente a gaveta (ou reduz para modo compacto) após a seleção para revelar o modelo focado com clareza.

### 3.4 Modais (`HelpModal.tsx` e `CreditsModal.tsx`) e Estados de Falha (`StatusOverlay.tsx`)
- **`HelpModal` ("Como navegar"):** instruções objetivas separadas em 3 blocos curtos — **Mouse / Trackpad**, **Toque (Celular/Tablet)** e **Teclado** — com `role="dialog"`, `aria-modal="true"`, foco inicial no botão fechar e retorno de foco ao botão acionador ao fechar.
- **`CreditsModal` ("Créditos e Escopo"):** exibe atribuição integral `BodyParts3D (CC BY-SA 2.1 JP)`, versões ativas (`assetVersion: v1`, `metadataVersion: v1`), escopo regional explícito (`22 estruturas da cintura escapular e membro superior`), status de revisão científica (`pending_review`) e aviso educacional.
- **`StatusOverlay`:**
  - **Carregamento inicial:** barra de progresso acessível (`role="progressbar"`, `aria-valuenow`) informando etapas em linguagem simples (*"Carregando esqueleto..."*, *"Carregando musculatura..."*). Assim que o esqueleto carrega, o overlay bloqueante some e um indicador discreto acompanha a musculatura em segundo plano.
  - **Falha parcial de rede:** se apenas a musculatura falhar, mostra banner superior não destrutivo com botão **Tentar novamente** mantendo o esqueleto manipulável.
  - **Falha total de carregamento:** cartão central em linguagem simples com botão **Tentar novamente**.
  - **WebGL indisponível / contexto perdido (`webglcontextlost`):** explicação clara sem jargão técnico, instruindo atualizar a página ou verificar aceleração gráfica, mantendo acessível a gaveta textual de estruturas como referência básica.

---

## 4. Matriz de Interação: Mouse, Toque e Teclado

| Ação | Mouse / Trackpad (Desktop) | Toque (Mobile / Tablet) | Teclado |
|---|---|---|---|
| **Orbitar modelo** | Arrastar com botão esquerdo | Arrastar com 1 dedo | Focar canvas + `Setas` (`↑ ↓ ← →`) |
| **Zoom** | Roda do mouse / gesto de pinça no trackpad | Pinça com 2 dedos | `+` / `-` (ou `=` / `_`) |
| **Deslocar enquadramento (Pan)** | Arrastar com botão direito ou `Shift` + arrastar | Arrastar com 2 dedos | `Shift` + `Setas` |
| **Identificar estrutura** | Passar cursor (*hover*) com histerese anti-tremor; clique fixa seleção | Toque simples (`<= 8 px`, `< 350 ms`) seleciona e abre etiqueta | Selecionar na gaveta `Estruturas` com `Tab` + `Enter` |
| **Encerrar identificação** | Mover cursor para fora (ou clicar fora / `Esc` se fixada) | Tocar fora do modelo, no `[×]` da etiqueta ou em outra estrutura | `Esc` ou botão fechar da etiqueta |
| **Redefinir vista** | Botão `Redefinir visão` | Botão `Redefinir visão` | Tecla `R` (fora de campos de texto) |

---

## 5. Checklist Verificável WCAG 2.2 AA

- [ ] **1.4.3 / 1.4.11 Contraste:** textos `>= 4.5:1` (`>= 3:1` em texto grande e bordas/ícones de controles ativos); verificado contra `#000000`, `#121418` e `#181B22`.
- [ ] **1.4.1 Uso de cor:** nenhum controle ou etiqueta transmite informação apenas por cor.
- [ ] **2.1.1 / 2.1.2 Teclado sem armadilha:** todos os botões, slider, busca, lista, modais e canvas operáveis 100% por teclado; `Esc` sempre sai de modais e gaveta restaurando o foco.
- [ ] **2.4.7 / 2.4.11 Foco visível:** anel de foco de alto contraste nunca ocultado atrás de barras fixas.
- [ ] **2.5.8 Tamanho do alvo:** todos os controles interativos medem no mínimo `44 × 44 px` (acima até do mínimo `24 × 24 px` do critério AA e cumprindo a Seção 14 da spec).
- [ ] **4.1.3 Mensagens de status (`aria-live="polite"`):** anuncia mudança de camada (*"Camada alterada para Somente ossos"*), seleção de estrutura (*"Selecionado: Músculo bíceps braquial, Musculus biceps brachii, lado esquerdo"*), progresso concluído e erros de carregamento.
- [ ] **2.3.3 Movimento reduzido (`prefers-reduced-motion: reduce`):** elimina transições de gaveta e torna o `focusStructure` / `resetView` instantâneo sem animação de câmera.
