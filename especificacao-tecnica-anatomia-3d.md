# Anatomia 3D — Especificação técnica definitiva

**Versão:** 1.0  
**Status:** especificação para descoberta, aquisição de ativos e desenvolvimento  
**Plataformas-alvo:** navegadores modernos em computadores e dispositivos móveis

## 1. Resumo executivo

Anatomia 3D é uma aplicação web educacional de visualização livre de anatomia humana em três dimensões. A experiência central é um ambiente de fundo preto, com apresentação médico-científica de um corpo humano 3D e duas camadas anatômicas independentes: sistema muscular e sistema ósseo. A pessoa usuária poderá orbitar, aproximar, afastar e reposicionar o modelo; alternar entre músculos, ossos ou ambos; e identificar estruturas ao passar o cursor sobre elas. Em dispositivos táteis, a identificação será acionada por toque.

O produto **não pressupõe que já exista um modelo 3D compatível**. A seleção, aquisição e preparação de ativos anatômicos completos é uma etapa formal antes da implementação visual final.

## 2. Decisões confirmadas

| Tema | Decisão confirmada |
|---|---|
| Público | Estudantes que desejam estudar anatomia de forma didática |
| Conteúdo anatômico | Detalhamento anatômico completo, dentro dos limites de um ativo cientificamente validado |
| Estruturas iniciais | Músculos e ossos |
| Visualização | Livre, com manipulação 3D pelo usuário |
| Camadas | Músculos, ossos ou ambas simultaneamente |
| Identificação | Por *hover* sobre a estrutura; toque em telas táteis |
| Estilo | Médico/científico |
| Fundo | Preto |
| Dispositivos | Computadores e dispositivos móveis |

## 3. Visão do produto e objetivos

### 3.1 Proposta de valor

Permitir que estudantes explorem relações espaciais entre músculos e ossos sem uma interface visualmente poluída, identificando cada estrutura diretamente no modelo e controlando as camadas exibidas.

### 3.2 Objetivos

- Tornar a identificação anatômica visual, imediata e consistente.
- Oferecer exploração 3D fluida em desktop e celular.
- Preservar precisão de nomenclatura e representação anatômica.
- Permitir alternância clara entre musculatura, esqueleto e visão combinada.

### 3.3 Fora do escopo inicial

- Sistemas nervoso, circulatório, órgãos, pele e demais sistemas além de músculos e ossos.
- Simulação de movimento, fisiologia, patologia ou dissecação.
- Contas de usuário, progresso de estudo, avaliações, colaboração ou modo professor.
- Diagnóstico, orientação clínica ou uso como dispositivo médico.
- Conteúdo substitutivo de ensino supervisionado ou de referências médicas.

## 4. Escopo de entrega

### 4.1 MVP

O MVP deve conter:

1. Uma página web com fundo preto e visualização 3D do corpo humano.
2. Navegação livre: rotação orbital, zoom e deslocamento do enquadramento.
3. Controles de visibilidade mutuamente exclusivos para **Músculos**, **Ossos** e **Ambos**.
4. Opção explícita de ocultar músculos, inclusive quando a visão combinada estiver ativa, para observar melhor o esqueleto.
5. Estruturas musculares e ósseas selecionáveis/identificáveis individualmente.
6. Realce da estrutura sob cursor e etiqueta com seu nome científico/anatômico.
7. Equivalente por toque em dispositivos móveis.
8. Estado inicial, carregamento, ausência de suporte WebGL e falha de ativos tratados de forma compreensível.
9. Conteúdo e licença dos modelos documentados.

O termo “completo” no MVP significa cobrir todas as estruturas presentes no conjunto de ativos validado e no nível de detalhe contratado; não significa assumir cobertura anatômica total antes da auditoria do ativo.

### 4.2 Fases recomendadas

