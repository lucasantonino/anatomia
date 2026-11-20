# Contrato de Dados Anatômicos e Pipeline 3D

Este documento define o contrato formal entre os ativos 3D (`.glb`), os metadados anatômicos versionados (`.json`), a matriz de cobertura e o pipeline reproduzível em Node.js que converte as malhas originais do **BodyParts3D v3.0** para a unidade de lançamento `/assets/v1/`.

---

## 1. Convenção de Nomenclatura Técnica (`anatomyId`)

Em cumprimento à Seção 8.3 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md):

- **Formato canônico:** `tipo.nome_latino.lateralidade[.parte]`
- **Regex obrigatória de validação:**
  ```regex
  ^(bone|muscle)\.[a-z][a-z0-9_]*\.(left|right|midline)(\.[a-z0-9_]+)?$
  ```
- **Regras obrigatórias:**
  1. Tudo em letras minúsculas, ASCII, utilizando `_` para termos compostos (ex.: `pectoralis_major`, `biceps_brachii`). O radical `nome_latino` segue **Latim TA2 estrito** (`clavicula`, `scapula`, `deltoideus`, etc.).
  2. `left` e `right` referem-se **sempre à lateralidade anatômica do corpo humano**, nunca à esquerda ou direita da tela/câmera do observador.
  3. Estruturas ímpares/medianas futuras usarão `midline` (ex.: `bone.sternum.midline`, `bone.vertebra_cervical.midline.c3`).
  4. Estruturas compostas por múltiplas malhas anatômicas (ex.: cabeças do bíceps/tríceps ou porções do deltoide/peitoral maior) compartilham **um único `anatomyId`** na entidade de estrutura, enquanto seus nós individuais de geometria no `.glb` recebem sufixo técnico ASCII conciso `[.parte]` derivado das subdivisões FMA/TA2 e ficam listados no array `meshNodes` dos metadados. Na taxonomia macro de regiões da Fase 1, `"region": "upper_limb"` agrupa funcionalmente o cíngulo do membro superior, o membro superior e o músculo toracoapendicular anterior (*peitoral maior*).

---

## 2. Hierarquia Obrigatória nos Arquivos `.glb`

A Fase 1 entrega os sistemas separados em dois arquivos binários glTF 2.0 (`.glb`) para suportar carregamento progressivo (esqueleto primeiro, musculatura em seguida):

### `skeletal-v1.glb`
```text
HumanBody (Group)
└── skeletal-system (Group)
    ├── bone.clavicula.right      (Mesh, extras: { anatomyId: "bone.clavicula.right", system: "skeletal", fmaId: "FMA13322" })
    ├── bone.clavicula.left       (Mesh, extras: { anatomyId: "bone.clavicula.left", system: "skeletal", fmaId: "FMA13323" })
    ├── bone.scapula.right        (Mesh, extras: { anatomyId: "bone.scapula.right", system: "skeletal", fmaId: "FMA13395" })
    ├── bone.scapula.left         (Mesh, extras: { anatomyId: "bone.scapula.left", system: "skeletal", fmaId: "FMA13396" })
    ├── bone.humerus.right        (Mesh, ... )
    ├── bone.humerus.left         (Mesh, ... )
    ├── bone.radius.right         (Mesh, ... )
    ├── bone.radius.left          (Mesh, ... )
    ├── bone.ulna.right           (Mesh, ... )
    └── bone.ulna.left            (Mesh, ... )
```

### `muscular-v1.glb`
```text
HumanBody (Group)
└── muscular-system (Group)
    ├── muscle.deltoideus.right.clavicular        (Mesh, extras: { anatomyId: "muscle.deltoideus.right", system: "muscular", fmaId: "FMA34680" })
    ├── muscle.deltoideus.right.acromial          (Mesh, extras: { anatomyId: "muscle.deltoideus.right", system: "muscular", fmaId: "FMA34682" })
    ├── muscle.deltoideus.right.spinal            (Mesh, extras: { anatomyId: "muscle.deltoideus.right", system: "muscular", fmaId: "FMA34684" })
    ├── ... (deltoide esquerdo, peitoral maior dir./esq., bíceps dir./esq., braquial dir./esq., tríceps dir./esq., braquiorradial dir./esq.)
```

