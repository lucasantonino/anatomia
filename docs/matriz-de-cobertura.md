# Matriz de Cobertura Anatômica — Fase 1 (v1)

Em cumprimento às Seções 4.1, 8.5 e 17.2 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md), esta matriz é a **fonte de verdade oficial** sobre quais estruturas existem na versão `v1` dos ativos 3D, seus identificadores técnicos estáveis, nós de malha, equivalência FMA no BodyParts3D v3.0 e status de revisão científica.

> [!IMPORTANT]
> **Declaração de escopo da v1:** Esta versão contempla um **recorte regional selecionado dos principais ossos (cíngulo do membro superior, braço e antebraço — sem ossos da mão) e principais músculos** da cintura escapular e do membro superior bilateral (**22 estruturas anatômicas** — 10 ossos e 12 músculos — compostas por **36 malhas STL reais** do BodyParts3D v3.0). **Não cobre** ossos da mão, manguito rotador, cabeça, coluna vertebral, caixa torácica óssea, abdome ou membros inferiores; a cobertura completa do corpo humano pertence à Fase 2.

---

## 1. Resumo Quantitativo da Cobertura (`v1`)

| Sistema | Região anatômica | Estruturas | Lateralidade | Malhas-fonte (STL) | Status de revisão |
|---|---|---|---|---|---|
| Ósseo (`skeletal`) | Cintura escapular e membro superior | 10 | 5 pares bilaterais (`right`/`left`) | 10 | `pending_review` |
| Muscular (`muscular`) | Cintura escapular, peitoral e membro superior | 12 | 6 pares bilaterais (`right`/`left`) | 26 | `pending_review` |
| **Total v1** | **Cintura escapular + membro superior** | **22** | **11 pares bilaterais** | **36** | **`pending_review`** |

---

## 2. Sistema Ósseo (`skeletal-system` — 10 estruturas / 10 malhas)

Todas as estruturas abaixo possuem nó único em `skeletal-v1.glb` e correspondência verificada com o repositório `Kevin-Mattheus-Moerman/BodyParts3D`.

| # | `anatomyId` | Nome em PT-BR | Nome Científico (*TA2* / Latim) | Lado | FMA ID (BodyParts3D v3.0) | Tamanho STL bruto | `meshNodes` no `.glb` | Revisão |
|---|---|---|---|---|---|---|---|---|
| 1 | `bone.clavicula.right` | Clavícula | *Clavicula* | `right` | `FMA13322` | 255.684 B | `["bone.clavicula.right"]` | `pending_review` |
| 2 | `bone.clavicula.left` | Clavícula | *Clavicula* | `left` | `FMA13323` | 257.084 B | `["bone.clavicula.left"]` | `pending_review` |
| 3 | `bone.scapula.right` | Escápula | *Scapula* | `right` | `FMA13395` | 5.662.884 B | `["bone.scapula.right"]` | `pending_review` |
| 4 | `bone.scapula.left` | Escápula | *Scapula* | `left` | `FMA13396` | 6.090.884 B | `["bone.scapula.left"]` | `pending_review` |
| 5 | `bone.humerus.right` | Úmero | *Humerus* | `right` | `FMA23130` | 813.484 B | `["bone.humerus.right"]` | `pending_review` |
| 6 | `bone.humerus.left` | Úmero | *Humerus* | `left` | `FMA23131` | 824.684 B | `["bone.humerus.left"]` | `pending_review` |
| 7 | `bone.radius.right` | Rádio | *Radius* | `right` | `FMA23464` | 140.284 B | `["bone.radius.right"]` | `pending_review` |
| 8 | `bone.radius.left` | Rádio | *Radius* | `left` | `FMA23465` | 135.784 B | `["bone.radius.left"]` | `pending_review` |
| 9 | `bone.ulna.right` | Ulna | *Ulna* | `right` | `FMA23467` | 179.684 B | `["bone.ulna.right"]` | `pending_review` |
| 10 | `bone.ulna.left` | Ulna | *Ulna* | `left` | `FMA23468` | 176.984 B | `["bone.ulna.left"]` | `pending_review` |

---

## 3. Sistema Muscular (`muscular-system` — 12 estruturas / 26 malhas)