| Fase | Entrega | Condição de saída |
|---|---|---|
| 0 — Descoberta de ativos | Matriz de candidatos, prova de licença e auditoria anatômica | Ativo escolhido ou plano de produção aprovado |
| 1 — Protótipo técnico | Um conjunto pequeno de malhas com *hover*, camadas e controles | Viabilidade confirmada em desktop e celular de referência |
| 2 — MVP | Corpo completo de acordo com a matriz de cobertura aprovada | Critérios de aceite funcionais atendidos |
| 3 — Qualidade e validação | Correções científicas, desempenho, acessibilidade e testes | Aprovação por revisor anatômico e QA |
| 4 — Evolução | Busca, isolamento, detalhes, idiomas e sistemas adicionais | Priorização pós-uso real |

## 5. Requisitos funcionais

### RF-01 — Cena anatômica

O sistema deve exibir um modelo humano tridimensional em orientação anatômica, centralizado, com fundo preto e iluminação que favoreça leitura de forma e profundidade.

### RF-02 — Controle de câmera

O usuário deve poder:

- orbitar o modelo em todos os eixos úteis à inspeção;
- aplicar zoom dentro de limites definidos;
- deslocar o enquadramento;
- restaurar a vista anatômica inicial;
- usar mouse/trackpad no desktop e gestos de toque no móvel.

### RF-03 — Modos de camada

Deve haver controle visível com três estados: **Músculos**, **Ossos** e **Ambos**. O estado deve alterar somente a visibilidade das camadas, sem recarregar a página ou perder a posição da câmera.

### RF-04 — Ocultação muscular

Deve haver uma ação rápida para ocultar ou exibir a camada muscular. Quando músculos estiverem ocultos, estruturas ósseas continuam navegáveis e identificáveis.

### RF-05 — Identificação por apontamento

Em desktop, ao posicionar o cursor sobre uma estrutura visível, o sistema deve:

1. determinar a malha ou região anatômica atingida;
2. aplicar realce temporário sem alterar permanentemente o material original;
3. mostrar etiqueta legível com o nome anatômico científico configurado para a estrutura;
4. remover realce e etiqueta quando o cursor sair, salvo se futuramente houver modo de fixação.

### RF-06 — Identificação por toque

Em dispositivos sem cursor, um toque simples em uma estrutura deve abrir sua etiqueta e realçá-la. Um toque fora do modelo, no botão fechar ou na próxima estrutura deve encerrar/substituir a identificação ativa. Gestos de arrastar, pinçar e girar não devem disparar identificação acidental.

### RF-07 — Sobreposição de camadas

Quando “Ambos” estiver ativo, a estratégia visual deve permitir estudar os ossos apesar da musculatura. No MVP, isso é garantido pela ação de ocultar músculos; transparência parcial ou recortes anatômicos são extensões e precisam de validação de legibilidade.

### RF-08 — Etiquetas

Cada etiqueta deve exibir ao menos o nome científico/anatômico aprovado. O ponto de ancoragem deve acompanhar a projeção 3D da estrutura e não pode ficar ilegível, sobreposto ao controle principal ou fora da área visível. Para estruturas pequenas ou profundas, a etiqueta poderá apontar para um ponto de referência anatômico definido nos metadados.

### RF-09 — Recuperação de falhas

O sistema deve informar, em linguagem simples, indisponibilidade de WebGL/WebGPU suportado, falha ao carregar ativos e conexão insuficiente, com opção de tentar novamente quando aplicável.

## 6. Requisitos não funcionais

