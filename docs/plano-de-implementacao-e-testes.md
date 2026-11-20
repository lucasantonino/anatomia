# Plano de Implementação e Testes (Fase 0 + Fase 1)

Este roteiro organiza a execução completa da **Fase 0** (governança de dados e geração dos ativos reais `.glb`) e da **Fase 1** (protótipo técnico funcional ponta a ponta com testes Vitest e Playwright), servindo como guia passo a passo para a etapa de desenvolvimento.

---

## 1. Sequência Executável em 6 Marcos

### Marco 1 — Bootstrap do Projeto e Ferramental
- **Objetivo:** inicializar o projeto Vite + React + TypeScript estrito, linters e suítes de teste sem alterar `sources/`, `AGENTS.md` ou `especificacao-tecnica-anatomia-3d.md`.
- **Entregáveis:**
  - `package.json` com scripts padronizados:
    - `dev`, `build`, `preview`, `typecheck`
    - `build:assets`, `validate:assets`
    - `test` (Vitest), `test:e2e` (Playwright)
  - Dependências de runtime: `react`, `react-dom`, `three`, `zod`, `meshoptimizer`.
  - Dependências de build de ativos e dev: `typescript`, `vite`, `@vitejs/plugin-react`, `@types/three`, `@types/react`, `@types/react-dom`, `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`.
  - `.gitignore` configurando `node_modules/`, `dist/`, `.cache/` (cache dos 53 MB de STLs brutos), `playwright-report/`, `test-results/`.
  - `tsconfig.json` com `strict: true`, `noUncheckedIndexedAccess: true` e `noImplicitOverride: true`.

### Marco 2 — Fase 0: Schemas, Pipeline de Ativos Reais e Gate de Validação
- **Objetivo:** materializar o contrato descrito em [contrato-dados-e-pipeline-3d.md](./contrato-dados-e-pipeline-3d.md) e gerar os ativos `.glb` reais a partir do BodyParts3D v3.0.
- **Entregáveis:**
  - `src/core/schema/anatomy.ts` (schemas Zod para `manifest.json`, `metadata-v1.json` e `coverage-matrix.json`).
  - `scripts/anatomy-catalog.mjs` (catálogo canônico das 22 estruturas / 36 FMA IDs mapeados em [matriz-de-cobertura.md](./matriz-de-cobertura.md)).
  - `scripts/build-assets.mjs` (download com cache, verificação SHA-256, transformação matemática BodyParts3D → glTF, `weld`, normais suaves, simplificação Meshopt, cálculo de `labelAnchor` externo, exportação `skeletal-v1.glb` + `muscular-v1.glb` + JSONs).
  - `scripts/validate-assets.mjs` (as 8 verificações de gate em build).
  - Atualização da tabela de hashes SHA-256 observados em [dossie-licenciamento.md](./dossie-licenciamento.md).
- **Critério de passagem do Marco 2:** `npm run build:assets && npm run validate:assets` termina com código `0`, soma total dos dois `.glb` dentro do orçamento (`<= 3,0 MB` alvo / `<= 4,0 MB` teto) e `<= 100.000` triângulos alvo.

### Marco 3 — Camada `src/core/` e Testes Unitários de Domínio
- **Objetivo:** implementar lógica pura de estado e catálogo pesquisável sem acoplamento com DOM ou WebGL.
- **Entregáveis:**
  - `src/core/state/viewerStore.ts` (store reativa compatível com `useSyncExternalStore`, tabela de transições de `visibleSystems`, `muscleOpacity`, `hoveredId`, `selectedId`, `loadState`, `qualityMode` e `announcement`).
  - `src/core/anatomy/registry.ts` (índice `byAnatomyId`, `byMeshNode` e `search()` sem acentos em PT-BR e Latim).
  - `tests/unit/schema.test.ts`, `tests/unit/viewerStore.test.ts` e `tests/unit/registry.test.ts`.