No BodyParts3D v3.0, músculos compostos por múltiplas porções ou cabeças são fornecidos em arquivos STL separados. O pipeline preserva a individualidade geométrica como sub-nós em `muscular-v1.glb` e os associa ao mesmo `anatomyId` via `meshNodes[]`, garantindo seleção e realce unificados para o estudante.

| # | `anatomyId` | Nome em PT-BR | Nome Científico (*TA2* / Latim) | Lado | FMA IDs e Sub-partes (BodyParts3D v3.0) | `meshNodes` no `.glb` | Revisão |
|---|---|---|---|---|---|---|---|
| 11 | `muscle.deltoideus.right` | Músculo deltoide | *Musculus deltoideus* | `right` | `FMA34680` (clavicular, 1.454.184 B)<br>`FMA34682` (acromial, 1.484.184 B)<br>`FMA34684` (espinal, 2.200.584 B) | `["muscle.deltoideus.right.clavicular", "muscle.deltoideus.right.acromial", "muscle.deltoideus.right.spinal"]` | `pending_review` |
| 12 | `muscle.deltoideus.left` | Músculo deltoide | *Musculus deltoideus* | `left` | `FMA34681` (clavicular, 1.424.384 B)<br>`FMA34683` (acromial, 1.453.884 B)<br>`FMA34685` (espinal, 2.231.484 B) | `["muscle.deltoideus.left.clavicular", "muscle.deltoideus.left.acromial", "muscle.deltoideus.left.spinal"]` | `pending_review` |
| 13 | `muscle.pectoralis_major.right` | Músculo peitoral maior | *Musculus pectoralis major* | `right` | `FMA34690` (clavicular, 466.584 B)<br>`FMA79979` (esternocostal, 1.800.784 B)<br>`FMA45874` (abdominal, 377.384 B) | `["muscle.pectoralis_major.right.clavicular", "muscle.pectoralis_major.right.sternocostal", "muscle.pectoralis_major.right.abdominal"]` | `pending_review` |
| 14 | `muscle.pectoralis_major.left` | Músculo peitoral maior | *Musculus pectoralis major* | `left` | `FMA34691` (clavicular, 460.684 B)<br>`FMA79980` (esternocostal, 1.789.984 B)<br>`FMA45875` (abdominal, 373.484 B) | `["muscle.pectoralis_major.left.clavicular", "muscle.pectoralis_major.left.sternocostal", "muscle.pectoralis_major.left.abdominal"]` | `pending_review` |
| 15 | `muscle.biceps_brachii.right` | Músculo bíceps braquial | *Musculus biceps brachii* | `right` | `FMA37684` (cabeça curta, 1.392.084 B)<br>`FMA37686` (cabeça longa, 1.613.384 B) | `["muscle.biceps_brachii.right.short_head", "muscle.biceps_brachii.right.long_head"]` | `pending_review` |
| 16 | `muscle.biceps_brachii.left` | Músculo bíceps braquial | *Musculus biceps brachii* | `left` | `FMA37685` (cabeça curta, 1.435.484 B)<br>`FMA37687` (cabeça longa, 1.645.384 B) | `["muscle.biceps_brachii.left.short_head", "muscle.biceps_brachii.left.long_head"]` | `pending_review` |
| 17 | `muscle.brachialis.right` | Músculo braquial | *Musculus brachialis* | `right` | `FMA37668` (1.749.484 B) | `["muscle.brachialis.right"]` | `pending_review` |
| 18 | `muscle.brachialis.left` | Músculo braquial | *Musculus brachialis* | `left` | `FMA37669` (1.734.384 B) | `["muscle.brachialis.left"]` | `pending_review` |
| 19 | `muscle.triceps_brachii.right` | Músculo tríceps braquial | *Musculus triceps brachii* | `right` | `FMA37695` (cabeça medial, 1.344.084 B)<br>`FMA37697` (cabeça lateral, 1.815.684 B)<br>`FMA37699` (cabeça longa, 1.975.784 B) | `["muscle.triceps_brachii.right.medial_head", "muscle.triceps_brachii.right.lateral_head", "muscle.triceps_brachii.right.long_head"]` | `pending_review` |
| 20 | `muscle.triceps_brachii.left` | Músculo tríceps braquial | *Musculus triceps brachii* | `left` | `FMA37696` (cabeça medial, 1.311.384 B)<br>`FMA37698` (cabeça lateral, 1.798.784 B)<br>`FMA37700` (cabeça longa, 1.906.484 B) | `["muscle.triceps_brachii.left.medial_head", "muscle.triceps_brachii.left.lateral_head", "muscle.triceps_brachii.left.long_head"]` | `pending_review` |
| 21 | `muscle.brachioradialis.right` | Músculo braquiorradial | *Musculus brachioradialis* | `right` | `FMA38486` (3.658.084 B) | `["muscle.brachioradialis.right"]` | `pending_review` |
| 22 | `muscle.brachioradialis.left` | Músculo braquiorradial | *Musculus brachioradialis* | `left` | `FMA38487` (3.677.984 B) | `["muscle.brachioradialis.left"]` | `pending_review` |