| Área | Requisito |
|---|---|
| Compatibilidade | Versões atuais e imediatamente anteriores de Chrome, Edge, Firefox e Safari; iOS Safari e Chrome Android atuais |
| Desempenho desktop | Meta de 50–60 FPS em hardware de referência; interação não deve travar durante troca de camada |
| Desempenho móvel | Meta de 30 FPS sustentáveis em aparelho de referência intermediário; modo de qualidade adaptativa permitido |
| Carregamento | Exibir progresso/estado; priorizar cena inicial interativa e carregamento progressivo de detalhes |
| Confiabilidade | Uma falha de uma estrutura não deve inutilizar toda a interface; registrar erro técnico sem dados pessoais |
| Manutenibilidade | Modelos, metadados, interfaces e renderização devem ser desacoplados; dados não devem ser codificados em componentes visuais |
| Privacidade | Nenhum dado pessoal é necessário ao MVP; telemetria, se adotada, deve ser agregada e informada |
| Acessibilidade | Atender WCAG 2.2 AA para a interface HTML; oferecer alternativa textual equivalente para identificação e controles |
| Idioma | Português do Brasil no MVP; dados devem permitir outros idiomas sem duplicação de malhas |

Os valores de desempenho são metas de aceitação e devem ser recalibrados após a escolha do ativo e definição dos aparelhos de referência.

## 7. Arquitetura e stack recomendada

### 7.1 Arquitetura

Aplicação web de página única, predominantemente cliente, composta por:

```text
Interface acessível (HTML/CSS/React)
        │
Estado de visualização e interação
        │
Adaptador de cena 3D ─── metadados anatômicos versionados
        │                         │
Renderizador WebGL ─── arquivos 3D otimizados / CDN
```

O backend não é requisito do MVP. Uma CDN/armazenamento de objetos pode servir ativos versionados. Caso sejam incluídos telemetria, catálogo remoto ou autenticação em fase posterior, eles devem ser serviços independentes da renderização.

### 7.2 Stack recomendada (não confirmada)

| Camada | Recomendação | Motivo |
|---|---|---|
| Aplicação | React + TypeScript + Vite ou Next.js | Ecossistema maduro e tipagem |
| Cena 3D | Three.js com React Three Fiber e Drei, ou Three.js direto | Controle de malhas, *raycasting*, carregamento e WebGL consolidado |
| Formato | glTF 2.0 binário (`.glb`) | Padrão web, materiais PBR e boa compatibilidade |
| Compressão geométrica | Meshopt preferencialmente; Draco após benchmark | Reduz transferência, com impacto de decodificação a medir |
| Texturas | KTX2/Basis Universal quando compatível | Menor memória e transferência |
| Interface | CSS responsivo, componentes acessíveis e ícones SVG | Controles claros e independentes da cena |
| Entrega | CDN com cache versionado | Arquivos 3D são pesados e devem ficar fora do bundle principal |
| Testes | Vitest, Playwright e testes visuais da cena | Cobertura de lógica, interação e regressões |

WebGPU pode ser investigado depois, mas WebGL 2 deve ser a base por disponibilidade. A escolha entre React Three Fiber e Three.js direto depende da equipe; não altera o contrato de ativos e metadados.

## 8. Organização dos modelos 3D e dados anatômicos

### 8.1 Princípios obrigatórios

- Músculos e ossos devem estar em **camadas lógicas separadas**.
- Cada estrutura identificável deve ter uma malha própria, ou submalha/grupo endereçável individualmente por identificador estável.
- Identificadores não podem depender do nome de arquivo, da ordem de nós no glTF ou do idioma exibido.
- Não se deve aceitar um único “corpo inteiro” fundido se ele impedir seleção, ocultação e metadados por estrutura.
- Materiais de realce devem ser aplicados em tempo de execução de forma reversível, preservando o material-base.

### 8.2 Hierarquia de cena sugerida

```text
HumanBody
├── skeletal-system
│   ├── bone.femur.left
│   ├── bone.femur.right
│   └── …
├── muscular-system
│   ├── muscle.biceps_brachii.left
│   ├── muscle.biceps_brachii.right
│   └── …
└── optional-reference-helpers (não renderizado na versão pública)
```