- **Critério de passagem do Marco 3:** 100% dos testes unitários de domínio passando com `npm run test`.

### Marco 4 — Motor 3D (`src/scene/`) e Testes de Interação/Projeção
- **Objetivo:** construir a fachada `AnatomyEngine` e os 4 sub-módulos WebGL 2 sobre Three.js direto.
- **Entregáveis:**
  - `src/scene/AssetLoader.ts` (carga validada + progressiva esqueleto→músculos + retry por sistema).
  - `src/scene/MaterialManager.ts` (PBR clínico, realce reversível por `anatomyId` multi-nó, opacidade muscular opaca/translúcida).
  - `src/scene/InteractionController.ts` (funções puras exportadas e testáveis para histerese anti-tremor, heurística `tap vs drag` `<= 8 px` / `< 350 ms`, filtro de *raycasting* em opacidade `<= 25%` e suspensão durante órbita).
  - `src/scene/LabelProjector.ts` (função pura de *clamping* e anti-colisão + atualização direta `translate3d` no DOM).
  - `src/scene/AnatomyEngine.ts` (WebGL 2, iluminação clínica de 3 pontos, `OrbitControls`, `focusStructure` cancelável, pausa em aba oculta, DPR adaptativo e `webglcontextlost`/`restored`).
  - `tests/unit/interactionLogic.test.ts` e `tests/unit/labelClamping.test.ts`.
- **Critério de passagem do Marco 4:** `npm run typecheck` e `npm run test` verdes cobrindo lógica pura da cena.

### Marco 5 — Interface Acessível (`src/ui/`) e Integração Completa
- **Objetivo:** implementar todos os componentes React + CSS Modules conforme [ux-interacao-e-acessibilidade.md](./ux-interacao-e-acessibilidade.md).
- **Entregáveis:**
  - `src/ui/styles/tokens.css`, `src/ui/App.tsx`, `src/ui/CanvasViewport.tsx`, `src/ui/LayerControls.tsx`, `src/ui/AnatomyLabel.tsx`, `src/ui/StructureDrawer.tsx`, `src/ui/HelpModal.tsx`, `src/ui/CreditsModal.tsx`, `src/ui/StatusOverlay.tsx`.
  - Testes de componente com `@testing-library/react` cobrindo alternância de camadas sem contradição, slider de opacidade, busca na gaveta, anúncios `aria-live` e navegação por teclado.
- **Critério de passagem do Marco 5:** `npm run typecheck && npm run test && npm run build` passando sem erros nem avisos críticos.

### Marco 6 — Verificação Ponta a Ponta (Playwright) e Inspeção Visual
- **Objetivo:** validar o bundle de produção (`vite preview`) em navegador real desktop e mobile, cobrindo os fluxos reais com WebGL ativo (SwiftShader/GPU headless) e cenários de falha simulada.
- **Entregáveis:**
  - `tests/e2e/viewer.desktop.spec.ts` (`1280×720`)
  - `tests/e2e/viewer.mobile.spec.ts` (`390×844` e `320×568`, com emulação `hasTouch: true`)
  - `tests/e2e/resilience.spec.ts` (falha de rede com `Tentar novamente`, simulação de `webglcontextlost`, inspeção de erros zero de console).
- **Critério de passagem do Marco 6:** suíte Playwright 100% verde + inspeção manual/visual confirmando ausência de distorções anatômicas, lateralidade correta e contraste legível sobre `#000000`.

---

## 2. Matriz de Rastreabilidade (Requisitos → Código → Testes)