**Regras de integridade de nós:**
- Nenhum nó identificável pode depender de índice de array ou de nome livre em inglês/português.
- Todas as 36 malhas possuem `node.name` exato listado em `meshNodes[]` e `extras.anatomyId` apontando para um dos 22 registros em `metadata-v1.json`.
- A otimização de malha nunca pode fundir (`join`) nós pertencentes a `anatomyId` diferentes.

---

## 3. Schemas dos Arquivos JSON Versionados

Todos os arquivos JSON residem em `public/assets/v1/` e são validados por **Zod** tanto no script de build (`scripts/validate-assets.mjs`) quanto em tempo de execução (`AssetLoader.ts`).

### 3.1 `manifest.json`

Centraliza versão, integridade, sistema de coordenadas e URLs da unidade de lançamento:

```json
{
  "schemaVersion": "1.0.0",
  "assetVersion": "v1",
  "metadataVersion": "v1",
  "coverageMatrixVersion": "v1",
  "coordinateSystem": "gltf-y-up-meters-anterior-pos-z",
  "sceneOriginOffset": [0, -1.12, 0.08],
  "metadataUrl": "/assets/v1/metadata-v1.json",
  "coverageMatrixUrl": "/assets/v1/coverage-matrix.json",
  "systems": {
    "skeletal": {
      "url": "/assets/v1/skeletal-v1.glb",
      "sha256": "<64-hex>",
      "bytes": 412000,
      "triangles": 34000,
      "meshCount": 10
    },
    "muscular": {
      "url": "/assets/v1/muscular-v1.glb",
      "sha256": "<64-hex>",
      "bytes": 980000,
      "triangles": 62000,
      "meshCount": 26
    }
  },
  "license": {
    "sourceName": "BodyParts3D v3.0 (DBCLS)",
    "spdxOrIdentifier": "CC-BY-SA-2.1-JP",
    "attributionText": "BodyParts3D, Copyright 2008 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan.",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en"
  }
}
```

### 3.2 `metadata-v1.json`

Segue rigorosamente o esquema da Seção 8.4 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md), preparado para evolução P1 sem quebra de contrato:

```json
{
  "schemaVersion": "1.0.0",
  "assetVersion": "v1",
  "metadataVersion": "v1",
  "terminologyReference": "Terminologia Anatomica (TA2)",
  "generatedAt": "2026-11-20T00:00:00Z",
  "structures": [
    {
      "anatomyId": "muscle.biceps_brachii.left",
      "system": "muscular",
      "laterality": "left",
      "region": "upper_limb",
      "displayName": {
        "pt-BR": "Músculo bíceps braquial",
        "la": "Musculus biceps brachii"
      },
      "scientificName": "Musculus biceps brachii",
      "meshNodes": [
        "muscle.biceps_brachii.left.short_head",
        "muscle.biceps_brachii.left.long_head"
      ],
      "labelAnchor": [0.215, 0.042, 0.038],
      "boundingBox": {
        "min": [0.16, -0.11, -0.02],
        "max": [0.26, 0.19, 0.07]
      },
      "source": {
        "assetVersion": "v1",
        "referenceIds": ["BP3D-v3.0"],
        "fmaIds": ["FMA37685", "FMA37687"]
      },
      "review": {
        "status": "pending_review",
        "reviewedBy": "unassigned",
        "reviewedAt": null
      }
    }
  ]
}
```

**Campos opcionais reservados no schema Zod para P1 (não populados com texto longo no MVP, conforme Seção 12):**
- `description?: Record<'pt-BR', string>`
- `origin?: Record<'pt-BR', string>`
- `insertion?: Record<'pt-BR', string>`
- `action?: Record<'pt-BR', string>`