O conjunto final pode agrupar malhas para reduzir *draw calls*, desde que cada estrutura continue recuperável por ID para interação. Se uma estrutura exigir múltiplas peças geométricas, todas devem compartilhar o mesmo `anatomyId`.

### 8.3 Convenção de nomenclatura técnica

Usar `tipo.nome_latino.lateralidade[.parte]`, em minúsculas e com `_` para palavras compostas. Exemplos:

- `muscle.biceps_brachii.left`
- `bone.femur.right`
- `bone.vertebra_cervical.c3`

`left` e `right` referem-se ao lado anatômico do corpo, nunca à perspectiva da câmera. Nomes de exibição permanecem nos metadados, não no identificador técnico.

### 8.4 Esquema mínimo de metadados

```json
{
  "anatomyId": "muscle.biceps_brachii.left",
  "system": "muscular",
  "displayName": { "pt-BR": "Músculo bíceps braquial", "la": "Musculus biceps brachii" },
  "scientificName": "Musculus biceps brachii",
  "laterality": "left",
  "meshNodes": ["muscle.biceps_brachii.left"],
  "labelAnchor": [0.12, 1.35, 0.28],
  "source": { "assetVersion": "v1", "referenceIds": ["REF-001"] },
  "review": { "status": "approved", "reviewedBy": "role-or-id", "reviewedAt": "YYYY-MM-DD" }
}
```

Para publicação, `reviewedBy` deve identificar a credencial ou organização revisora conforme a política de privacidade aplicável, e não expor dados pessoais desnecessários.

### 8.5 Granularidade

A matriz de cobertura deve listar, para cada estrutura esperada, ID, camada, lateralidade, presença no ativo, nível de detalhe, nó(s) associado(s), nomenclatura e status de validação. A matriz é a fonte de verdade para alegações de “completo”.

## 9. Seleção, aquisição e preparação de ativos anatômicos

### 9.1 Critérios eliminatórios

Um candidato deve ser rejeitado ou considerado apenas como referência se não atender a todos os itens aplicáveis:

- licença compatível com publicação web, distribuição e uso educacional/comercial pretendido;
- origem e titularidade demonstráveis;
- autorização explícita para modificar, separar, otimizar e redistribuir derivados quando isso for necessário;
- cobertura de músculos e ossos no nível de detalhe pretendido;
- fidelidade anatômica verificável por profissional/revisor qualificado;
- possibilidade técnica de individualizar estruturas ou de receber arquivo-fonte adequado;
- formato ou pipeline de conversão viável para glTF 2.0;
- ausência de limitações contratuais que impeçam CDN, cache público ou uso em aplicativo web.

### 9.2 Critérios de avaliação ponderada

| Critério | Evidência exigida |
|---|---|
| Cobertura anatômica | Inventário por estrutura, lado e região |
| Separação de malhas | Arquivo-fonte e inspeção de hierarquia/material/grupos |
| Qualidade científica | Parecer de anatomista, fisioterapeuta, médico ou educador habilitado |
| Nomenclatura | Compatibilidade com *Terminologia Anatomica* e convenção aprovada |
| Qualidade geométrica | Topologia, normais, escala, ausência de interseções prejudiciais e LOD possível |
| Qualidade visual | Leitura de músculos, ossos e inserções conforme objetivo educacional |
| Otimização web | Triângulos, texturas, UVs e possibilidade de compressão |
| Licença e custo | Termos, atribuição, território, prazo, preço e suporte documentados |
| Manutenção | Atualizações, versão do ativo e disponibilidade de fonte |

### 9.3 Processo de preparação