| Requisito | Descrição resumida | Módulos responsáveis | Verificação automatizada |
|---|---|---|---|
| `RF-01` | Cena centralizada, fundo preto, iluminação clínica | `AnatomyEngine.ts`, `tokens.css` | Playwright: fundo `#000000`, canvas renderizado sem erros |
| `RF-02` | Orbitar, zoom, pan, redefinir vista (mouse, toque, teclado) | `AnatomyEngine.ts`, `CanvasViewport.tsx` | Playwright: atalho `R`, botões, eventos de arrasto sem erro |
| `RF-03` | Modos `Músculos \| Ossos \| Ambos` sem perda de câmera | `viewerStore.ts`, `LayerControls.tsx`, `AnatomyEngine.ts` | Vitest (`viewerStore`) + Playwright (troca de modos preserva câmera) |
| `RF-04` | Atalho rápido `Mostrar músculos` | `viewerStore.ts`, `LayerControls.tsx` | Vitest (evita estado vazio) + Playwright |
| `RF-05` | Hover desktop com realce reversível e etiqueta científica | `InteractionController.ts`, `MaterialManager.ts`, `AnatomyLabel.tsx` | Vitest (histerese) + Playwright (hover/seleção no canvas) |
| `RF-06` | Toque simples abre etiqueta; arrasto/pinça não dispara | `InteractionController.ts` | Vitest (`tap vs drag`) + Playwright mobile (`hasTouch: true`) |
| `RF-07` | Leitura de ossos sob músculos (`Ambos` + opacidade) | `MaterialManager.ts`, `InteractionController.ts`, `LayerControls.tsx` | Vitest (`muscleOpacity <= 0.25`) + Playwright (slider visível em `Ambos`) |
| `RF-08` | Etiqueta 2D ancorada, dentro da tela e fora dos controles | `LabelProjector.ts`, `AnatomyLabel.tsx` | Vitest (`clampLabelRect`) + Playwright (`320×568` e `1280×720`) |
| `RF-09` | Mensagens claras para falha de ativo e sem WebGL | `StatusOverlay.tsx`, `AssetLoader.ts`, `AnatomyEngine.ts` | Playwright (`page.route` interceptando `.glb` -> retry + `webglcontextlost`) |
| `RNF-Desempenho` | Orçamento `.glb`, carregamento progressivo, pausa em aba oculta | `build-assets.mjs`, `AssetLoader.ts`, `AnatomyEngine.ts` | `validate:assets` (tamanho/triângulos) + Playwright |
| `RNF-Acessibilidade` | WCAG 2.2 AA, alvos `>= 44×44 px`, lista pesquisável, `aria-live` | `StructureDrawer.tsx`, `LayerControls.tsx`, `HelpModal.tsx` | Vitest (`registry.search`) + Playwright (teclado, busca PT-BR/Latim, alvos `>= 44px`) |
| `RNF-Licença/Dados` | Contrato Zod, atribuição `CC BY-SA 2.1 JP`, cobertura honesta | `anatomy.ts`, `validate-assets.mjs`, `CreditsModal.tsx` | `validate:assets` + Vitest (`schema`) + Playwright (`CreditsModal`) |

---

## 3. Orçamentos Técnicos e Critérios de Saída da Fase 1

A Fase 1 será considerada **concluída e pronta para validação/evolução à Fase 2** somente quando todos os itens abaixo forem comprovados:

| Métrica / Critério | Meta alvo (Fase 1) | Limite máximo aceitável |
|---|---|---|
| Peso total transferido (`skeletal-v1.glb` + `muscular-v1.glb`) | `<= 3,0 MB` | `<= 4,0 MB` |
| Contagem total de triângulos (36 malhas otimizadas) | `<= 100.000` | `<= 120.000` |
| Correspondência `.glb` ↔ `metadata-v1.json` ↔ `coverage-matrix.json` | 100% (22 estruturas / 36 nós) | 100% (zero órfãos) |
| Meta de fluidez (observação manual em referência) | 50–60 FPS desktop / 30 FPS mobile | Sem travamentos em troca de camada ou slider |
| Cobertura de testes automatizados | `typecheck`, `validate:assets`, Vitest e Playwright 100% verdes | Zero falhas ou skips em critérios críticos |
| Integridade do repositório | `sources/` intacta; licença `CC BY-SA 2.1 JP` visível nos créditos | 100% conforme [AGENTS.md](../AGENTS.md) |