### 3.3 `coverage-matrix.json`

Representação legível por máquina de [matriz-de-cobertura.md](./matriz-de-cobertura.md), contendo `coverageMatrixVersion`, `scopeStatement` (declarando explicitamente o recorte da Fase 1), lista de estruturas esperadas com `anatomyId`, `system`, `laterality`, `presentInAsset: true`, `detailLevel: "segmentado_por_estrutura_e_subpartes"`, `meshNodes`, `fmaIds` e `reviewStatus`.

---

## 4. Prova Matemática da Conversão de Coordenadas (BodyParts3D → glTF 2.0)

Os arquivos originais em `Kevin-Mattheus-Moerman/BodyParts3D` (espelho STL binário do BodyParts3D v3.0) estão em **milímetros** no referencial médico original do projeto:

### Evidência medida nos STLs binários originais (em mm)

| FMA ID | Estrutura anatômica | Triângulos brutos | Centro medido `(x, y, z)` mm | Min → Max `(x, y, z)` mm |
|---|---|---|---|---|
| `FMA13322` | Clavícula direita | 5.112 | `(-80.7, -97.0, 1349.3)` | `[-150.0, -146.8, 1331.8]` → `[-11.4, -47.2, 1366.9]` |
| `FMA13323` | Clavícula esquerda | 5.140 | `(+79.4, -97.0, 1349.3)` | `[+10.1, -146.8, 1331.8]` → `[+148.7, -47.2, 1366.8]` |
| `FMA13395` | Escápula direita (posterior à clavícula) | 113.256 | `(-114.0, -43.9, 1280.7)` | `[-168.7, -99.1, 1201.5]` → `[-59.3, +11.4, 1359.8]` |
| `FMA23464` | Rádio direito (inferior ao ombro) | 2.804 | `(-250.3, -90.5, 930.8)` | `[-280.2, -123.8, 816.0]` → `[-220.3, -57.1, 1045.5]` |

### Dedução dos eixos originais do BodyParts3D
1. `FMA13323` (clavícula esquerda anatômica) tem $x > 0$ (`+79.4`) e `FMA13322` (clavícula direita anatômica) tem $x < 0$ (`-80.7`) → **`+X` é a esquerda anatômica**.
2. `FMA13322` (clavícula, altura do ombro) tem $z \approx 1349\text{ mm}$ e `FMA23464` (rádio, antebraço) tem $z \approx 931\text{ mm}$ → **`+Z` é superior (cranial)**.
3. `FMA13322` (clavícula, anterior) tem $y \approx -97.0\text{ mm}$ e `FMA13395` (escápula, posterior) tem $y \approx -43.9\text{ mm}$ (atingindo `+11.4`) → **`-Y` é anterior e `+Y` é posterior**.

### Transformação exata para glTF 2.0 (metros, Y-up, anterior em `+Z`)

Para um vértice $(x, y, z)$ em milímetros do STL original, aplica-se escala uniforme para metros ($10^{-3}$) seguida de rotação rígida de $-90^\circ$ ao redor do eixo $X$:

$$
\begin{bmatrix} x_{\text{glTF}} \\ y_{\text{glTF}} \\ z_{\text{glTF}} \end{bmatrix}
=
\frac{1}{1000}
\begin{bmatrix}
1 & 0 & 0 \\
0 & 0 & 1 \\
0 & -1 & 0
\end{bmatrix}
\begin{bmatrix} x_{\text{bp3d}} \\ y_{\text{bp3d}} \\ z_{\text{bp3d}} \end{bmatrix}
=
\begin{bmatrix}
x_{\text{bp3d}} / 1000 \\
z_{\text{bp3d}} / 1000 \\
-y_{\text{bp3d}} / 1000
\end{bmatrix}
$$