1. Registrar o ativo original, fornecedor, versão, hash, licença e comprovantes.
2. Fazer inventário da hierarquia, nomes, unidades, orientação e estrutura existente.
3. Comparar o inventário com a matriz de cobertura definida com revisor científico.
4. Separar ou mapear malhas/submalhas por estrutura; nunca perder a relação com a fonte.
5. Corrigir escala, origem, eixos, normais, materiais e transparências sem introduzir distorção anatômica.
6. Criar pontos de ancoragem de etiquetas e metadados por estrutura.
7. Gerar LODs e otimizar geometrias/texturas com limites registrados.
8. Exportar `.glb`, validar em ferramentas independentes e testar no navegador-alvo.
9. Executar revisão visual/anatômica comparando o resultado publicado com o ativo fonte.
10. Versionar arquivos, metadados, matriz de cobertura e relatório de validação como uma unidade de lançamento.

### 9.4 Restrições importantes

Não é suficiente que um modelo “pareça anatômico”. Uma malha visualmente única de músculos, texturas pintadas ou nomenclatura não verificável não atende ao requisito de identificação individual. O custo de retopologia, segmentação manual e revisão deve ser avaliado contra a aquisição de um ativo-fonte mais adequado.

## 10. Interação e UX

### 10.1 Diretrizes visuais

- Fundo preto verdadeiro ou quase preto, com contraste suficiente nos controles e etiquetas.
- Paleta sóbria, com cores convencionais de atlas anatômico usadas com consistência; não depender exclusivamente de cor para diferenciar estados.
- Iluminação clínica e neutra, evitando estética de jogo, brilho excessivo ou texturas decorativas.
- Interface mínima: controles de camadas, ajuda de navegação, reiniciar vista e estado de carregamento.
- Área 3D prioritária; controles não devem ocultar regiões importantes em telas pequenas.

### 10.2 Controles propostos

- Grupo segmentado: `Músculos | Ossos | Ambos`.
- Botão/interruptor: `Mostrar músculos` quando o modo permitir ocultação rápida.
- Botão: `Redefinir visão`.
- Botão/área: `Como navegar`, com instruções curtas e acessíveis.

Não deve haver dois controles que produzam estados contraditórios. A modelagem de estado recomendada é `visibleSystems: Set<'muscular' | 'skeletal'>`, de onde os rótulos do controle são derivados.

### 10.3 Regras de seleção e *hover*

- Usar *raycasting* da posição de ponteiro para a cena, limitado às malhas visíveis e identificáveis.
- Priorizar a superfície mais próxima atingida; camadas ocultas não podem capturar eventos.
- Aplicar uma pequena tolerância contra tremor para evitar alternância rápida entre estruturas adjacentes.
- Em movimento de câmera, suspender abertura de etiqueta até o fim do gesto.
- Etiquetas devem evitar reflow excessivo; posição calculada a cada quadro somente enquanto necessárias.

## 11. Renderização e etiquetas

### 11.1 Materiais e realce

Materiais PBR devem priorizar legibilidade. O realce pode combinar contorno, aumento moderado de emissão/luminosidade e alteração de opacidade, desde que a estrutura permaneça reconhecível. Deve haver contraste visível sem tornar a etiqueta a única indicação de foco.

### 11.2 Etiquetas 2D projetadas

A abordagem recomendada é etiqueta HTML acessível, posicionada sobre a projeção 2D de um `labelAnchor` 3D. Ela deve:

- acompanhar a câmera e a estrutura;
- ser ocultada ou reposicionada quando ficar atrás da câmera;
- lidar com oclusão por meio de teste de profundidade ou regra de visibilidade aprovada;
- usar seta/linha curta para o ponto anatômico quando a posição for ambígua;
- evitar bordas da tela e colisão com controles, aplicando deslocamento quando necessário.

Etiquetas renderizadas exclusivamente em canvas são aceitáveis somente se houver alternativa acessível no DOM.

### 11.3 Oclusão

Como a identificação é de estruturas visíveis, a prioridade é a malha superficial. Para conteúdo interno ou parcialmente oculto, o MVP deve pedir ao usuário para mudar camada ou ângulo. Transparência seletiva, explosão de camadas e corte por plano são extensões posteriores.

## 12. Estratégia de dados e conteúdo