---

## 4. Convenção Terminológica e Exceções Didáticas Documentadas

- **Referência principal:** *Terminologia Anatomica* (TA2 / Federação Internacional das Associações de Anatomistas — IFAA) e adaptação oficial em língua portuguesa adotada no ensino médico e de fisioterapia no Brasil.
- **Ortografia e padrão PT-BR adotado:**
  - *Músculo deltoide* (sem acento agudo conforme Acordo Ortográfico vigente).
  - *Músculo peitoral maior* (equivalente didático em português para *Musculus pectoralis major*).
  - Nomes ósseos em forma direta sem redundância desnecessária na etiqueta (*Clavícula*, *Escápula*, *Úmero*, *Rádio*, *Ulna*), mantendo o subtítulo em Latim (*Clavicula*, *Scapula*, etc.) e o chip de camada `Ósseo`.
  - Lateralidade exibida na interface como `Lado direito` / `Lado esquerdo` para evitar ambiguidades de gênero gramatical e impedir confusão com o lado direito/esquerdo da tela do observador.
  - **Notas terminológicas TA2:** na *Terminologia Anatomica* (TA2/SBA), o termo formal correspondente à expressão didática "cintura escapular" é **cíngulo do membro superior** (*Cingulum membri superioris*), e a porção espinal do músculo deltoide denomina-se formalmente *Pars spinalis scapularis*. Na taxonomia macro de 4 regiões da Fase 1, o músculo peitoral maior (toracoapendicular anterior) é agrupado funcionalmente em `"region": "upper_limb"`.

---

## 5. Protocolo de Revisão Científica (Seção 17.2)

Conforme decidido na [ADR-001](./adr-decisoes-arquiteturais.md), todas as 22 estruturas da Fase 1 nascem com `review.status = "pending_review"`, pois ainda não há revisor anatômico nomeado nesta fase. Antes de promover qualquer versão para uso público definitivo (Fase 3), um profissional qualificado (anatomista, médico, fisioterapeuta ou docente de anatomia humana) deverá executar o checklist abaixo vinculado ao par imutável `assetVersion` + `metadataVersion`:

- [ ] **Presença e completude:** as 22 estruturas listadas nesta matriz estão presentes e identificáveis na cena 3D.
- [ ] **Lateralidade anatômica correta:** todas as 11 estruturas `right` correspondem ao antímero direito do modelo e as 11 `left` ao antímero esquerdo (e não ao lado da tela).
- [ ] **Relações espaciais após otimização:** a simplificação Meshopt não deformou acidentes ósseos principais (espinha da escápula, cabeça do úmero, olécrano, processo estiloide) nem fundiu ventres musculares distintos.
- [ ] **Nomenclatura PT-BR e Latim:** grafia e concordância aprovadas de acordo com a *Terminologia Anatomica* vigente e convenção didática adotada.
- [ ] **Pontos de ancoragem (`labelAnchor`):** nenhuma etiqueta aponta para o vazio, para uma estrutura vizinha errada ou para o interior oculto de outra peça.
- [ ] **Oclusão e transparência:** no modo `Ambos` com opacidade reduzida, a leitura dos ossos sob deltoide, bíceps, braquial e peitoral maior não induz erro anatômico.

**Registro futuro de aprovação:**
- **Versão dos ativos avaliada:** `v1` (`assetVersion: "v1"`, `metadataVersion: "v1"`)
- **Credencial / papel revisor (sem dados pessoais desnecessários):** *A definir na Fase 3*
- **Data da revisão:** *Pendente*