**Propriedades críticas verificadas:**
- O determinante da matriz de rotação é $\det = 1 \cdot (0 \cdot 0 - 1 \cdot (-1)) = +1$. Trata-se de **rotação pura no espaço $\text{SO}(3)$**, sem reflexão/espelhamento.
- Portanto, a lateralidade esquerda/direita anatômica e o sentido dos triângulos (*counter-clockwise winding order* / normais externas) são **100% preservados**.
- Em glTF resultante: `+X` permanece sendo a **esquerda anatômica** (que aparece corretamente à direita da tela quando o modelo olha de frente para o observador em `+Z`), `+Y` é **superior** e `+Z` é **anterior**.

### Centralização da cena da Fase 1 (`sceneOriginOffset`)
Após converter todos os 36 arquivos para metros:
1. Calcula-se a *bounding box* global combinada de todo o recorte (ossos + músculos).
2. Centraliza-se apenas nos eixos `Y` e `Z` subtraindo `(0, centerY, centerZ)`, mantendo `X = 0` exatamente sobre o plano sagital mediano do corpo.
3. O vetor `sceneOriginOffset = [0, -centerY, -centerZ]` é gravado no `manifest.json` para reprodutibilidade exata e alinhamento de coordenadas com futuros sistemas da Fase 2.

---

## 5. Pipeline Reproduzível (`scripts/build-assets.mjs`)

### Fonte dos arquivos brutos
- Repositório verificado: `Kevin-Mattheus-Moerman/BodyParts3D` (branch `main`, BodyParts3D v3.0).
- Padrão de download: `https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl/<FMAID>.stl`.
- Cache local em `.cache/bodyparts3d/` (listado no `.gitignore` para não versionar ~53 MB de STLs brutos repetidamente no Git; os `.glb` otimizados e manifestos ficam em `public/assets/v1/`).

### Etapas de processamento por malha
1. **Download e verificação de integridade:** baixa os 36 STLs (usando cache local se o arquivo existir e bater o tamanho/hash esperado) e calcula o **SHA-256** de cada STL bruto para registro em [dossie-licenciamento.md](./dossie-licenciamento.md).
2. **Parsing binário STL:** lê contagem de triângulos (`uint32` offset 80), extrai vértices (`float32`), aplica a matriz de transformação em metros + `sceneOriginOffset` e constrói geometria indexada no `Document` via `@gltf-transform/core`.
3. **Soldagem e normais suaves (`weld`):** remove vértices duplicados inerentes ao formato STL (que armazena 3 vértices desconexos por triângulo) e recalcula normais suaves por vértice com ângulo limite apropriado, eliminando aspecto facetado.
4. **Simplificação controlada (`simplify` com `meshoptimizer`):**
   - Os STLs brutos somam ~57,1 MB (~54,5 MiB) e ~1,14 milhão de triângulos (cada escápula isolada tem ~113k–122k triângulos; os músculos variam de ~7,5k a ~73,6k triângulos).
   - A simplificação reduz mantendo fidelidade de contorno, acidentes ósseos (espinha da escápula, processo coracoide, cabeça do úmero, olécrano, processos estiloides) e inserções anatômicas, dentro de um orçamento calibrado por peça (~1.300 a 5.500 triângulos, preservando densidade em ossos delgados como rádio/ulna/clavícula).
   - **Orçamento total alvo da Fase 1:** `<= 100.000` triângulos somando as 36 malhas (~94k planejados) e `<= 3,0 MB` somando `skeletal-v1.glb` + `muscular-v1.glb`.
5. **Quantização e compressão:** aplica `quantize()` seguido de `EXT_meshopt_compression` via `@gltf-transform/extensions` e `meshoptimizer`.
6. **Cálculo determinístico de `labelAnchor` e direção de foco (`focusDirection`):**
   - Para cada uma das 22 estruturas (agregando vértices e normais de `meshNodes[]`), projeta um ponto-guia externo usando `anchorDirection` e `yBias` anatômicos (anterossuperior para clavícula; posterior para escápula e tríceps; anterolateral para úmero, rádio, braquiorradial e porção distal do braquial; anteromedial para ulna; lateral para deltoide; anterior para peitoral maior e bíceps) e seleciona o **vértice real da superfície externa** (`dot(normal, anchorDirection) > 0.25`) mais próximo, garantindo que a âncora nunca caia no interior oco nem atrás de estrutura oclusora e permaneça contida na `boundingBox`.
   - Opcionalmente grava `focusDirection: [x, y, z]` (vetor unitário em coordenadas glTF calibrado para não atravessar o tórax) para uso por `AnatomyEngine.focusStructure()`.