- Armazenar metadados em JSON versionado, separado dos componentes da aplicação.
- Validar o JSON por esquema (por exemplo, JSON Schema ou Zod) no processo de build/publicação.
- Registrar fonte bibliográfica e revisão de cada nomenclatura/estrutura.
- Adotar como referência terminológica a **Terminologia Anatomica** vigente e documentar as exceções didáticas em português.
- Manter `assetVersion` e `metadataVersion` compatíveis para impedir etiquetas apontando para nós inexistentes.
- Não carregar descrições longas no MVP; preparar o esquema para campo opcional de descrição, origem, inserção, ação e referências em evolução futura.

## 13. Desempenho e entrega de ativos

### 13.1 Orçamento inicial a validar

Os valores abaixo são guardrails, não fatos sobre um ativo ainda desconhecido:

| Item | Meta inicial |
|---|---|
| Primeiro carregamento útil em rede móvel razoável | cena simplificada/interativa antes do conjunto completo |
| Peso inicial transferido | definir após *benchmark*; evitar depender de arquivo único massivo |
| Geometria | LOD por plataforma e por distância; medir triângulos e *draw calls* |
| Texturas | Comprimir, limitar resolução por dispositivo e carregar sob demanda quando possível |
| Memória | Medir em dispositivos de referência; reduzir qualidade antes de falhar |

### 13.2 Técnicas recomendadas

- Carregamento progressivo: esqueleto ou visão de menor custo primeiro, detalhes depois.
- LODs por grupos anatômicos e qualidade adaptativa baseada em capacidade medida.
- Frustum culling e descarte de camadas ocultas.
- Compartilhamento de materiais quando não comprometer a identificação.
- Cache HTTP longo para ativos com nome versionado; manifesto curto para atualização.
- Suspender ou reduzir o ciclo de renderização quando a aba estiver invisível.

Otimizações de malha não podem fundir estruturas de modo que inviabilize *hover* e metadados individuais.

## 14. Responsividade e suporte móvel

- Interface deve funcionar de 320 px até telas largas de desktop, sem exigir orientação específica.
- Em telas pequenas, controles devem ficar em área alcançável e recolher instruções secundárias.
- Alvos de toque devem ter ao menos 44 × 44 px de área útil.
- Gestos: um dedo para orbitar, dois para zoom/deslocamento conforme a biblioteca escolhida; conflitos devem ser testados em iOS e Android reais.
- O toque que começa como arrasto não deve abrir etiqueta.
- Aplicar modo de qualidade reduzida automaticamente ou por escolha do usuário quando necessário, sem alterar dados anatômicos.

## 15. Acessibilidade

- Todos os controles devem ser navegáveis por teclado, com foco visível e rótulos programáticos.
- A interface deve anunciar mudanças de camada e erros relevantes por região de status apropriada.
- Disponibilizar painel/lista textual pesquisável das estruturas atualmente carregadas como alternativa ao *hover*; selecionar um item deve focalizar/realçar a estrutura quando possível.
- As informações essenciais de uma etiqueta devem existir no DOM e ser acessíveis a leitor de tela.
- Respeitar `prefers-reduced-motion`, reduzindo animações não essenciais.
- Garantir contraste WCAG AA em controles, texto e foco; não usar somente cor para estado de camada ou realce.
- Oferecer instruções de teclado para rotação e zoom, ou alternativa funcional equivalente para usuários que não possam manipular o canvas livremente.

A navegação 3D visual não possui equivalência perfeita em leitor de tela; a lista textual e o estado de seleção são requisitos, não complementos opcionais.

## 16. Segurança, privacidade e operação

