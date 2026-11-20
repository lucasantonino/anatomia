# Registro de Decisões Arquiteturais (ADRs)

Este documento registra as decisões de arquitetura, licenciamento, ativos 3D, interface e escopo tomadas após a análise da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md). Cada decisão abaixo está vinculada aos requisitos funcionais (`RF-01`–`RF-09`) e não funcionais da especificação.

---

## Índice de Decisões

| ID | Título | Status | Impacto principal |
|---|---|---|---|
| [ADR-001](#adr-001--licenciamento-aberto-cc-by-sa-e-estrat%C3%A9gia-de-ativos-3d-em-fases) | Licenciamento aberto (CC BY-SA) e estratégia de ativos 3D em fases | Aceita | Seleção de ativos, pipeline Node e dossiê jurídico |
| [ADR-002](#adr-002--stack-web-vite--react--typescript-spa-100-cliente) | Stack web Vite + React + TypeScript (SPA 100% cliente) | Aceita | Build, hospedagem estática e desacoplamento |
| [ADR-003](#adr-003--motor-3d-com-threejs-direto-encapsulado-anatomyengine) | Motor 3D com Three.js direto encapsulado (`AnatomyEngine`) | Aceita | Desempenho a 60 FPS, raycasting e ciclo de vida WebGL 2 |
| [ADR-004](#adr-004--estiliza%C3%A7%C3%A3o-com-css-modules--design-tokens-e-html-sem%C3%A2nticoaria) | Estilização com CSS Modules + Design Tokens e HTML semântico/ARIA | Aceita | WCAG 2.2 AA, contraste em fundo preto e zero overhead |
| [ADR-005](#adr-005--conven%C3%A7%C3%A3o-editorial-de-etiquetas-identifica%C3%A7%C3%A3o-e-lista-textual-acess%C3%ADvel) | Convenção editorial de etiquetas, identificação e lista textual acessível | Aceita | UX bilíngue PT-BR/Latim e acessibilidade |
| [ADR-006](#adr-006--estado-%C3%BAnico-de-camadas-e-opacidade-muscular-experimental-no-modo-ambos) | Estado único de camadas e opacidade muscular experimental no modo "Ambos" | Aceita | `RF-03`, `RF-04`, `RF-07` e previsibilidade da interface |

---

## ADR-001 — Licenciamento aberto (CC BY-SA) e estratégia de ativos 3D em fases

- **Status:** Aceita
- **Contexto:** A [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md) (Seção 1, Seção 9 e Seção 22) identifica a obtenção e segmentação de modelos 3D cientificamente válidos como o maior risco do projeto. O ambiente local dispõe de Node.js `v24.22.1`, npm e `curl`, mas **não possui Blender instalado** neste momento.
- **Decisão:**
  1. O **Anatomia 3D** será conduzido como **projeto educacional aberto e gratuito**, compatível com atribuição e cláusula *ShareAlike* (`CC BY-SA`).
  2. Na **Fase 1 (Protótipo Técnico)**, será utilizado um recorte anatômico real do **BodyParts3D v3.0** (`CC BY-SA 2.1 JP`, via espelho binário STL `Kevin-Mattheus-Moerman/BodyParts3D`), composto pela **cintura escapular e membro superior bilateral** (10 ossos + 12 músculos = **22 estruturas anatômicas** distribuídas em **36 malhas STL reais**), convertido de forma reproduzível por script Node para `.glb` comprimido com Meshopt.
  3. Na **Fase 2 (MVP Corpo Completo)**, a base escalará para o corpo humano completo (usando o restante das 937 malhas do BodyParts3D v3.0 ou migrando para **Z-Anatomy** `CC BY-SA 4.0` via Blender), **mantendo exatamente o mesmo contrato `.glb` + metadados JSON/Zod**, sem reescrever motor 3D ou interface.
- **Alternativas consideradas:**
  - *Produto comercial proprietário fechado:* exigiria compra/licenciamento comercial oneroso e bloquearia uso imediato de BodyParts3D e Z-Anatomy. Rejeitada.
  - *Z-Anatomy desde o dia zero:* possui malhas mais polidas em `TA2`, mas exige instalação e automação em Blender para exportar `.blend` → `.glb` em escala. Rejeitada para a Fase 1, mantida como candidata prioritária da Fase 2.
  - *Fixture sintético geométrico na Fase 1:* não validaria peso real, topologia irregular, agrupamento de múltiplas cabeças musculares (`meshNodes`) nem oclusão real entre músculos e ossos. Rejeitada.
- **Justificativa:** O recorte real da cintura escapular e membro superior exercita desde a Fase 1 todos os desafios reais do produto: bilateralidade (`left`/`right`), estruturas compostas por múltiplas malhas (deltoide em 3 partes, peitoral maior em 3 partes, bíceps em 2 cabeças, tríceps em 3 cabeças), oclusão músculo-osso e redução agressiva de polígonos (~57,1 MB brutos em STL → orçamento alvo `<= 3 MB` em `.glb` Meshopt).
- **Consequências e Riscos:**
  - Exige cumprir estritamente a atribuição ao DBCLS (`CC BY-SA 2.1 JP`) e disponibilizar os `.glb` derivados sob licença compatível `CC BY-SA` (documentado em [dossie-licenciamento.md](./dossie-licenciamento.md)).
  - Requer rotulagem clara de escopo limitado (cintura escapular e membro superior) na Fase 1 para não violar a regra de transparência da Seção 4.1 da spec.

---

## ADR-002 — Stack web Vite + React + TypeScript (SPA 100% cliente)

- **Status:** Aceita
- **Contexto:** O MVP é uma aplicação web de página única, inteiramente executada no navegador do usuário, sem requisito de backend, contas de usuário ou persistência em servidor (Seções 3.3 e 7.1 da spec).
- **Decisão:** Adotar **Vite + React + TypeScript** (com tipagem estrita `strict: true`) como stack de aplicação cliente.
- **Alternativas consideradas:**
  - *Next.js + React + TypeScript:* acrescenta complexidade de SSR/hidratação para uma tela 100% WebGL 2 que exige DOM de cliente, sem necessidade de rotas dinâmicas ou APIs no MVP. Rejeitada para o MVP.
- **Justificativa:** Vite entrega build rápido, HMR imediato durante desenvolvimento 3D, excelente árvore de *code splitting* e saída estática simples para qualquer CDN (Vercel, Cloudflare Pages, GitHub Pages), mantendo a pasta `public/assets/v1/` servida com cabeçalhos de cache versionado.
- **Consequências e Riscos:**
  - Caso fases futuras precisem de páginas institucionais multi-idioma indexáveis (SEO) ou APIs, a interface e o motor desacoplados permitem encapsular o módulo cliente ou adicionar uma camada BFF separada sem refatorar a cena.

---

## ADR-003 — Motor 3D com Three.js direto encapsulado (`AnatomyEngine`)

- **Status:** Aceita
- **Contexto:** A arquitetura recomendada na Seção 7.1 da spec separa claramente a interface HTML/React do adaptador de cena 3D e do renderizador WebGL. Além disso, as Seções 10.3, 11.2, 13.2 e 14 exigem controle rigoroso de: *raycasting* seletivo, histerese anti-tremor, suspensão em órbita, diferenciação toque vs. arrasto, projeção de etiquetas a 60 FPS sem *reflow* ou re-renders React por quadro, pausa em aba oculta e recuperação de `webglcontextlost`.
- **Decisão:** Utilizar **Three.js direto** encapsulado em uma fachada imperativa TypeScript (`AnatomyEngine` e seus sub-módulos `AssetLoader`, `MaterialManager`, `InteractionController` e `LabelProjector`) controlada por eventos e assinaturas da store única (`viewerStore`).
- **Alternativas consideradas:**
  - *React Three Fiber (`@react-three/fiber` + `@react-three/drei`):* aproxima a cena de JSX, mas acopla o grafo de objetos ao ciclo de reconciliação do React e adiciona uma camada extra de abstração sobre *raycasting* customizado, *context loss*, atualização direta de `transform` em elementos DOM e gerenciamento fino de materiais clonados. Rejeitada.
- **Justificativa:** O adaptador imperativo puro isola 100% o Three.js da árvore React, permite testar regras de interação e estado em Node/Vitest sem WebGL, elimina re-renders do React durante rotação de câmera ou movimentação de cursor e atende diretamente ao diagrama arquitetural da Seção 7.1.
- **Consequências e Riscos:**
  - Exige disciplina explícita de ciclo de vida (`mount()`, `dispose()`, limpeza de geometrias/materiais/listeners de ponteiro e `ResizeObserver`) para evitar vazamentos de memória em montagens duplicadas do `React.StrictMode` em desenvolvimento.

---

## ADR-004 — Estilização com CSS Modules + Design Tokens e HTML semântico/ARIA

- **Status:** Aceita
- **Contexto:** A interface deve ter estética médico-científica minimalista sobre fundo preto (`#000000`), alta legibilidade, responsividade de `320 px` até telas largas de desktop, alvos táteis `>= 44 × 44 px` e conformidade verificável com **WCAG 2.2 AA** (Seções 10.1, 14 e 15 da spec).
- **Decisão:** Utilizar **CSS Modules** combinados com um conjunto centralizado de **Design Tokens em CSS Custom Properties** (`tokens.css`) e componentes construídos sobre **HTML semântico nativo + atributos ARIA** (`role`, `aria-pressed`, `aria-live`, gerenciamento explícito de foco e fechamento por `Esc`).
- **Alternativas consideradas:**
  - *Tailwind CSS + Radix UI:* introduz dependências adicionais e utilitários de classe para uma interface intencionalmente enxuta (um punhado de controles flutuantes, uma gaveta pesquisável, dois modais e uma etiqueta projetada). Rejeitada.
- **Justificativa:** CSS Modules + tokens dão controle exato de contraste, tipografia, *safe areas*, media queries (`prefers-reduced-motion`, `pointer: coarse`, largura de `320 px`) e zero custo adicional de runtime CSS-in-JS.
- **Consequências e Riscos:**
  - Modais (`Como navegar`, `Créditos`) e a gaveta (`Estruturas`) exigirão implementação cuidadosa de *focus trap* ou uso disciplinado de gerenciamento de foco/tecla `Esc` e `aria-modal="true"`, o que será coberto diretamente por testes automatizados Playwright.

---

## ADR-005 — Convenção editorial de etiquetas, identificação e lista textual acessível

- **Status:** Aceita
- **Contexto:** A spec exige nomenclatura em PT-BR alinhada à *Terminologia Anatomica* (Seção 12), etiqueta legível sem poluir a tela (Seção 11.2) e uma lista textual pesquisável como requisito obrigatório de acessibilidade equivalente ao *hover* (Seção 15).
- **Decisão:**
  1. **Formato da etiqueta 2D projetada:** exibir título principal em **Português do Brasil** (ex.: `Músculo bíceps braquial`), subtítulo em **Latim** (*Terminologia Anatomica*, ex.: *Musculus biceps brachii*), e chips/indicadores textuais discretos de **sistema** (`Muscular` / `Ósseo`) e **lateralidade** (`Lado direito` / `Lado esquerdo`, forma neutra em gênero que permanece gramaticalmente correta tanto para ossos masculinos como *Úmero* quanto para estruturas femininas como *Escápula* e *Clavícula*).
  2. **Lista textual acessível (`StructureDrawer`):** apresentada como **gaveta recolhível sob demanda** (acionada pelo botão `Estruturas`) — painel lateral deslizante em desktop (`>= 768 px`) e *bottom-sheet* em mobile (`< 768 px`) — mantendo a área 3D desobstruída por padrão.
  3. **Ação ao selecionar na lista:** seleciona e realça a estrutura na cena, exibe sua etiqueta 2D projetada e **anima suavemente a câmera** para enquadrá-la (mudando para transição instantânea quando `prefers-reduced-motion: reduce` estiver ativo).
- **Alternativas consideradas:**
  - *Latim como título principal / apenas PT-BR na etiqueta:* reduz o imediatismo didático para estudantes de graduação no Brasil ou oculta a referência científica na inspeção visual rápida. Rejeitada.
  - *Painel lateral permanentemente aberto no desktop:* reduz área útil de visualização 3D em notebooks comuns (`1280×720`) e contraria a diretriz de interface mínima. Rejeitada.
  - *Selecionar na lista sem mover câmera:* se a estrutura estiver oculta atrás do membro ou fora do enquadramento atual após zoom, o usuário não enxergaria o realce. Rejeitada.
- **Justificativa:** Concilia a interface limpa ao abrir com acessibilidade completa por teclado/leitor de tela e navegação espacial guiada.
- **Consequências e Riscos:**
  - A animação de foco da câmera precisa ser imediatamente cancelável caso o usuário arraste o canvas ou role a roda do mouse durante a transição, evitando "briga" com a câmera.
  - Se o usuário selecionar na lista uma estrutura pertencente a uma camada atualmente oculta (ou filtrável), o fluxo deve deixar claro ou garantir que a lista respeite/explicite a camada visível (detalhado em [ux-interacao-e-acessibilidade.md](./ux-interacao-e-acessibilidade.md)).

---

## ADR-006 — Estado único de camadas e opacidade muscular experimental no modo "Ambos"

- **Status:** Aceita
- **Contexto:** Os requisitos `RF-03` (`Músculos | Ossos | Ambos`), `RF-04` (ocultação rápida de músculos) e `RF-07` (estratégia para ler ossos mesmo com músculos presentes) podem gerar contradições se controlados por estados separados (Seção 10.2 da spec). Além disso, decidiu-se incluir já na Fase 1 um controle experimental de opacidade da camada muscular quando `Ambos` estiver ativo.
- **Decisão:**
  1. Toda a visibilidade de camadas deriva de um único estado `visibleSystems: Set<'muscular' | 'skeletal'>`, com três estados válidos não vazios: `{'muscular'}`, `{'skeletal'}` e `{'muscular', 'skeletal'}`.
  2. O atalho `Mostrar músculos` reflete e modifica esse mesmo `Set`: desligá-lo quando apenas `muscular` estava ativo transita automaticamente para `{'skeletal'}` (nunca deixando a cena vazia); ligá-lo quando apenas `skeletal` estava ativo transita para `{'muscular', 'skeletal'}` (`Ambos`).
  3. Quando `Ambos` (`{'muscular', 'skeletal'}`) estiver ativo, exibe-se o controle experimental **Opacidade dos músculos** (`15%` a `100%`, padrão `100%`):
     - Em `100%`: materiais musculares permanecem **opacos** (`transparent: false`, `depthWrite: true`), evitando artefatos de ordenação alfa entre cabeças musculares.
     - Entre `15%` e `99%`: materiais musculares alternam para modo **translúcido** (`transparent: true`, `depthWrite: false`), permitindo enxergar o arcabouço ósseo através da musculatura.
     - Em opacidade `<= 25%` (modo "fantasma"): o *raycasting* ignora automaticamente a camada muscular e seleciona diretamente as estruturas ósseas subjacentes, evitando que músculos quase invisíveis bloqueiem o clique/hover nos ossos.
- **Alternativas consideradas:**
  - *Apenas ocultação binária no MVP:* atende o mínimo da spec, mas a exploração didática das relações espaciais (músculo sobre osso, inserções na escápula/úmero) ganha muito com translucidez controlada já validada em protótipo real na Fase 1.
  - *Permitir opacidade em `0%`:* redundante com o estado `Ossos` / atalho `Mostrar músculos` e confundiria o usuário sobre qual camada está ativa. Limitado ao mínimo de `15%`.
- **Justificativa:** Resolve a Seção 10.2 sem duplicação de estado e antecipa a validação de usabilidade da Seção 21 ("Política de transparência/cortes: pode ajudar ou confundir a leitura — validar em protótipo").
- **Consequências e Riscos:**
  - Transparência em WebGL (`depthWrite: false`) pode gerar pequenos artefatos visuais de sobreposição entre músculos anteriores e posteriores dependendo do ângulo de câmera; isso é mitigado mantendo `100%` (opaco) como padrão inicial e oferecendo o atalho instantâneo `Mostrar músculos` para leitura limpa do esqueleto.