7. **Emissão atômica:** grava `skeletal-v1.glb`, `muscular-v1.glb`, `metadata-v1.json`, `coverage-matrix.json` e `manifest.json` (com SHA-256 e contagem real de bytes/triângulos/malhas dos `.glb` finais).

---

## 6. Gate Automatizado de Validação (`scripts/validate-assets.mjs`)

O comando `npm run validate:assets` (executado após `build:assets` e no pipeline de CI antes do build de produção) falha com código de saída diferente de zero se qualquer uma das 9 verificações abaixo falhar:

1. **Validação Zod de contratos:** `manifest.json`, `metadata-v1.json` e `coverage-matrix.json` passam 100% nos schemas Zod de `src/core/schema/anatomy.ts`.
2. **Coerência de versões:** `manifest.assetVersion === metadata.assetVersion` e `manifest.metadataVersion === metadata.metadataVersion`.
3. **Integridade binária:** os arquivos `.glb` apontados existem em disco e possuem `sha256` e `bytes` idênticos aos declarados no `manifest.json`.
4. **Convenção de IDs:** 100% dos `anatomyId` respeitam a regex `^(bone|muscle)\.[a-z][a-z0-9_]*\.(left|right|midline)(\.[a-z0-9_]+)?$`.
5. **Correspondência 1:1 com a Matriz de Cobertura:** o conjunto de `anatomyId` em `metadata-v1.json` coincide exatamente com o de `coverage-matrix.json`.
6. **Zero nós órfãos ou ausentes nos `.glb`:** todo nome listado em `meshNodes[]` existe como nó de malha no `.glb` correspondente (sob `skeletal-system` ou `muscular-system`), e nenhuma malha identificável dentro dos `.glb` fica sem entrada em `metadata-v1.json`.
7. **Sanidade geométrica de `labelAnchor`:** cada `labelAnchor` possui 3 números finitos contidos dentro da `boundingBox` (com tolerância máxima de 5 mm) da respectiva estrutura.
8. **Orçamento de entrega web:** soma de triângulos `<= 120.000` (alvo `<= 100.000`) e tamanho total dos dois `.glb` `<= 4,0 MB` (alvo `<= 3,0 MB`).
9. **Sanidade anatômica de lateralidade:** todas as 18 malhas `right` possuem `centroid.x < 0` e todas as 18 malhas `left` possuem `centroid.x > 0` em coordenadas glTF, com simetria bilateral verificada entre pares antímeros.

---

## 7. Caminho de Evolução para a Fase 2 (Corpo Completo)

O contrato acima foi desenhado para escalar ao corpo humano completo sem alterar o código de renderização, estado ou UI:

- **Opção A (BodyParts3D completo):** expandir o catálogo em `scripts/anatomy-catalog.mjs` para incluir os demais ossos e músculos dentre os 937 arquivos STL disponíveis no repositório, agrupando por regiões (`head_neck`, `trunk`, `upper_limb`, `lower_limb`) e mantendo `skeletal-v2.glb` + `muscular-v2.glb` (ou divisão por regiões/LODs sob o mesmo `manifest.json`).
- **Opção B (Z-Anatomy completo via Blender):** exportar um `.glb` de Z-Anatomy seguindo a mesma árvore `HumanBody > skeletal-system / muscular-system` e convenção `extras.anatomyId`, alimentando o mesmo `validate-assets.mjs` e mantendo exatamente os mesmos `anatomyId` alinhados à *Terminologia Anatomica*.