- Servir a aplicação e ativos por HTTPS; aplicar Content Security Policy compatível com a entrega de modelos e texturas.
- Validar manifestos e metadados antes de publicação; restringir URLs externas não aprovadas.
- Tratar arquivos 3D de terceiros como conteúdo não confiável no pipeline de conversão; inspecionar dependências, tamanhos e formatos.
- Não coletar dados pessoais no MVP. Se houver análise de uso, usar dados mínimos, agregados e com aviso de privacidade aplicável.
- Não incluir alegações diagnósticas ou clínicas; apresentar aviso de uso educacional quando a política do produto exigir.
- Proteger chaves de serviços fora do cliente. O cliente não deve conter segredos.

## 17. Licenciamento e validação científica

### 17.1 Licenciamento

Antes de publicar, manter um dossiê por ativo contendo: contrato/licença, titular dos direitos, versão, permissões de uso/alteração/redistribuição, exigência de atribuição, restrições territoriais, prazo, custo e evidência de pagamento quando aplicável. A página deve apresentar créditos e atribuições exigidos pela licença.

### 17.2 Validação científica

O conteúdo deve passar por revisão de pessoa qualificada em anatomia humana. A revisão deve verificar ao menos:

- presença e identificação das estruturas da matriz de cobertura;
- lateralidade correta;
- forma, localização e relação espacial adequadas ao nível didático prometido;
- nomes em latim e português conforme convenção aprovada;
- ausência de rótulos enganadores ou sobreposição que induza erro;
- correções de geometria introduzidas durante otimização.

Toda aprovação deve estar vinculada a versões específicas do modelo e dos metadados. Uma alteração de ativo, segmentação ou nome exige revisão proporcional.

## 18. Critérios de aceite

### 18.1 Produto e interação

- [ ] Em desktop, é possível orbitar, aproximar, afastar, deslocar e restaurar a vista sem recarregar a página.
- [ ] Em móvel, gestos de toque permitem exploração equivalente e não conflitam de forma recorrente com a identificação.
- [ ] Os controles exibem corretamente apenas músculos, apenas ossos ou ambas as camadas.
- [ ] Ocultar músculos revela os ossos sem perda de controle da câmera.
- [ ] Ao apontar para uma estrutura visível e identificável, o nome correto aparece e a estrutura é realçada.
- [ ] Em toque, a identificação abre mediante toque simples e fecha/substitui de maneira previsível.
- [ ] A etiqueta permanece legível e não encobre sistematicamente o alvo ou controles principais.
- [ ] A aplicação informa falhas de carregamento e indisponibilidade gráfica de modo útil.

### 18.2 Dados e ciência

- [ ] Cada estrutura presente na matriz de cobertura possui `anatomyId`, camada, nó(s) de malha, nome aprovado, lateralidade quando aplicável e fonte/revisão.
- [ ] Nenhuma malha identificável depende de nome livre não versionado para ser encontrada.
- [ ] A matriz de cobertura foi revisada e assinada/aprovada pelo responsável científico definido.
- [ ] A versão publicada dos ativos corresponde à versão revisada.
- [ ] Licenças, créditos e permissões de derivados estão registrados e compatíveis com a publicação.

### 18.3 Qualidade

- [ ] Metas de FPS, memória e carregamento foram medidas nos dispositivos de referência acordados.
- [ ] A interface HTML atende aos testes WCAG 2.2 AA definidos e há alternativa textual de identificação.
- [ ] Testes de regressão cobrem troca de camadas, seleção, perda de contexto gráfico e carregamento de metadados.

## 19. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Ativo sem segmentação individual | Impede identificação e camadas corretas | Auditoria antes da compra; exigir fonte/estrutura demonstrável |
| Licença incompatível | Bloqueia lançamento | Análise jurídica/contratual antes de integrar ativos |
| “Completo” acima da cobertura real | Informação enganosa | Publicar matriz de cobertura e limitar comunicação ao conteúdo validado |
| Peso excessivo do modelo | Experiência móvel ruim | LOD, compressão, carregamento progressivo e orçamento medido |
| Etiquetas ambíguas em estruturas pequenas | Confusão didática | Pontos de ancoragem revisados, aproximação guiada futura e testes com estudantes |
| Oclusão entre músculos e ossos | Estruturas internas invisíveis | Controle de camadas no MVP; transparência/cortes em fase posterior |
| Erro de nomenclatura/lateralidade | Falha científica | Metadados versionados e revisão especializada |
| Diferenças entre navegadores/GPUs | Falha gráfica | Matriz de dispositivos, testes reais e tela de degradação |
| Interface só visual | Exclusão de usuários | Lista textual, teclado, foco e alternativa de seleção |

## 20. Backlog priorizado

### P0 — Necessário para o MVP

- Definir matriz de cobertura anatômica e responsável pela revisão científica.
- Selecionar/adquirir ativo compatível ou aprovar pipeline de produção/segmentação.
- Construir carregador glTF, metadados validados e mapeamento de nós.
- Implementar controles Músculos/Ossos/Ambos e ocultação muscular.
- Implementar câmera desktop e móvel.
- Implementar *raycasting*, realce e etiquetas por *hover* e toque.
- Implementar estados de carregamento/erro e alternativa textual acessível.
- Fazer testes de desempenho, navegadores e aparelhos de referência.
- Registrar licença, créditos e relatório de validação anatômica.

### P1 — Próxima evolução

- Pesquisa de estruturas por nome e focalização automática.
- Isolamento de uma estrutura e painel com descrição breve.
- Transparência controlada de músculos e visibilidade por grupos/regiões.
- Vistas anatômicas predefinidas (anterior, posterior, lateral).
- Idiomas adicionais e áudio/descrições didáticas.
- Preferência persistida de qualidade visual e camada.

### P2 — Expansões futuras

- Planos de corte, modo de dissecação e explosão controlada.
- Sistemas adicionais (nervoso, circulatório, órgãos).
- Trilhas de estudo, quiz, progresso e perfis.
- Comparação de estruturas e referências bibliográficas ricas.
- WebGPU, realidade aumentada ou realidade virtual após comprovação de valor.

## 21. Decisões técnicas ainda dependentes de validação

| Decisão pendente | Por que não está fechada | Evidência necessária |
|---|---|---|
| Fornecedor/ativo 3D | Nenhum modelo compatível foi confirmado | Auditoria de cobertura, malhas, qualidade e licença |
| Nível exato de “completo” | Depende de público, atlas e ativo disponível | Matriz de estruturas aprovada por revisor científico |
| Licença de publicação | Varia entre fornecedores e modelo de negócio | Contrato/licença revisados |
| Biblioteca final de renderização | Depende de equipe, protótipo e manutenção | Protótipo com *hover*, desempenho e acessibilidade |
| Estratégia de compressão e LOD | Depende da geometria/texturas reais | Benchmarks em aparelhos de referência |
| Política de transparência/cortes | Pode ajudar ou confundir a leitura | Testes de usabilidade e validação científica |
| Taxonomia em português/latim | Há escolhas didáticas e terminológicas | Convenção editorial aprovada |
| Dispositivos de referência | Meta de desempenho exige hardware definido | Dados de público-alvo e testes de mercado |
| Telemetria | Não é necessária ao MVP e envolve privacidade | Objetivo de produto e política de dados |

## 22. Próximos passos recomendados

1. Nomear um responsável científico e aprovar a matriz de cobertura mínima.
2. Solicitar arquivos de amostra e licenças de ativos candidatos antes de comprar ou contratar.
3. Executar um protótipo com poucas estruturas musculares e ósseas reais, incluindo desktop e celular.
4. Medir desempenho e validar as regras de *hover*/toque, etiquetas e camadas.
5. Só então fechar o ativo, o orçamento de otimização e o cronograma do MVP.

Essa sequência reduz o principal risco do projeto: projetar a interface em torno de capacidades que o ativo anatômico escolhido talvez não possua.
