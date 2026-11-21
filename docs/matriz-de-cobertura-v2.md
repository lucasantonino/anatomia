# Matriz de Cobertura Anatômica — Fase 2 (v2 Corpo Completo)

Em cumprimento às Seções 4.1, 8.5 e 17.2 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md), esta matriz é a **fonte de verdade oficial** da versão `v2` (gerada diretamente a partir de [coverage-matrix.json](../public/assets/v2/coverage-matrix.json) e [metadata-v2.json](../public/assets/v2/metadata-v2.json)). A matriz regional histórica da Fase 1 permanece arquivada em [matriz-de-cobertura.md](./matriz-de-cobertura.md).

> [!IMPORTANT]
> **Declaração oficial de escopo da `v2`:** Esta versão (v2 — Corpo Humano Completo) contempla 575 estruturas anatômicas (201 estruturas ósseas e 374 estruturas musculares, compostas por 635 malhas STL reais do BodyParts3D v3.0) distribuídas nas 4 macro-regiões anatômicas: cabeça e pescoço (head_neck), tronco (trunk), membro superior com cíngulo peitoral (upper_limb) e membro inferior com cíngulo pélvico (lower_limb). Inclui crânio, coluna vertebral cervical/torácica/lombar e sacro, caixa torácica óssea, mãos, pés, musculatura esquelética completa e estruturas aponeuróticas/tendíneas funcionais selecionadas (gálea aponeurótica, linha alba, trato iliotibial e tendão do calcâneo). Limitações transparentes da fonte BodyParts3D v3.0: não inclui cóccix separado, ossículos da orelha média, dentes, cartilagens costais/articulares, discos intervertebrais, ligamentos articulares, retináculos fibrosos ou sistemas viscerais/vasculares/nervosos; lumbricais e interósseos da mão e interósseos dorsais do pé são representados em malhas de conjunto.

---

## 1. Resumo Quantitativo por Região (`v2`)

| Região anatômica | Ósseo (`skeletal`) | Muscular (`muscular`) | Total | Status de revisão |
|---|---|---|---|---|
| Cabeça e pescoço (`head_neck`) | 30 (30 malhas) | 107 (123 malhas) | 137 (153 malhas) | `pending_review` |
| Tronco (`trunk`) | 43 (45 malhas) | 61 (69 malhas) | 104 (114 malhas) | `pending_review` |
| Membro superior (`upper_limb`) | 64 (64 malhas) | 88 (114 malhas) | 152 (178 malhas) | `pending_review` |
| Membro inferior (`lower_limb`) | 64 (64 malhas) | 118 (126 malhas) | 182 (190 malhas) | `pending_review` |
| **Total v2** | **201 (203 malhas)** | **374 (432 malhas)** | **575 (635 malhas)** | **`pending_review`** |

**Artefatos binários vinculados (`manifest.json` `v2`):**
- `skeletal-v2.glb`: `907.880 B` (`123.846` triângulos, `203` malhas, SHA-256 `f48984f165c765cd3905c3f74c93c970e95d3aab4bc2524f7c91aa864133e37d`)
- `muscular-v2.glb`: `1.565.372 B` (`186.238` triângulos, `432` malhas, SHA-256 `2942d2fe7011623e6dbc207ecd66443ce6a77d1254c19c5c082fab575f54507f`)

---

## 2. Política Regional e Notas Terminológicas (`v2`)

- **`head_neck`:** crânio (22 ossos), osso hioide, vértebras cervicais (C1–C7), musculatura da cabeça e pescoço e fascículos cervicais/cefálicos do dorso profundo.
- **`trunk`:** esterno (3 sub-partes agrupadas), 24 costelas, vértebras torácicas (T1–T12), lombares (L1–L5), sacro, musculatura do tórax, abdome, assoalho pélvico estriado esquelético (*levator ani*, *coccygeus*, *sphincter ani externus*) e dorso (incluindo axioapendiculares posteriores: trapézio, latíssimo do dorso, romboides e levantador da escápula).
- **`upper_limb`:** cíngulo do membro superior (clavícula e escápula), braço, antebraço, mão (carpo, metacarpos e falanges) e musculatura do membro superior incluindo os toracoapendiculares anteriores da `v1` (*peitoral maior*, *peitoral menor*, *serrátil anterior*, *subclávio*).
- **`lower_limb`:** cíngulo pélvico (*os coxae* — TA2 *Cingulum pelvicum*), coxa, perna, pé (tarso, metatarsos, falanges e ossos sesamoides do pé) e musculatura glútea, do iliopsoas, pelvitrocantérica, da coxa, da perna e do pé.
- **Nota sobre `BP44`–`BP47` (*extensor carpi ulnaris*):** os 4 STLs das cabeças umeral e ulnar usam identificadores proprietários `BP44`–`BP47` apenas no arquivo-fonte (`stlId`); os metadados científicos públicos preservam estritamente os identificadores FMA oficiais (`FMA38507`/`FMA38508`, `FMA77260`, `FMA77261`).

---

## 3. Inventário Completo das 575 Estruturas (`v2`)

| # | `anatomyId` | Sistema | Região | Lado | Nome em PT-BR | Nome Científico (*TA2* / Latim) | FMA IDs | `meshNodes` no `.glb` | Revisão |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `bone.clavicula.right` | Ósseo | `upper_limb` | `right` | Clavícula | *Clavicula* | `FMA13322` | `bone.clavicula.right` | `pending_review` |
| 2 | `bone.clavicula.left` | Ósseo | `upper_limb` | `left` | Clavícula | *Clavicula* | `FMA13323` | `bone.clavicula.left` | `pending_review` |
| 3 | `bone.scapula.right` | Ósseo | `upper_limb` | `right` | Escápula | *Scapula* | `FMA13395` | `bone.scapula.right` | `pending_review` |
| 4 | `bone.scapula.left` | Ósseo | `upper_limb` | `left` | Escápula | *Scapula* | `FMA13396` | `bone.scapula.left` | `pending_review` |
| 5 | `bone.humerus.right` | Ósseo | `upper_limb` | `right` | Úmero | *Humerus* | `FMA23130` | `bone.humerus.right` | `pending_review` |
| 6 | `bone.humerus.left` | Ósseo | `upper_limb` | `left` | Úmero | *Humerus* | `FMA23131` | `bone.humerus.left` | `pending_review` |
| 7 | `bone.radius.right` | Ósseo | `upper_limb` | `right` | Rádio | *Radius* | `FMA23464` | `bone.radius.right` | `pending_review` |
| 8 | `bone.radius.left` | Ósseo | `upper_limb` | `left` | Rádio | *Radius* | `FMA23465` | `bone.radius.left` | `pending_review` |
| 9 | `bone.ulna.right` | Ósseo | `upper_limb` | `right` | Ulna | *Ulna* | `FMA23467` | `bone.ulna.right` | `pending_review` |
| 10 | `bone.ulna.left` | Ósseo | `upper_limb` | `left` | Ulna | *Ulna* | `FMA23468` | `bone.ulna.left` | `pending_review` |
| 11 | `bone.concha_nasalis_inferior.left` | Ósseo | `head_neck` | `left` | Concha nasal inferior | *Concha nasalis inferior* | `FMA54738` | `bone.concha_nasalis_inferior.left` | `pending_review` |
| 12 | `bone.concha_nasalis_inferior.right` | Ósseo | `head_neck` | `right` | Concha nasal inferior | *Concha nasalis inferior* | `FMA54737` | `bone.concha_nasalis_inferior.right` | `pending_review` |
| 13 | `bone.mandibula.midline` | Ósseo | `head_neck` | `midline` | Mandíbula | *Mandibula* | `FMA52748` | `bone.mandibula.midline` | `pending_review` |
| 14 | `bone.maxilla.left` | Ósseo | `head_neck` | `left` | Maxila | *Maxilla* | `FMA53650` | `bone.maxilla.left` | `pending_review` |
| 15 | `bone.maxilla.right` | Ósseo | `head_neck` | `right` | Maxila | *Maxilla* | `FMA53649` | `bone.maxilla.right` | `pending_review` |
| 16 | `bone.os_ethmoidale.midline` | Ósseo | `head_neck` | `midline` | Osso etmoide | *Os ethmoidale* | `FMA52740` | `bone.os_ethmoidale.midline` | `pending_review` |
| 17 | `bone.os_frontale.midline` | Ósseo | `head_neck` | `midline` | Osso frontal | *Os frontale* | `FMA52734` | `bone.os_frontale.midline` | `pending_review` |
| 18 | `bone.os_hyoideum.midline` | Ósseo | `head_neck` | `midline` | Osso hioide | *Os hyoideum* | `FMA52749` | `bone.os_hyoideum.midline` | `pending_review` |
| 19 | `bone.os_lacrimale.left` | Ósseo | `head_neck` | `left` | Osso lacrimal | *Os lacrimale* | `FMA53646` | `bone.os_lacrimale.left` | `pending_review` |
| 20 | `bone.os_lacrimale.right` | Ósseo | `head_neck` | `right` | Osso lacrimal | *Os lacrimale* | `FMA53645` | `bone.os_lacrimale.right` | `pending_review` |
| 21 | `bone.os_nasale.left` | Ósseo | `head_neck` | `left` | Osso nasal | *Os nasale* | `FMA53648` | `bone.os_nasale.left` | `pending_review` |
| 22 | `bone.os_nasale.right` | Ósseo | `head_neck` | `right` | Osso nasal | *Os nasale* | `FMA53647` | `bone.os_nasale.right` | `pending_review` |
| 23 | `bone.os_occipitale.midline` | Ósseo | `head_neck` | `midline` | Osso occipital | *Os occipitale* | `FMA52735` | `bone.os_occipitale.midline` | `pending_review` |
| 24 | `bone.os_palatinum.left` | Ósseo | `head_neck` | `left` | Osso palatino | *Os palatinum* | `FMA53656` | `bone.os_palatinum.left` | `pending_review` |
| 25 | `bone.os_palatinum.right` | Ósseo | `head_neck` | `right` | Osso palatino | *Os palatinum* | `FMA53655` | `bone.os_palatinum.right` | `pending_review` |
| 26 | `bone.os_parietale.left` | Ósseo | `head_neck` | `left` | Osso parietal | *Os parietale* | `FMA52789` | `bone.os_parietale.left` | `pending_review` |
| 27 | `bone.os_parietale.right` | Ósseo | `head_neck` | `right` | Osso parietal | *Os parietale* | `FMA52788` | `bone.os_parietale.right` | `pending_review` |
| 28 | `bone.os_sphenoidale.midline` | Ósseo | `head_neck` | `midline` | Osso esfenoide | *Os sphenoidale* | `FMA52736` | `bone.os_sphenoidale.midline` | `pending_review` |
| 29 | `bone.os_temporale.left` | Ósseo | `head_neck` | `left` | Osso temporal | *Os temporale* | `FMA52739` | `bone.os_temporale.left` | `pending_review` |
| 30 | `bone.os_temporale.right` | Ósseo | `head_neck` | `right` | Osso temporal | *Os temporale* | `FMA52738` | `bone.os_temporale.right` | `pending_review` |
| 31 | `bone.os_zygomaticum.left` | Ósseo | `head_neck` | `left` | Osso zigomático | *Os zygomaticum* | `FMA52893` | `bone.os_zygomaticum.left` | `pending_review` |
| 32 | `bone.os_zygomaticum.right` | Ósseo | `head_neck` | `right` | Osso zigomático | *Os zygomaticum* | `FMA52892` | `bone.os_zygomaticum.right` | `pending_review` |
| 33 | `bone.vertebra_cervicalis.midline.c1` | Ósseo | `head_neck` | `midline` | Atlas (1ª vértebra cervical — C1) | *Atlas (Vertebra cervicalis I)* | `FMA12519` | `bone.vertebra_cervicalis.midline.c1` | `pending_review` |
| 34 | `bone.vertebra_cervicalis.midline.c2` | Ósseo | `head_neck` | `midline` | Áxis (2ª vértebra cervical — C2) | *Axis (Vertebra cervicalis II)* | `FMA12520` | `bone.vertebra_cervicalis.midline.c2` | `pending_review` |
| 35 | `bone.vertebra_cervicalis.midline.c3` | Ósseo | `head_neck` | `midline` | 3ª vértebra cervical (C3) | *Vertebra cervicalis III* | `FMA12521` | `bone.vertebra_cervicalis.midline.c3` | `pending_review` |
| 36 | `bone.vertebra_cervicalis.midline.c4` | Ósseo | `head_neck` | `midline` | 4ª vértebra cervical (C4) | *Vertebra cervicalis IV* | `FMA12522` | `bone.vertebra_cervicalis.midline.c4` | `pending_review` |
| 37 | `bone.vertebra_cervicalis.midline.c5` | Ósseo | `head_neck` | `midline` | 5ª vértebra cervical (C5) | *Vertebra cervicalis V* | `FMA12523` | `bone.vertebra_cervicalis.midline.c5` | `pending_review` |
| 38 | `bone.vertebra_cervicalis.midline.c6` | Ósseo | `head_neck` | `midline` | 6ª vértebra cervical (C6) | *Vertebra cervicalis VI* | `FMA12524` | `bone.vertebra_cervicalis.midline.c6` | `pending_review` |
| 39 | `bone.vertebra_cervicalis.midline.c7` | Ósseo | `head_neck` | `midline` | 7ª vértebra cervical (C7) | *Vertebra cervicalis VII* | `FMA12525` | `bone.vertebra_cervicalis.midline.c7` | `pending_review` |
| 40 | `bone.vomer.midline` | Ósseo | `head_neck` | `midline` | Vômer | *Vomer* | `FMA9710` | `bone.vomer.midline` | `pending_review` |
| 41 | `bone.costa.left.1` | Ósseo | `trunk` | `left` | 1ª costela | *Costa I* | `FMA7987` | `bone.costa.left.1` | `pending_review` |
| 42 | `bone.costa.left.10` | Ósseo | `trunk` | `left` | 10ª costela | *Costa X* | `FMA8472` | `bone.costa.left.10` | `pending_review` |
| 43 | `bone.costa.left.11` | Ósseo | `trunk` | `left` | 11ª costela | *Costa XI* | `FMA8532` | `bone.costa.left.11` | `pending_review` |
| 44 | `bone.costa.left.12` | Ósseo | `trunk` | `left` | 12ª costela | *Costa XII* | `FMA8534` | `bone.costa.left.12` | `pending_review` |
| 45 | `bone.costa.left.2` | Ósseo | `trunk` | `left` | 2ª costela | *Costa II* | `FMA8012` | `bone.costa.left.2` | `pending_review` |
| 46 | `bone.costa.left.3` | Ósseo | `trunk` | `left` | 3ª costela | *Costa III* | `FMA8039` | `bone.costa.left.3` | `pending_review` |
| 47 | `bone.costa.left.4` | Ósseo | `trunk` | `left` | 4ª costela | *Costa IV* | `FMA8148` | `bone.costa.left.4` | `pending_review` |
| 48 | `bone.costa.left.5` | Ósseo | `trunk` | `left` | 5ª costela | *Costa V* | `FMA8093` | `bone.costa.left.5` | `pending_review` |
| 49 | `bone.costa.left.6` | Ósseo | `trunk` | `left` | 6ª costela | *Costa VI* | `FMA8202` | `bone.costa.left.6` | `pending_review` |
| 50 | `bone.costa.left.7` | Ósseo | `trunk` | `left` | 7ª costela | *Costa VII* | `FMA8256` | `bone.costa.left.7` | `pending_review` |
| 51 | `bone.costa.left.8` | Ósseo | `trunk` | `left` | 8ª costela | *Costa VIII* | `FMA8310` | `bone.costa.left.8` | `pending_review` |
| 52 | `bone.costa.left.9` | Ósseo | `trunk` | `left` | 9ª costela | *Costa IX* | `FMA8391` | `bone.costa.left.9` | `pending_review` |
| 53 | `bone.costa.right.1` | Ósseo | `trunk` | `right` | 1ª costela | *Costa I* | `FMA7857` | `bone.costa.right.1` | `pending_review` |
| 54 | `bone.costa.right.10` | Ósseo | `trunk` | `right` | 10ª costela | *Costa X* | `FMA8445` | `bone.costa.right.10` | `pending_review` |
| 55 | `bone.costa.right.11` | Ósseo | `trunk` | `right` | 11ª costela | *Costa XI* | `FMA8531` | `bone.costa.right.11` | `pending_review` |
| 56 | `bone.costa.right.12` | Ósseo | `trunk` | `right` | 12ª costela | *Costa XII* | `FMA8533` | `bone.costa.right.12` | `pending_review` |
| 57 | `bone.costa.right.2` | Ósseo | `trunk` | `right` | 2ª costela | *Costa II* | `FMA7882` | `bone.costa.right.2` | `pending_review` |
| 58 | `bone.costa.right.3` | Ósseo | `trunk` | `right` | 3ª costela | *Costa III* | `FMA7909` | `bone.costa.right.3` | `pending_review` |
| 59 | `bone.costa.right.4` | Ósseo | `trunk` | `right` | 4ª costela | *Costa IV* | `FMA7957` | `bone.costa.right.4` | `pending_review` |
| 60 | `bone.costa.right.5` | Ósseo | `trunk` | `right` | 5ª costela | *Costa V* | `FMA8066` | `bone.costa.right.5` | `pending_review` |
| 61 | `bone.costa.right.6` | Ósseo | `trunk` | `right` | 6ª costela | *Costa VI* | `FMA8175` | `bone.costa.right.6` | `pending_review` |
| 62 | `bone.costa.right.7` | Ósseo | `trunk` | `right` | 7ª costela | *Costa VII* | `FMA8229` | `bone.costa.right.7` | `pending_review` |
| 63 | `bone.costa.right.8` | Ósseo | `trunk` | `right` | 8ª costela | *Costa VIII* | `FMA8283` | `bone.costa.right.8` | `pending_review` |
| 64 | `bone.costa.right.9` | Ósseo | `trunk` | `right` | 9ª costela | *Costa IX* | `FMA8364` | `bone.costa.right.9` | `pending_review` |
| 65 | `bone.os_sacrum.midline` | Ósseo | `trunk` | `midline` | Sacro | *Os sacrum* | `FMA16202` | `bone.os_sacrum.midline` | `pending_review` |
| 66 | `bone.sternum.midline` | Ósseo | `trunk` | `midline` | Esterno | *Sternum* | `FMA7486`, `FMA7487`, `FMA7488` | `bone.sternum.midline.manubrium`, `bone.sternum.midline.corpus`, `bone.sternum.midline.processus_xiphoideus` | `pending_review` |
| 67 | `bone.vertebra_lumbalis.midline.l1` | Ósseo | `trunk` | `midline` | 1ª vértebra lombar (L1) | *Vertebra lumbalis I* | `FMA13072` | `bone.vertebra_lumbalis.midline.l1` | `pending_review` |
| 68 | `bone.vertebra_lumbalis.midline.l2` | Ósseo | `trunk` | `midline` | 2ª vértebra lombar (L2) | *Vertebra lumbalis II* | `FMA13073` | `bone.vertebra_lumbalis.midline.l2` | `pending_review` |
| 69 | `bone.vertebra_lumbalis.midline.l3` | Ósseo | `trunk` | `midline` | 3ª vértebra lombar (L3) | *Vertebra lumbalis III* | `FMA13074` | `bone.vertebra_lumbalis.midline.l3` | `pending_review` |
| 70 | `bone.vertebra_lumbalis.midline.l4` | Ósseo | `trunk` | `midline` | 4ª vértebra lombar (L4) | *Vertebra lumbalis IV* | `FMA13075` | `bone.vertebra_lumbalis.midline.l4` | `pending_review` |
| 71 | `bone.vertebra_lumbalis.midline.l5` | Ósseo | `trunk` | `midline` | 5ª vértebra lombar (L5) | *Vertebra lumbalis V* | `FMA13076` | `bone.vertebra_lumbalis.midline.l5` | `pending_review` |
| 72 | `bone.vertebra_thoracica.midline.t1` | Ósseo | `trunk` | `midline` | 1ª vértebra torácica (T1) | *Vertebra thoracica I* | `FMA9165` | `bone.vertebra_thoracica.midline.t1` | `pending_review` |
| 73 | `bone.vertebra_thoracica.midline.t10` | Ósseo | `trunk` | `midline` | 10ª vértebra torácica (T10) | *Vertebra thoracica X* | `FMA10037` | `bone.vertebra_thoracica.midline.t10` | `pending_review` |
| 74 | `bone.vertebra_thoracica.midline.t11` | Ósseo | `trunk` | `midline` | 11ª vértebra torácica (T11) | *Vertebra thoracica XI* | `FMA10059` | `bone.vertebra_thoracica.midline.t11` | `pending_review` |
| 75 | `bone.vertebra_thoracica.midline.t12` | Ósseo | `trunk` | `midline` | 12ª vértebra torácica (T12) | *Vertebra thoracica XII* | `FMA10081` | `bone.vertebra_thoracica.midline.t12` | `pending_review` |
| 76 | `bone.vertebra_thoracica.midline.t2` | Ósseo | `trunk` | `midline` | 2ª vértebra torácica (T2) | *Vertebra thoracica II* | `FMA9187` | `bone.vertebra_thoracica.midline.t2` | `pending_review` |
| 77 | `bone.vertebra_thoracica.midline.t3` | Ósseo | `trunk` | `midline` | 3ª vértebra torácica (T3) | *Vertebra thoracica III* | `FMA9209` | `bone.vertebra_thoracica.midline.t3` | `pending_review` |
| 78 | `bone.vertebra_thoracica.midline.t4` | Ósseo | `trunk` | `midline` | 4ª vértebra torácica (T4) | *Vertebra thoracica IV* | `FMA9248` | `bone.vertebra_thoracica.midline.t4` | `pending_review` |
| 79 | `bone.vertebra_thoracica.midline.t5` | Ósseo | `trunk` | `midline` | 5ª vértebra torácica (T5) | *Vertebra thoracica V* | `FMA9922` | `bone.vertebra_thoracica.midline.t5` | `pending_review` |
| 80 | `bone.vertebra_thoracica.midline.t6` | Ósseo | `trunk` | `midline` | 6ª vértebra torácica (T6) | *Vertebra thoracica VI* | `FMA9945` | `bone.vertebra_thoracica.midline.t6` | `pending_review` |
| 81 | `bone.vertebra_thoracica.midline.t7` | Ósseo | `trunk` | `midline` | 7ª vértebra torácica (T7) | *Vertebra thoracica VII* | `FMA9968` | `bone.vertebra_thoracica.midline.t7` | `pending_review` |
| 82 | `bone.vertebra_thoracica.midline.t8` | Ósseo | `trunk` | `midline` | 8ª vértebra torácica (T8) | *Vertebra thoracica VIII* | `FMA9991` | `bone.vertebra_thoracica.midline.t8` | `pending_review` |
| 83 | `bone.vertebra_thoracica.midline.t9` | Ósseo | `trunk` | `midline` | 9ª vértebra torácica (T9) | *Vertebra thoracica IX* | `FMA10014` | `bone.vertebra_thoracica.midline.t9` | `pending_review` |
| 84 | `bone.os_capitatum.left` | Ósseo | `upper_limb` | `left` | Osso capitato | *Os capitatum* | `FMA24447` | `bone.os_capitatum.left` | `pending_review` |
| 85 | `bone.os_capitatum.right` | Ósseo | `upper_limb` | `right` | Osso capitato | *Os capitatum* | `FMA24446` | `bone.os_capitatum.right` | `pending_review` |
| 86 | `bone.os_hamatum.left` | Ósseo | `upper_limb` | `left` | Osso hamato | *Os hamatum* | `FMA24449` | `bone.os_hamatum.left` | `pending_review` |
| 87 | `bone.os_hamatum.right` | Ósseo | `upper_limb` | `right` | Osso hamato | *Os hamatum* | `FMA24448` | `bone.os_hamatum.right` | `pending_review` |
| 88 | `bone.os_lunatum.left` | Ósseo | `upper_limb` | `left` | Osso semilunar | *Os lunatum* | `FMA24438` | `bone.os_lunatum.left` | `pending_review` |
| 89 | `bone.os_lunatum.right` | Ósseo | `upper_limb` | `right` | Osso semilunar | *Os lunatum* | `FMA24437` | `bone.os_lunatum.right` | `pending_review` |
| 90 | `bone.os_metacarpi.left.1` | Ósseo | `upper_limb` | `left` | 1º osso metacarpal | *Os metacarpi I* | `FMA24465` | `bone.os_metacarpi.left.1` | `pending_review` |
| 91 | `bone.os_metacarpi.left.2` | Ósseo | `upper_limb` | `left` | 2º osso metacarpal | *Os metacarpi II* | `FMA24467` | `bone.os_metacarpi.left.2` | `pending_review` |
| 92 | `bone.os_metacarpi.left.3` | Ósseo | `upper_limb` | `left` | 3º osso metacarpal | *Os metacarpi III* | `FMA24469` | `bone.os_metacarpi.left.3` | `pending_review` |
| 93 | `bone.os_metacarpi.left.4` | Ósseo | `upper_limb` | `left` | 4º osso metacarpal | *Os metacarpi IV* | `FMA24471` | `bone.os_metacarpi.left.4` | `pending_review` |
| 94 | `bone.os_metacarpi.left.5` | Ósseo | `upper_limb` | `left` | 5º osso metacarpal | *Os metacarpi V* | `FMA24473` | `bone.os_metacarpi.left.5` | `pending_review` |
| 95 | `bone.os_metacarpi.right.1` | Ósseo | `upper_limb` | `right` | 1º osso metacarpal | *Os metacarpi I* | `FMA24464` | `bone.os_metacarpi.right.1` | `pending_review` |
| 96 | `bone.os_metacarpi.right.2` | Ósseo | `upper_limb` | `right` | 2º osso metacarpal | *Os metacarpi II* | `FMA24466` | `bone.os_metacarpi.right.2` | `pending_review` |
| 97 | `bone.os_metacarpi.right.3` | Ósseo | `upper_limb` | `right` | 3º osso metacarpal | *Os metacarpi III* | `FMA24468` | `bone.os_metacarpi.right.3` | `pending_review` |
| 98 | `bone.os_metacarpi.right.4` | Ósseo | `upper_limb` | `right` | 4º osso metacarpal | *Os metacarpi IV* | `FMA24470` | `bone.os_metacarpi.right.4` | `pending_review` |
| 99 | `bone.os_metacarpi.right.5` | Ósseo | `upper_limb` | `right` | 5º osso metacarpal | *Os metacarpi V* | `FMA24472` | `bone.os_metacarpi.right.5` | `pending_review` |
| 100 | `bone.os_pisiforme.left` | Ósseo | `upper_limb` | `left` | Osso pisiforme | *Os pisiforme* | `FMA24442` | `bone.os_pisiforme.left` | `pending_review` |
| 101 | `bone.os_pisiforme.right` | Ósseo | `upper_limb` | `right` | Osso pisiforme | *Os pisiforme* | `FMA24441` | `bone.os_pisiforme.right` | `pending_review` |
| 102 | `bone.os_scaphoideum.left` | Ósseo | `upper_limb` | `left` | Osso escafoide | *Os scaphoideum* | `FMA24436` | `bone.os_scaphoideum.left` | `pending_review` |
| 103 | `bone.os_scaphoideum.right` | Ósseo | `upper_limb` | `right` | Osso escafoide | *Os scaphoideum* | `FMA24435` | `bone.os_scaphoideum.right` | `pending_review` |
| 104 | `bone.os_trapezium.left` | Ósseo | `upper_limb` | `left` | Osso trapézio | *Os trapezium* | `FMA24444` | `bone.os_trapezium.left` | `pending_review` |
| 105 | `bone.os_trapezium.right` | Ósseo | `upper_limb` | `right` | Osso trapézio | *Os trapezium* | `FMA24443` | `bone.os_trapezium.right` | `pending_review` |
| 106 | `bone.os_trapezoideum.left` | Ósseo | `upper_limb` | `left` | Osso trapezoide | *Os trapezoideum* | `FMA24445` | `bone.os_trapezoideum.left` | `pending_review` |
| 107 | `bone.os_trapezoideum.right` | Ósseo | `upper_limb` | `right` | Osso trapezoide | *Os trapezoideum* | `FMA23725` | `bone.os_trapezoideum.right` | `pending_review` |
| 108 | `bone.os_triquetrum.left` | Ósseo | `upper_limb` | `left` | Osso piramidal | *Os triquetrum* | `FMA24440` | `bone.os_triquetrum.left` | `pending_review` |
| 109 | `bone.os_triquetrum.right` | Ósseo | `upper_limb` | `right` | Osso piramidal | *Os triquetrum* | `FMA24439` | `bone.os_triquetrum.right` | `pending_review` |
| 110 | `bone.phalanx_distalis_manus.left.1` | Ósseo | `upper_limb` | `left` | Falange distal do polegar (I dedo da mão) | *Phalanx distalis pollicis* | `FMA23951` | `bone.phalanx_distalis_manus.left.1` | `pending_review` |
| 111 | `bone.phalanx_distalis_manus.left.2` | Ósseo | `upper_limb` | `left` | Falange distal do indicador (II dedo da mão) | *Phalanx distalis indicis* | `FMA23953` | `bone.phalanx_distalis_manus.left.2` | `pending_review` |
| 112 | `bone.phalanx_distalis_manus.left.3` | Ósseo | `upper_limb` | `left` | Falange distal do dedo médio (III dedo da mão) | *Phalanx distalis digiti medii manus* | `FMA23955` | `bone.phalanx_distalis_manus.left.3` | `pending_review` |
| 113 | `bone.phalanx_distalis_manus.left.4` | Ósseo | `upper_limb` | `left` | Falange distal do dedo anelar (IV dedo da mão) | *Phalanx distalis digiti anularis manus* | `FMA23957` | `bone.phalanx_distalis_manus.left.4` | `pending_review` |
| 114 | `bone.phalanx_distalis_manus.left.5` | Ósseo | `upper_limb` | `left` | Falange distal do dedo mínimo (V dedo da mão) | *Phalanx distalis digiti minimi manus* | `FMA23959` | `bone.phalanx_distalis_manus.left.5` | `pending_review` |
| 115 | `bone.phalanx_distalis_manus.right.1` | Ósseo | `upper_limb` | `right` | Falange distal do polegar (I dedo da mão) | *Phalanx distalis pollicis* | `FMA24459` | `bone.phalanx_distalis_manus.right.1` | `pending_review` |
| 116 | `bone.phalanx_distalis_manus.right.2` | Ósseo | `upper_limb` | `right` | Falange distal do indicador (II dedo da mão) | *Phalanx distalis indicis* | `FMA24460` | `bone.phalanx_distalis_manus.right.2` | `pending_review` |
| 117 | `bone.phalanx_distalis_manus.right.3` | Ósseo | `upper_limb` | `right` | Falange distal do dedo médio (III dedo da mão) | *Phalanx distalis digiti medii manus* | `FMA24461` | `bone.phalanx_distalis_manus.right.3` | `pending_review` |
| 118 | `bone.phalanx_distalis_manus.right.4` | Ósseo | `upper_limb` | `right` | Falange distal do dedo anelar (IV dedo da mão) | *Phalanx distalis digiti anularis manus* | `FMA24462` | `bone.phalanx_distalis_manus.right.4` | `pending_review` |
| 119 | `bone.phalanx_distalis_manus.right.5` | Ósseo | `upper_limb` | `right` | Falange distal do dedo mínimo (V dedo da mão) | *Phalanx distalis digiti minimi manus* | `FMA24463` | `bone.phalanx_distalis_manus.right.5` | `pending_review` |
| 120 | `bone.phalanx_media_manus.left.2` | Ósseo | `upper_limb` | `left` | Falange média do indicador (II dedo da mão) | *Phalanx media indicis* | `FMA23938` | `bone.phalanx_media_manus.left.2` | `pending_review` |
| 121 | `bone.phalanx_media_manus.left.3` | Ósseo | `upper_limb` | `left` | Falange média do dedo médio (III dedo da mão) | *Phalanx media digiti medii manus* | `FMA23940` | `bone.phalanx_media_manus.left.3` | `pending_review` |
| 122 | `bone.phalanx_media_manus.left.4` | Ósseo | `upper_limb` | `left` | Falange média do dedo anelar (IV dedo da mão) | *Phalanx media digiti anularis manus* | `FMA23942` | `bone.phalanx_media_manus.left.4` | `pending_review` |
| 123 | `bone.phalanx_media_manus.left.5` | Ósseo | `upper_limb` | `left` | Falange média do dedo mínimo (V dedo da mão) | *Phalanx media digiti minimi manus* | `FMA23944` | `bone.phalanx_media_manus.left.5` | `pending_review` |
| 124 | `bone.phalanx_media_manus.right.2` | Ósseo | `upper_limb` | `right` | Falange média do indicador (II dedo da mão) | *Phalanx media indicis* | `FMA24455` | `bone.phalanx_media_manus.right.2` | `pending_review` |
| 125 | `bone.phalanx_media_manus.right.3` | Ósseo | `upper_limb` | `right` | Falange média do dedo médio (III dedo da mão) | *Phalanx media digiti medii manus* | `FMA24456` | `bone.phalanx_media_manus.right.3` | `pending_review` |
| 126 | `bone.phalanx_media_manus.right.4` | Ósseo | `upper_limb` | `right` | Falange média do dedo anelar (IV dedo da mão) | *Phalanx media digiti anularis manus* | `FMA24457` | `bone.phalanx_media_manus.right.4` | `pending_review` |
| 127 | `bone.phalanx_media_manus.right.5` | Ósseo | `upper_limb` | `right` | Falange média do dedo mínimo (V dedo da mão) | *Phalanx media digiti minimi manus* | `FMA24458` | `bone.phalanx_media_manus.right.5` | `pending_review` |
| 128 | `bone.phalanx_proximalis_manus.left.1` | Ósseo | `upper_limb` | `left` | Falange proximal do polegar (I dedo da mão) | *Phalanx proximalis pollicis* | `FMA65470` | `bone.phalanx_proximalis_manus.left.1` | `pending_review` |
| 129 | `bone.phalanx_proximalis_manus.left.2` | Ósseo | `upper_limb` | `left` | Falange proximal do indicador (II dedo da mão) | *Phalanx proximalis indicis* | `FMA71915` | `bone.phalanx_proximalis_manus.left.2` | `pending_review` |
| 130 | `bone.phalanx_proximalis_manus.left.3` | Ósseo | `upper_limb` | `left` | Falange proximal do dedo médio (III dedo da mão) | *Phalanx proximalis digiti medii manus* | `FMA71908` | `bone.phalanx_proximalis_manus.left.3` | `pending_review` |
| 131 | `bone.phalanx_proximalis_manus.left.4` | Ósseo | `upper_limb` | `left` | Falange proximal do dedo anelar (IV dedo da mão) | *Phalanx proximalis digiti anularis manus* | `FMA71916` | `bone.phalanx_proximalis_manus.left.4` | `pending_review` |
| 132 | `bone.phalanx_proximalis_manus.left.5` | Ósseo | `upper_limb` | `left` | Falange proximal do dedo mínimo (V dedo da mão) | *Phalanx proximalis digiti minimi manus* | `FMA66791` | `bone.phalanx_proximalis_manus.left.5` | `pending_review` |
| 133 | `bone.phalanx_proximalis_manus.right.1` | Ósseo | `upper_limb` | `right` | Falange proximal do polegar (I dedo da mão) | *Phalanx proximalis pollicis* | `FMA24450` | `bone.phalanx_proximalis_manus.right.1` | `pending_review` |
| 134 | `bone.phalanx_proximalis_manus.right.2` | Ósseo | `upper_limb` | `right` | Falange proximal do indicador (II dedo da mão) | *Phalanx proximalis indicis* | `FMA24451` | `bone.phalanx_proximalis_manus.right.2` | `pending_review` |
| 135 | `bone.phalanx_proximalis_manus.right.3` | Ósseo | `upper_limb` | `right` | Falange proximal do dedo médio (III dedo da mão) | *Phalanx proximalis digiti medii manus* | `FMA24452` | `bone.phalanx_proximalis_manus.right.3` | `pending_review` |
| 136 | `bone.phalanx_proximalis_manus.right.4` | Ósseo | `upper_limb` | `right` | Falange proximal do dedo anelar (IV dedo da mão) | *Phalanx proximalis digiti anularis manus* | `FMA24453` | `bone.phalanx_proximalis_manus.right.4` | `pending_review` |
| 137 | `bone.phalanx_proximalis_manus.right.5` | Ósseo | `upper_limb` | `right` | Falange proximal do dedo mínimo (V dedo da mão) | *Phalanx proximalis digiti minimi manus* | `FMA24454` | `bone.phalanx_proximalis_manus.right.5` | `pending_review` |
| 138 | `bone.calcaneus.left` | Ósseo | `lower_limb` | `left` | Calcâneo | *Calcaneus* | `FMA24498` | `bone.calcaneus.left` | `pending_review` |
| 139 | `bone.calcaneus.right` | Ósseo | `lower_limb` | `right` | Calcâneo | *Calcaneus* | `FMA24497` | `bone.calcaneus.right` | `pending_review` |
| 140 | `bone.femur.left` | Ósseo | `lower_limb` | `left` | Fêmur | *Femur* | `FMA24475` | `bone.femur.left` | `pending_review` |
| 141 | `bone.femur.right` | Ósseo | `lower_limb` | `right` | Fêmur | *Femur* | `FMA24474` | `bone.femur.right` | `pending_review` |
| 142 | `bone.fibula.left` | Ósseo | `lower_limb` | `left` | Fíbula | *Fibula* | `FMA24481` | `bone.fibula.left` | `pending_review` |
| 143 | `bone.fibula.right` | Ósseo | `lower_limb` | `right` | Fíbula | *Fibula* | `FMA24480` | `bone.fibula.right` | `pending_review` |
| 144 | `bone.os_coxae.left` | Ósseo | `lower_limb` | `left` | Osso do quadril | *Os coxae* | `FMA16587` | `bone.os_coxae.left` | `pending_review` |
| 145 | `bone.os_coxae.right` | Ósseo | `lower_limb` | `right` | Osso do quadril | *Os coxae* | `FMA16586` | `bone.os_coxae.right` | `pending_review` |
| 146 | `bone.os_cuboideum.left` | Ósseo | `lower_limb` | `left` | Osso cuboide | *Os cuboideum* | `FMA24529` | `bone.os_cuboideum.left` | `pending_review` |
| 147 | `bone.os_cuboideum.right` | Ósseo | `lower_limb` | `right` | Osso cuboide | *Os cuboideum* | `FMA24528` | `bone.os_cuboideum.right` | `pending_review` |
| 148 | `bone.os_cuneiforme_intermedium.left` | Ósseo | `lower_limb` | `left` | Osso cuneiforme intermédio | *Os cuneiforme intermedium* | `FMA24524` | `bone.os_cuneiforme_intermedium.left` | `pending_review` |
| 149 | `bone.os_cuneiforme_intermedium.right` | Ósseo | `lower_limb` | `right` | Osso cuneiforme intermédio | *Os cuneiforme intermedium* | `FMA24523` | `bone.os_cuneiforme_intermedium.right` | `pending_review` |
| 150 | `bone.os_cuneiforme_laterale.left` | Ósseo | `lower_limb` | `left` | Osso cuneiforme lateral | *Os cuneiforme laterale* | `FMA24526` | `bone.os_cuneiforme_laterale.left` | `pending_review` |
| 151 | `bone.os_cuneiforme_laterale.right` | Ósseo | `lower_limb` | `right` | Osso cuneiforme lateral | *Os cuneiforme laterale* | `FMA24525` | `bone.os_cuneiforme_laterale.right` | `pending_review` |
| 152 | `bone.os_cuneiforme_mediale.left` | Ósseo | `lower_limb` | `left` | Osso cuneiforme medial | *Os cuneiforme mediale* | `FMA24522` | `bone.os_cuneiforme_mediale.left` | `pending_review` |
| 153 | `bone.os_cuneiforme_mediale.right` | Ósseo | `lower_limb` | `right` | Osso cuneiforme medial | *Os cuneiforme mediale* | `FMA24521` | `bone.os_cuneiforme_mediale.right` | `pending_review` |
| 154 | `bone.os_metatarsi.left.1` | Ósseo | `lower_limb` | `left` | 1º osso metatarsal | *Os metatarsi I* | `FMA24508` | `bone.os_metatarsi.left.1` | `pending_review` |
| 155 | `bone.os_metatarsi.left.2` | Ósseo | `lower_limb` | `left` | 2º osso metatarsal | *Os metatarsi II* | `FMA24510` | `bone.os_metatarsi.left.2` | `pending_review` |
| 156 | `bone.os_metatarsi.left.3` | Ósseo | `lower_limb` | `left` | 3º osso metatarsal | *Os metatarsi III* | `FMA24512` | `bone.os_metatarsi.left.3` | `pending_review` |
| 157 | `bone.os_metatarsi.left.4` | Ósseo | `lower_limb` | `left` | 4º osso metatarsal | *Os metatarsi IV* | `FMA24514` | `bone.os_metatarsi.left.4` | `pending_review` |
| 158 | `bone.os_metatarsi.left.5` | Ósseo | `lower_limb` | `left` | 5º osso metatarsal | *Os metatarsi V* | `FMA24516` | `bone.os_metatarsi.left.5` | `pending_review` |
| 159 | `bone.os_metatarsi.right.1` | Ósseo | `lower_limb` | `right` | 1º osso metatarsal | *Os metatarsi I* | `FMA24507` | `bone.os_metatarsi.right.1` | `pending_review` |
| 160 | `bone.os_metatarsi.right.2` | Ósseo | `lower_limb` | `right` | 2º osso metatarsal | *Os metatarsi II* | `FMA24509` | `bone.os_metatarsi.right.2` | `pending_review` |
| 161 | `bone.os_metatarsi.right.3` | Ósseo | `lower_limb` | `right` | 3º osso metatarsal | *Os metatarsi III* | `FMA24511` | `bone.os_metatarsi.right.3` | `pending_review` |
| 162 | `bone.os_metatarsi.right.4` | Ósseo | `lower_limb` | `right` | 4º osso metatarsal | *Os metatarsi IV* | `FMA24513` | `bone.os_metatarsi.right.4` | `pending_review` |
| 163 | `bone.os_metatarsi.right.5` | Ósseo | `lower_limb` | `right` | 5º osso metatarsal | *Os metatarsi V* | `FMA24515` | `bone.os_metatarsi.right.5` | `pending_review` |
| 164 | `bone.os_naviculare.left` | Ósseo | `lower_limb` | `left` | Osso navicular | *Os naviculare* | `FMA24501` | `bone.os_naviculare.left` | `pending_review` |
| 165 | `bone.os_naviculare.right` | Ósseo | `lower_limb` | `right` | Osso navicular | *Os naviculare* | `FMA24500` | `bone.os_naviculare.right` | `pending_review` |
| 166 | `bone.os_sesamoideum_pedis.left` | Ósseo | `lower_limb` | `left` | Ossos sesamoides do pé | *Ossa sesamoidea pedis* | `FMA45098` | `bone.os_sesamoideum_pedis.left` | `pending_review` |
| 167 | `bone.os_sesamoideum_pedis.right` | Ósseo | `lower_limb` | `right` | Ossos sesamoides do pé | *Ossa sesamoidea pedis* | `FMA45097` | `bone.os_sesamoideum_pedis.right` | `pending_review` |
| 168 | `bone.patella.left` | Ósseo | `lower_limb` | `left` | Patela | *Patella* | `FMA24487` | `bone.patella.left` | `pending_review` |
| 169 | `bone.patella.right` | Ósseo | `lower_limb` | `right` | Patela | *Patella* | `FMA24486` | `bone.patella.right` | `pending_review` |
| 170 | `bone.phalanx_distalis_pedis.left.1` | Ósseo | `lower_limb` | `left` | Falange distal do hálux (I dedo do pé) | *Phalanx distalis hallucis* | `FMA32651` | `bone.phalanx_distalis_pedis.left.1` | `pending_review` |
| 171 | `bone.phalanx_distalis_pedis.left.2` | Ósseo | `lower_limb` | `left` | Falange distal do II dedo do pé | *Phalanx distalis digiti II pedis* | `FMA32653` | `bone.phalanx_distalis_pedis.left.2` | `pending_review` |
| 172 | `bone.phalanx_distalis_pedis.left.3` | Ósseo | `lower_limb` | `left` | Falange distal do III dedo do pé | *Phalanx distalis digiti III pedis* | `FMA32655` | `bone.phalanx_distalis_pedis.left.3` | `pending_review` |
| 173 | `bone.phalanx_distalis_pedis.left.4` | Ósseo | `lower_limb` | `left` | Falange distal do IV dedo do pé | *Phalanx distalis digiti IV pedis* | `FMA32657` | `bone.phalanx_distalis_pedis.left.4` | `pending_review` |
| 174 | `bone.phalanx_distalis_pedis.left.5` | Ósseo | `lower_limb` | `left` | Falange distal do V dedo do pé | *Phalanx distalis digiti minimi pedis* | `FMA32659` | `bone.phalanx_distalis_pedis.left.5` | `pending_review` |
| 175 | `bone.phalanx_distalis_pedis.right.1` | Ósseo | `lower_limb` | `right` | Falange distal do hálux (I dedo do pé) | *Phalanx distalis hallucis* | `FMA32650` | `bone.phalanx_distalis_pedis.right.1` | `pending_review` |
| 176 | `bone.phalanx_distalis_pedis.right.2` | Ósseo | `lower_limb` | `right` | Falange distal do II dedo do pé | *Phalanx distalis digiti II pedis* | `FMA32652` | `bone.phalanx_distalis_pedis.right.2` | `pending_review` |
| 177 | `bone.phalanx_distalis_pedis.right.3` | Ósseo | `lower_limb` | `right` | Falange distal do III dedo do pé | *Phalanx distalis digiti III pedis* | `FMA32654` | `bone.phalanx_distalis_pedis.right.3` | `pending_review` |
| 178 | `bone.phalanx_distalis_pedis.right.4` | Ósseo | `lower_limb` | `right` | Falange distal do IV dedo do pé | *Phalanx distalis digiti IV pedis* | `FMA32656` | `bone.phalanx_distalis_pedis.right.4` | `pending_review` |
| 179 | `bone.phalanx_distalis_pedis.right.5` | Ósseo | `lower_limb` | `right` | Falange distal do V dedo do pé | *Phalanx distalis digiti minimi pedis* | `FMA32658` | `bone.phalanx_distalis_pedis.right.5` | `pending_review` |
| 180 | `bone.phalanx_media_pedis.left.2` | Ósseo | `lower_limb` | `left` | Falange média do II dedo do pé | *Phalanx media digiti II pedis* | `FMA32643` | `bone.phalanx_media_pedis.left.2` | `pending_review` |
| 181 | `bone.phalanx_media_pedis.left.3` | Ósseo | `lower_limb` | `left` | Falange média do III dedo do pé | *Phalanx media digiti III pedis* | `FMA32645` | `bone.phalanx_media_pedis.left.3` | `pending_review` |
| 182 | `bone.phalanx_media_pedis.left.4` | Ósseo | `lower_limb` | `left` | Falange média do IV dedo do pé | *Phalanx media digiti IV pedis* | `FMA32647` | `bone.phalanx_media_pedis.left.4` | `pending_review` |
| 183 | `bone.phalanx_media_pedis.left.5` | Ósseo | `lower_limb` | `left` | Falange média do V dedo do pé | *Phalanx media digiti minimi pedis* | `FMA230988` | `bone.phalanx_media_pedis.left.5` | `pending_review` |
| 184 | `bone.phalanx_media_pedis.right.2` | Ósseo | `lower_limb` | `right` | Falange média do II dedo do pé | *Phalanx media digiti II pedis* | `FMA32642` | `bone.phalanx_media_pedis.right.2` | `pending_review` |
| 185 | `bone.phalanx_media_pedis.right.3` | Ósseo | `lower_limb` | `right` | Falange média do III dedo do pé | *Phalanx media digiti III pedis* | `FMA32644` | `bone.phalanx_media_pedis.right.3` | `pending_review` |
| 186 | `bone.phalanx_media_pedis.right.4` | Ósseo | `lower_limb` | `right` | Falange média do IV dedo do pé | *Phalanx media digiti IV pedis* | `FMA32646` | `bone.phalanx_media_pedis.right.4` | `pending_review` |
| 187 | `bone.phalanx_media_pedis.right.5` | Ósseo | `lower_limb` | `right` | Falange média do V dedo do pé | *Phalanx media digiti minimi pedis* | `FMA230986` | `bone.phalanx_media_pedis.right.5` | `pending_review` |
| 188 | `bone.phalanx_proximalis_pedis.left.1` | Ósseo | `lower_limb` | `left` | Falange proximal do hálux (I dedo do pé) | *Phalanx proximalis hallucis* | `FMA43254` | `bone.phalanx_proximalis_pedis.left.1` | `pending_review` |
| 189 | `bone.phalanx_proximalis_pedis.left.2` | Ósseo | `lower_limb` | `left` | Falange proximal do II dedo do pé | *Phalanx proximalis digiti II pedis* | `FMA32635` | `bone.phalanx_proximalis_pedis.left.2` | `pending_review` |
| 190 | `bone.phalanx_proximalis_pedis.left.3` | Ósseo | `lower_limb` | `left` | Falange proximal do III dedo do pé | *Phalanx proximalis digiti III pedis* | `FMA32637` | `bone.phalanx_proximalis_pedis.left.3` | `pending_review` |
| 191 | `bone.phalanx_proximalis_pedis.left.4` | Ósseo | `lower_limb` | `left` | Falange proximal do IV dedo do pé | *Phalanx proximalis digiti IV pedis* | `FMA32639` | `bone.phalanx_proximalis_pedis.left.4` | `pending_review` |
| 192 | `bone.phalanx_proximalis_pedis.left.5` | Ósseo | `lower_limb` | `left` | Falange proximal do V dedo do pé | *Phalanx proximalis digiti minimi pedis* | `FMA32641` | `bone.phalanx_proximalis_pedis.left.5` | `pending_review` |
| 193 | `bone.phalanx_proximalis_pedis.right.1` | Ósseo | `lower_limb` | `right` | Falange proximal do hálux (I dedo do pé) | *Phalanx proximalis hallucis* | `FMA43253` | `bone.phalanx_proximalis_pedis.right.1` | `pending_review` |
| 194 | `bone.phalanx_proximalis_pedis.right.2` | Ósseo | `lower_limb` | `right` | Falange proximal do II dedo do pé | *Phalanx proximalis digiti II pedis* | `FMA32634` | `bone.phalanx_proximalis_pedis.right.2` | `pending_review` |
| 195 | `bone.phalanx_proximalis_pedis.right.3` | Ósseo | `lower_limb` | `right` | Falange proximal do III dedo do pé | *Phalanx proximalis digiti III pedis* | `FMA32636` | `bone.phalanx_proximalis_pedis.right.3` | `pending_review` |
| 196 | `bone.phalanx_proximalis_pedis.right.4` | Ósseo | `lower_limb` | `right` | Falange proximal do IV dedo do pé | *Phalanx proximalis digiti IV pedis* | `FMA32638` | `bone.phalanx_proximalis_pedis.right.4` | `pending_review` |
| 197 | `bone.phalanx_proximalis_pedis.right.5` | Ósseo | `lower_limb` | `right` | Falange proximal do V dedo do pé | *Phalanx proximalis digiti minimi pedis* | `FMA32640` | `bone.phalanx_proximalis_pedis.right.5` | `pending_review` |
| 198 | `bone.talus.left` | Ósseo | `lower_limb` | `left` | Tálus | *Talus* | `FMA24483` | `bone.talus.left` | `pending_review` |
| 199 | `bone.talus.right` | Ósseo | `lower_limb` | `right` | Tálus | *Talus* | `FMA24482` | `bone.talus.right` | `pending_review` |
| 200 | `bone.tibia.left` | Ósseo | `lower_limb` | `left` | Tíbia | *Tibia* | `FMA24478` | `bone.tibia.left` | `pending_review` |
| 201 | `bone.tibia.right` | Ósseo | `lower_limb` | `right` | Tíbia | *Tibia* | `FMA24477` | `bone.tibia.right` | `pending_review` |
| 202 | `muscle.deltoideus.right` | Muscular | `upper_limb` | `right` | Músculo deltoide | *Musculus deltoideus* | `FMA34680`, `FMA34682`, `FMA34684` | `muscle.deltoideus.right.clavicular`, `muscle.deltoideus.right.acromial`, `muscle.deltoideus.right.spinal` | `pending_review` |
| 203 | `muscle.deltoideus.left` | Muscular | `upper_limb` | `left` | Músculo deltoide | *Musculus deltoideus* | `FMA34681`, `FMA34683`, `FMA34685` | `muscle.deltoideus.left.clavicular`, `muscle.deltoideus.left.acromial`, `muscle.deltoideus.left.spinal` | `pending_review` |
| 204 | `muscle.pectoralis_major.right` | Muscular | `upper_limb` | `right` | Músculo peitoral maior | *Musculus pectoralis major* | `FMA34690`, `FMA79979`, `FMA45874` | `muscle.pectoralis_major.right.clavicular`, `muscle.pectoralis_major.right.sternocostal`, `muscle.pectoralis_major.right.abdominal` | `pending_review` |
| 205 | `muscle.pectoralis_major.left` | Muscular | `upper_limb` | `left` | Músculo peitoral maior | *Musculus pectoralis major* | `FMA34691`, `FMA79980`, `FMA45875` | `muscle.pectoralis_major.left.clavicular`, `muscle.pectoralis_major.left.sternocostal`, `muscle.pectoralis_major.left.abdominal` | `pending_review` |
| 206 | `muscle.biceps_brachii.right` | Muscular | `upper_limb` | `right` | Músculo bíceps braquial | *Musculus biceps brachii* | `FMA37684`, `FMA37686` | `muscle.biceps_brachii.right.short_head`, `muscle.biceps_brachii.right.long_head` | `pending_review` |
| 207 | `muscle.biceps_brachii.left` | Muscular | `upper_limb` | `left` | Músculo bíceps braquial | *Musculus biceps brachii* | `FMA37685`, `FMA37687` | `muscle.biceps_brachii.left.short_head`, `muscle.biceps_brachii.left.long_head` | `pending_review` |
| 208 | `muscle.brachialis.right` | Muscular | `upper_limb` | `right` | Músculo braquial | *Musculus brachialis* | `FMA37668` | `muscle.brachialis.right` | `pending_review` |
| 209 | `muscle.brachialis.left` | Muscular | `upper_limb` | `left` | Músculo braquial | *Musculus brachialis* | `FMA37669` | `muscle.brachialis.left` | `pending_review` |
| 210 | `muscle.triceps_brachii.right` | Muscular | `upper_limb` | `right` | Músculo tríceps braquial | *Musculus triceps brachii* | `FMA37695`, `FMA37697`, `FMA37699` | `muscle.triceps_brachii.right.medial_head`, `muscle.triceps_brachii.right.lateral_head`, `muscle.triceps_brachii.right.long_head` | `pending_review` |
| 211 | `muscle.triceps_brachii.left` | Muscular | `upper_limb` | `left` | Músculo tríceps braquial | *Musculus triceps brachii* | `FMA37696`, `FMA37698`, `FMA37700` | `muscle.triceps_brachii.left.medial_head`, `muscle.triceps_brachii.left.lateral_head`, `muscle.triceps_brachii.left.long_head` | `pending_review` |
| 212 | `muscle.brachioradialis.right` | Muscular | `upper_limb` | `right` | Músculo braquiorradial | *Musculus brachioradialis* | `FMA38486` | `muscle.brachioradialis.right` | `pending_review` |
| 213 | `muscle.brachioradialis.left` | Muscular | `upper_limb` | `left` | Músculo braquiorradial | *Musculus brachioradialis* | `FMA38487` | `muscle.brachioradialis.left` | `pending_review` |
| 214 | `muscle.buccinator.left` | Muscular | `head_neck` | `left` | Músculo bucinador | *Musculus buccinator* | `FMA46836` | `muscle.buccinator.left` | `pending_review` |
| 215 | `muscle.buccinator.right` | Muscular | `head_neck` | `right` | Músculo bucinador | *Musculus buccinator* | `FMA46835` | `muscle.buccinator.right` | `pending_review` |
| 216 | `muscle.corrugator_supercilii.left` | Muscular | `head_neck` | `left` | Músculo corrugador do supercílio | *Musculus corrugator supercilii* | `FMA46797` | `muscle.corrugator_supercilii.left` | `pending_review` |
| 217 | `muscle.corrugator_supercilii.right` | Muscular | `head_neck` | `right` | Músculo corrugador do supercílio | *Musculus corrugator supercilii* | `FMA46796` | `muscle.corrugator_supercilii.right` | `pending_review` |
| 218 | `muscle.depressor_anguli_oris.left` | Muscular | `head_neck` | `left` | Músculo abaixador do ângulo da boca | *Musculus depressor anguli oris* | `FMA46830` | `muscle.depressor_anguli_oris.left` | `pending_review` |
| 219 | `muscle.depressor_anguli_oris.right` | Muscular | `head_neck` | `right` | Músculo abaixador do ângulo da boca | *Musculus depressor anguli oris* | `FMA46829` | `muscle.depressor_anguli_oris.right` | `pending_review` |
| 220 | `muscle.depressor_labii_inferioris.left` | Muscular | `head_neck` | `left` | Músculo abaixador do lábio inferior | *Musculus depressor labii inferioris* | `FMA46818` | `muscle.depressor_labii_inferioris.left` | `pending_review` |
| 221 | `muscle.depressor_labii_inferioris.right` | Muscular | `head_neck` | `right` | Músculo abaixador do lábio inferior | *Musculus depressor labii inferioris* | `FMA46817` | `muscle.depressor_labii_inferioris.right` | `pending_review` |
| 222 | `muscle.depressor_septi_nasi.left` | Muscular | `head_neck` | `left` | Músculo abaixador do septo nasal | *Musculus depressor septi nasi* | `FMA55609` | `muscle.depressor_septi_nasi.left` | `pending_review` |
| 223 | `muscle.depressor_septi_nasi.right` | Muscular | `head_neck` | `right` | Músculo abaixador do septo nasal | *Musculus depressor septi nasi* | `FMA55608` | `muscle.depressor_septi_nasi.right` | `pending_review` |
| 224 | `muscle.digastricus.left` | Muscular | `head_neck` | `left` | Músculo digástrico | *Musculus digastricus* | `FMA264840`, `FMA46305`, `FMA46307` | `muscle.digastricus.left.intermediate_tendon`, `muscle.digastricus.left.anterior_belly`, `muscle.digastricus.left.posterior_belly` | `pending_review` |
| 225 | `muscle.digastricus.right` | Muscular | `head_neck` | `right` | Músculo digástrico | *Musculus digastricus* | `FMA258850`, `FMA46304`, `FMA46306` | `muscle.digastricus.right.intermediate_tendon`, `muscle.digastricus.right.anterior_belly`, `muscle.digastricus.right.posterior_belly` | `pending_review` |
| 226 | `muscle.galea_aponeurotica.midline` | Muscular | `head_neck` | `midline` | Gálea aponeurótica (aponeurose epicrânica) | *Galea aponeurotica* | `FMA46768` | `muscle.galea_aponeurotica.midline` | `pending_review` |
| 227 | `muscle.geniohyoideus.left` | Muscular | `head_neck` | `left` | Músculo gênio-hióideo | *Musculus geniohyoideus* | `FMA46327` | `muscle.geniohyoideus.left` | `pending_review` |
| 228 | `muscle.geniohyoideus.right` | Muscular | `head_neck` | `right` | Músculo gênio-hióideo | *Musculus geniohyoideus* | `FMA46326` | `muscle.geniohyoideus.right` | `pending_review` |
| 229 | `muscle.iliocostalis_cervicis.left` | Muscular | `head_neck` | `left` | Músculo iliocostal do pescoço | *Musculus iliocostalis cervicis* | `FMA22745` | `muscle.iliocostalis_cervicis.left` | `pending_review` |
| 230 | `muscle.iliocostalis_cervicis.right` | Muscular | `head_neck` | `right` | Músculo iliocostal do pescoço | *Musculus iliocostalis cervicis* | `FMA22744` | `muscle.iliocostalis_cervicis.right` | `pending_review` |
| 231 | `muscle.interspinales_cervicis.midline` | Muscular | `head_neck` | `midline` | Músculos interespinhais do pescoço | *Musculi interspinales cervicis* | `FMA71309` | `muscle.interspinales_cervicis.midline` | `pending_review` |
| 232 | `muscle.intertransversarii_anteriores_cervicis.midline` | Muscular | `head_neck` | `midline` | Músculos intertransversários anteriores do pescoço | *Musculi intertransversarii anteriores cervicis* | `FMA71442` | `muscle.intertransversarii_anteriores_cervicis.midline` | `pending_review` |
| 233 | `muscle.intertransversarii_posteriores_cervicis.midline` | Muscular | `head_neck` | `midline` | Músculos intertransversários posteriores do pescoço | *Musculi intertransversarii posteriores cervicis* | `FMA71443` | `muscle.intertransversarii_posteriores_cervicis.midline` | `pending_review` |
| 234 | `muscle.levator_anguli_oris.left` | Muscular | `head_neck` | `left` | Músculo levantador do ângulo da boca | *Musculus levator anguli oris* | `FMA46824` | `muscle.levator_anguli_oris.left` | `pending_review` |
| 235 | `muscle.levator_anguli_oris.right` | Muscular | `head_neck` | `right` | Músculo levantador do ângulo da boca | *Musculus levator anguli oris* | `FMA46823` | `muscle.levator_anguli_oris.right` | `pending_review` |
| 236 | `muscle.levator_labii_superioris_alaeque_nasi.left` | Muscular | `head_neck` | `left` | Músculo levantador do lábio superior e da asa do nariz | *Musculus levator labii superioris alaeque nasi* | `FMA46804` | `muscle.levator_labii_superioris_alaeque_nasi.left` | `pending_review` |
| 237 | `muscle.levator_labii_superioris_alaeque_nasi.right` | Muscular | `head_neck` | `right` | Músculo levantador do lábio superior e da asa do nariz | *Musculus levator labii superioris alaeque nasi* | `FMA46803` | `muscle.levator_labii_superioris_alaeque_nasi.right` | `pending_review` |
| 238 | `muscle.levator_labii_superioris.left` | Muscular | `head_neck` | `left` | Músculo levantador do lábio superior | *Musculus levator labii superioris* | `FMA46807` | `muscle.levator_labii_superioris.left` | `pending_review` |
| 239 | `muscle.levator_labii_superioris.right` | Muscular | `head_neck` | `right` | Músculo levantador do lábio superior | *Musculus levator labii superioris* | `FMA46806` | `muscle.levator_labii_superioris.right` | `pending_review` |
| 240 | `muscle.longissimus_capitis.left` | Muscular | `head_neck` | `left` | Músculo longuíssimo da cabeça | *Musculus longissimus capitis* | `FMA22756` | `muscle.longissimus_capitis.left` | `pending_review` |
| 241 | `muscle.longissimus_capitis.right` | Muscular | `head_neck` | `right` | Músculo longuíssimo da cabeça | *Musculus longissimus capitis* | `FMA22754` | `muscle.longissimus_capitis.right` | `pending_review` |
| 242 | `muscle.longissimus_cervicis.left` | Muscular | `head_neck` | `left` | Músculo longuíssimo do pescoço | *Musculus longissimus cervicis* | `FMA22758` | `muscle.longissimus_cervicis.left` | `pending_review` |
| 243 | `muscle.longissimus_cervicis.right` | Muscular | `head_neck` | `right` | Músculo longuíssimo do pescoço | *Musculus longissimus cervicis* | `FMA22757` | `muscle.longissimus_cervicis.right` | `pending_review` |
| 244 | `muscle.longus_capitis.left` | Muscular | `head_neck` | `left` | Músculo longo da cabeça | *Musculus longus capitis* | `FMA46310` | `muscle.longus_capitis.left` | `pending_review` |
| 245 | `muscle.longus_capitis.right` | Muscular | `head_neck` | `right` | Músculo longo da cabeça | *Musculus longus capitis* | `FMA46309` | `muscle.longus_capitis.right` | `pending_review` |
| 246 | `muscle.longus_colli.left` | Muscular | `head_neck` | `left` | Músculo longo do pescoço | *Musculus longus colli* | `FMA46284`, `FMA46286`, `FMA46288` | `muscle.longus_colli.left.superior_oblique`, `muscle.longus_colli.left.vertical_intermediate`, `muscle.longus_colli.left.inferior_oblique` | `pending_review` |
| 247 | `muscle.longus_colli.right` | Muscular | `head_neck` | `right` | Músculo longo do pescoço | *Musculus longus colli* | `FMA46283`, `FMA46285`, `FMA46287` | `muscle.longus_colli.right.superior_oblique`, `muscle.longus_colli.right.vertical_intermediate`, `muscle.longus_colli.right.inferior_oblique` | `pending_review` |
| 248 | `muscle.masseter.left` | Muscular | `head_neck` | `left` | Músculo masseter | *Musculus masseter* | `FMA49002`, `FMA49005` | `muscle.masseter.left.superficial`, `muscle.masseter.left.deep` | `pending_review` |
| 249 | `muscle.masseter.right` | Muscular | `head_neck` | `right` | Músculo masseter | *Musculus masseter* | `FMA49001`, `FMA49004` | `muscle.masseter.right.superficial`, `muscle.masseter.right.deep` | `pending_review` |
| 250 | `muscle.mentalis.left` | Muscular | `head_neck` | `left` | Músculo mentual | *Musculus mentalis* | `FMA46827` | `muscle.mentalis.left` | `pending_review` |
| 251 | `muscle.mentalis.right` | Muscular | `head_neck` | `right` | Músculo mentual | *Musculus mentalis* | `FMA46826` | `muscle.mentalis.right` | `pending_review` |
| 252 | `muscle.mylohyoideus.left` | Muscular | `head_neck` | `left` | Músculo milo-hióideo | *Musculus mylohyoideus* | `FMA46322` | `muscle.mylohyoideus.left` | `pending_review` |
| 253 | `muscle.mylohyoideus.right` | Muscular | `head_neck` | `right` | Músculo milo-hióideo | *Musculus mylohyoideus* | `FMA46321` | `muscle.mylohyoideus.right` | `pending_review` |
| 254 | `muscle.nasalis.left` | Muscular | `head_neck` | `left` | Músculo nasal | *Musculus nasalis* | `FMA55607` | `muscle.nasalis.left` | `pending_review` |
| 255 | `muscle.nasalis.right` | Muscular | `head_neck` | `right` | Músculo nasal | *Musculus nasalis* | `FMA55606` | `muscle.nasalis.right` | `pending_review` |
| 256 | `muscle.obliquus_capitis_inferior.left` | Muscular | `head_neck` | `left` | Músculo oblíquo inferior da cabeça | *Musculus obliquus capitis inferior* | `FMA32537` | `muscle.obliquus_capitis_inferior.left` | `pending_review` |
| 257 | `muscle.obliquus_capitis_inferior.right` | Muscular | `head_neck` | `right` | Músculo oblíquo inferior da cabeça | *Musculus obliquus capitis inferior* | `FMA32536` | `muscle.obliquus_capitis_inferior.right` | `pending_review` |
| 258 | `muscle.obliquus_capitis_superior.left` | Muscular | `head_neck` | `left` | Músculo oblíquo superior da cabeça | *Musculus obliquus capitis superior* | `FMA32535` | `muscle.obliquus_capitis_superior.left` | `pending_review` |
| 259 | `muscle.obliquus_capitis_superior.right` | Muscular | `head_neck` | `right` | Músculo oblíquo superior da cabeça | *Musculus obliquus capitis superior* | `FMA32534` | `muscle.obliquus_capitis_superior.right` | `pending_review` |
| 260 | `muscle.occipitofrontalis.left` | Muscular | `head_neck` | `left` | Músculo occipitofrontal | *Musculus occipitofrontalis* | `FMA46760`, `FMA46762` | `muscle.occipitofrontalis.left.frontalis`, `muscle.occipitofrontalis.left.occipitalis` | `pending_review` |
| 261 | `muscle.occipitofrontalis.right` | Muscular | `head_neck` | `right` | Músculo occipitofrontal | *Musculus occipitofrontalis* | `FMA46759`, `FMA46761` | `muscle.occipitofrontalis.right.frontalis`, `muscle.occipitofrontalis.right.occipitalis` | `pending_review` |
| 262 | `muscle.omohyoideus.left` | Muscular | `head_neck` | `left` | Músculo omo-hióideo | *Musculus omohyoideus* | `FMA13349` | `muscle.omohyoideus.left` | `pending_review` |
| 263 | `muscle.omohyoideus.right` | Muscular | `head_neck` | `right` | Músculo omo-hióideo | *Musculus omohyoideus* | `FMA13348` | `muscle.omohyoideus.right` | `pending_review` |
| 264 | `muscle.orbicularis_oculi.left` | Muscular | `head_neck` | `left` | Músculo orbicular do olho | *Musculus orbicularis oculi* | `FMA46783`, `FMA46786` | `muscle.orbicularis_oculi.left.orbital`, `muscle.orbicularis_oculi.left.palpebral` | `pending_review` |
| 265 | `muscle.orbicularis_oculi.right` | Muscular | `head_neck` | `right` | Músculo orbicular do olho | *Musculus orbicularis oculi* | `FMA46782`, `FMA46785` | `muscle.orbicularis_oculi.right.orbital`, `muscle.orbicularis_oculi.right.palpebral` | `pending_review` |
| 266 | `muscle.orbicularis_oris.midline` | Muscular | `head_neck` | `midline` | Músculo orbicular da boca | *Musculus orbicularis oris* | `FMA46841` | `muscle.orbicularis_oris.midline` | `pending_review` |
| 267 | `muscle.platysma.left` | Muscular | `head_neck` | `left` | Músculo platisma | *Platysma* | `FMA45740` | `muscle.platysma.left` | `pending_review` |
| 268 | `muscle.platysma.right` | Muscular | `head_neck` | `right` | Músculo platisma | *Platysma* | `FMA45739` | `muscle.platysma.right` | `pending_review` |
| 269 | `muscle.procerus.left` | Muscular | `head_neck` | `left` | Músculo prócero | *Musculus procerus* | `FMA55611` | `muscle.procerus.left` | `pending_review` |
| 270 | `muscle.procerus.right` | Muscular | `head_neck` | `right` | Músculo prócero | *Musculus procerus* | `FMA55610` | `muscle.procerus.right` | `pending_review` |
| 271 | `muscle.pterygoideus_lateralis.left` | Muscular | `head_neck` | `left` | Músculo pterigóideo lateral | *Musculus pterygoideus lateralis* | `FMA49023`, `FMA49025` | `muscle.pterygoideus_lateralis.left.lower_head`, `muscle.pterygoideus_lateralis.left.upper_head` | `pending_review` |
| 272 | `muscle.pterygoideus_lateralis.right` | Muscular | `head_neck` | `right` | Músculo pterigóideo lateral | *Musculus pterygoideus lateralis* | `FMA49022`, `FMA49024` | `muscle.pterygoideus_lateralis.right.lower_head`, `muscle.pterygoideus_lateralis.right.upper_head` | `pending_review` |
| 273 | `muscle.pterygoideus_medialis.left` | Muscular | `head_neck` | `left` | Músculo pterigóideo medial | *Musculus pterygoideus medialis* | `FMA49013` | `muscle.pterygoideus_medialis.left` | `pending_review` |
| 274 | `muscle.pterygoideus_medialis.right` | Muscular | `head_neck` | `right` | Músculo pterigóideo medial | *Musculus pterygoideus medialis* | `FMA49012` | `muscle.pterygoideus_medialis.right` | `pending_review` |
| 275 | `muscle.rectus_capitis_anterior.left` | Muscular | `head_neck` | `left` | Músculo reto anterior da cabeça | *Musculus rectus capitis anterior* | `FMA46314` | `muscle.rectus_capitis_anterior.left` | `pending_review` |
| 276 | `muscle.rectus_capitis_anterior.right` | Muscular | `head_neck` | `right` | Músculo reto anterior da cabeça | *Musculus rectus capitis anterior* | `FMA46313` | `muscle.rectus_capitis_anterior.right` | `pending_review` |
| 277 | `muscle.rectus_capitis_lateralis.left` | Muscular | `head_neck` | `left` | Músculo reto lateral da cabeça | *Musculus rectus capitis lateralis* | `FMA46318` | `muscle.rectus_capitis_lateralis.left` | `pending_review` |
| 278 | `muscle.rectus_capitis_lateralis.right` | Muscular | `head_neck` | `right` | Músculo reto lateral da cabeça | *Musculus rectus capitis lateralis* | `FMA46317` | `muscle.rectus_capitis_lateralis.right` | `pending_review` |
| 279 | `muscle.rectus_capitis_posterior_major.left` | Muscular | `head_neck` | `left` | Músculo reto posterior maior da cabeça | *Musculus rectus capitis posterior major* | `FMA32531` | `muscle.rectus_capitis_posterior_major.left` | `pending_review` |
| 280 | `muscle.rectus_capitis_posterior_major.right` | Muscular | `head_neck` | `right` | Músculo reto posterior maior da cabeça | *Musculus rectus capitis posterior major* | `FMA32530` | `muscle.rectus_capitis_posterior_major.right` | `pending_review` |
| 281 | `muscle.rectus_capitis_posterior_minor.left` | Muscular | `head_neck` | `left` | Músculo reto posterior menor da cabeça | *Musculus rectus capitis posterior minor* | `FMA32533` | `muscle.rectus_capitis_posterior_minor.left` | `pending_review` |
| 282 | `muscle.rectus_capitis_posterior_minor.right` | Muscular | `head_neck` | `right` | Músculo reto posterior menor da cabeça | *Musculus rectus capitis posterior minor* | `FMA32532` | `muscle.rectus_capitis_posterior_minor.right` | `pending_review` |
| 283 | `muscle.risorius.left` | Muscular | `head_neck` | `left` | Músculo risório | *Musculus risorius* | `FMA46840` | `muscle.risorius.left` | `pending_review` |
| 284 | `muscle.risorius.right` | Muscular | `head_neck` | `right` | Músculo risório | *Musculus risorius* | `FMA46839` | `muscle.risorius.right` | `pending_review` |
| 285 | `muscle.rotatores_cervicis.left` | Muscular | `head_neck` | `left` | Músculos rotadores do pescoço | *Musculi rotatores cervicis* | `FMA81753` | `muscle.rotatores_cervicis.left` | `pending_review` |
| 286 | `muscle.rotatores_cervicis.right` | Muscular | `head_neck` | `right` | Músculos rotadores do pescoço | *Musculi rotatores cervicis* | `FMA81752` | `muscle.rotatores_cervicis.right` | `pending_review` |
| 287 | `muscle.scalenus_anterior.left` | Muscular | `head_neck` | `left` | Músculo escaleno anterior | *Musculus scalenus anterior* | `FMA13393` | `muscle.scalenus_anterior.left` | `pending_review` |
| 288 | `muscle.scalenus_anterior.right` | Muscular | `head_neck` | `right` | Músculo escaleno anterior | *Musculus scalenus anterior* | `FMA13392` | `muscle.scalenus_anterior.right` | `pending_review` |
| 289 | `muscle.scalenus_medius.left` | Muscular | `head_neck` | `left` | Músculo escaleno médio | *Musculus scalenus medius* | `FMA13391` | `muscle.scalenus_medius.left` | `pending_review` |
| 290 | `muscle.scalenus_medius.right` | Muscular | `head_neck` | `right` | Músculo escaleno médio | *Musculus scalenus medius* | `FMA13390` | `muscle.scalenus_medius.right` | `pending_review` |
| 291 | `muscle.scalenus_posterior.left` | Muscular | `head_neck` | `left` | Músculo escaleno posterior | *Musculus scalenus posterior* | `FMA13389` | `muscle.scalenus_posterior.left` | `pending_review` |
| 292 | `muscle.scalenus_posterior.right` | Muscular | `head_neck` | `right` | Músculo escaleno posterior | *Musculus scalenus posterior* | `FMA13388` | `muscle.scalenus_posterior.right` | `pending_review` |
| 293 | `muscle.semispinalis_capitis.left` | Muscular | `head_neck` | `left` | Músculo semiespinal da cabeça | *Musculus semispinalis capitis* | `FMA22877` | `muscle.semispinalis_capitis.left` | `pending_review` |
| 294 | `muscle.semispinalis_capitis.right` | Muscular | `head_neck` | `right` | Músculo semiespinal da cabeça | *Musculus semispinalis capitis* | `FMA22876` | `muscle.semispinalis_capitis.right` | `pending_review` |
| 295 | `muscle.semispinalis_cervicis.left` | Muscular | `head_neck` | `left` | Músculo semiespinal do pescoço | *Musculus semispinalis cervicis* | `FMA22875` | `muscle.semispinalis_cervicis.left` | `pending_review` |
| 296 | `muscle.semispinalis_cervicis.right` | Muscular | `head_neck` | `right` | Músculo semiespinal do pescoço | *Musculus semispinalis cervicis* | `FMA22874` | `muscle.semispinalis_cervicis.right` | `pending_review` |
| 297 | `muscle.spinalis_cervicis.left` | Muscular | `head_neck` | `left` | Músculo espinal do pescoço | *Musculus spinalis cervicis* | `FMA22782` | `muscle.spinalis_cervicis.left` | `pending_review` |
| 298 | `muscle.spinalis_cervicis.right` | Muscular | `head_neck` | `right` | Músculo espinal do pescoço | *Musculus spinalis cervicis* | `FMA22781` | `muscle.spinalis_cervicis.right` | `pending_review` |
| 299 | `muscle.splenius_capitis.left` | Muscular | `head_neck` | `left` | Músculo esplênio da cabeça | *Musculus splenius capitis* | `FMA22729` | `muscle.splenius_capitis.left` | `pending_review` |
| 300 | `muscle.splenius_capitis.right` | Muscular | `head_neck` | `right` | Músculo esplênio da cabeça | *Musculus splenius capitis* | `FMA22728` | `muscle.splenius_capitis.right` | `pending_review` |
| 301 | `muscle.splenius_cervicis.left` | Muscular | `head_neck` | `left` | Músculo esplênio do pescoço | *Musculus splenius cervicis* | `FMA22727` | `muscle.splenius_cervicis.left` | `pending_review` |
| 302 | `muscle.splenius_cervicis.right` | Muscular | `head_neck` | `right` | Músculo esplênio do pescoço | *Musculus splenius cervicis* | `FMA22726` | `muscle.splenius_cervicis.right` | `pending_review` |
| 303 | `muscle.sternocleidomastoideus.left` | Muscular | `head_neck` | `left` | Músculo esternocleidomastóideo | *Musculus sternocleidomastoideus* | `FMA13409` | `muscle.sternocleidomastoideus.left` | `pending_review` |
| 304 | `muscle.sternocleidomastoideus.right` | Muscular | `head_neck` | `right` | Músculo esternocleidomastóideo | *Musculus sternocleidomastoideus* | `FMA13408` | `muscle.sternocleidomastoideus.right` | `pending_review` |
| 305 | `muscle.sternohyoideus.left` | Muscular | `head_neck` | `left` | Músculo esterno-hióideo | *Musculus sternohyoideus* | `FMA13347` | `muscle.sternohyoideus.left` | `pending_review` |
| 306 | `muscle.sternohyoideus.right` | Muscular | `head_neck` | `right` | Músculo esterno-hióideo | *Musculus sternohyoideus* | `FMA13346` | `muscle.sternohyoideus.right` | `pending_review` |
| 307 | `muscle.sternothyroideus.left` | Muscular | `head_neck` | `left` | Músculo esternotireóideo | *Musculus sternothyroideus* | `FMA13351` | `muscle.sternothyroideus.left` | `pending_review` |
| 308 | `muscle.sternothyroideus.right` | Muscular | `head_neck` | `right` | Músculo esternotireóideo | *Musculus sternothyroideus* | `FMA13350` | `muscle.sternothyroideus.right` | `pending_review` |
| 309 | `muscle.stylohyoideus.left` | Muscular | `head_neck` | `left` | Músculo estilo-hióideo | *Musculus stylohyoideus* | `FMA45827` | `muscle.stylohyoideus.left` | `pending_review` |
| 310 | `muscle.stylohyoideus.right` | Muscular | `head_neck` | `right` | Músculo estilo-hióideo | *Musculus stylohyoideus* | `FMA45826` | `muscle.stylohyoideus.right` | `pending_review` |
| 311 | `muscle.temporalis.left` | Muscular | `head_neck` | `left` | Músculo temporal | *Musculus temporalis* | `FMA49008` | `muscle.temporalis.left` | `pending_review` |
| 312 | `muscle.temporalis.right` | Muscular | `head_neck` | `right` | Músculo temporal | *Musculus temporalis* | `FMA49007` | `muscle.temporalis.right` | `pending_review` |
| 313 | `muscle.temporoparietalis.left` | Muscular | `head_neck` | `left` | Músculo temporoparietal | *Musculus temporoparietalis* | `FMA46764` | `muscle.temporoparietalis.left` | `pending_review` |
| 314 | `muscle.temporoparietalis.right` | Muscular | `head_neck` | `right` | Músculo temporoparietal | *Musculus temporoparietalis* | `FMA46763` | `muscle.temporoparietalis.right` | `pending_review` |
| 315 | `muscle.thyrohyoideus.left` | Muscular | `head_neck` | `left` | Músculo tireo-hióideo | *Musculus thyrohyoideus* | `FMA13353` | `muscle.thyrohyoideus.left` | `pending_review` |
| 316 | `muscle.thyrohyoideus.right` | Muscular | `head_neck` | `right` | Músculo tireo-hióideo | *Musculus thyrohyoideus* | `FMA13352` | `muscle.thyrohyoideus.right` | `pending_review` |
| 317 | `muscle.zygomaticus_major.left` | Muscular | `head_neck` | `left` | Músculo zigomático maior | *Musculus zygomaticus major* | `FMA46813` | `muscle.zygomaticus_major.left` | `pending_review` |
| 318 | `muscle.zygomaticus_major.right` | Muscular | `head_neck` | `right` | Músculo zigomático maior | *Musculus zygomaticus major* | `FMA46812` | `muscle.zygomaticus_major.right` | `pending_review` |
| 319 | `muscle.zygomaticus_minor.left` | Muscular | `head_neck` | `left` | Músculo zigomático menor | *Musculus zygomaticus minor* | `FMA46815` | `muscle.zygomaticus_minor.left` | `pending_review` |
| 320 | `muscle.zygomaticus_minor.right` | Muscular | `head_neck` | `right` | Músculo zigomático menor | *Musculus zygomaticus minor* | `FMA46814` | `muscle.zygomaticus_minor.right` | `pending_review` |
| 321 | `muscle.coccygeus.left` | Muscular | `trunk` | `left` | Músculo coccígeo (isquiococcígeo) | *Musculus coccygeus* | `FMA46444` | `muscle.coccygeus.left` | `pending_review` |
| 322 | `muscle.coccygeus.right` | Muscular | `trunk` | `right` | Músculo coccígeo (isquiococcígeo) | *Musculus coccygeus* | `FMA46443` | `muscle.coccygeus.right` | `pending_review` |
| 323 | `muscle.diaphragma.midline` | Muscular | `trunk` | `midline` | Diafragma | *Diaphragma* | `FMA13295` | `muscle.diaphragma.midline` | `pending_review` |
| 324 | `muscle.iliocostalis_lumborum.left` | Muscular | `trunk` | `left` | Músculo iliocostal do lombo | *Musculus iliocostalis lumborum* | `FMA22741` | `muscle.iliocostalis_lumborum.left` | `pending_review` |
| 325 | `muscle.iliocostalis_lumborum.right` | Muscular | `trunk` | `right` | Músculo iliocostal do lombo | *Musculus iliocostalis lumborum* | `FMA22740` | `muscle.iliocostalis_lumborum.right` | `pending_review` |
| 326 | `muscle.iliocostalis_thoracis.left` | Muscular | `trunk` | `left` | Músculo iliocostal do tórax | *Musculus iliocostalis thoracis* | `FMA22743` | `muscle.iliocostalis_thoracis.left` | `pending_review` |
| 327 | `muscle.iliocostalis_thoracis.right` | Muscular | `trunk` | `right` | Músculo iliocostal do tórax | *Musculus iliocostalis thoracis* | `FMA22742` | `muscle.iliocostalis_thoracis.right` | `pending_review` |
| 328 | `muscle.intercostales_externi.midline` | Muscular | `trunk` | `midline` | Músculos intercostais externos | *Musculi intercostales externi* | `FMA9756` | `muscle.intercostales_externi.midline` | `pending_review` |
| 329 | `muscle.intercostales_interni.midline` | Muscular | `trunk` | `midline` | Músculos intercostais internos | *Musculi intercostales interni* | `FMA9757` | `muscle.intercostales_interni.midline` | `pending_review` |
| 330 | `muscle.intercostales_intimi.midline` | Muscular | `trunk` | `midline` | Músculos intercostais íntimos | *Musculi intercostales intimi* | `FMA9758` | `muscle.intercostales_intimi.midline` | `pending_review` |
| 331 | `muscle.interspinales_lumborum.midline` | Muscular | `trunk` | `midline` | Músculos interespinhais do lombo | *Musculi interspinales lumborum* | `FMA71307` | `muscle.interspinales_lumborum.midline` | `pending_review` |
| 332 | `muscle.interspinales_thoracis.midline` | Muscular | `trunk` | `midline` | Músculos interespinhais do tórax | *Musculi interspinales thoracis* | `FMA71308` | `muscle.interspinales_thoracis.midline` | `pending_review` |
| 333 | `muscle.intertransversarii_laterales_lumborum.midline` | Muscular | `trunk` | `midline` | Músculos intertransversários laterais do lombo | *Musculi intertransversarii laterales lumborum* | `FMA71444` | `muscle.intertransversarii_laterales_lumborum.midline` | `pending_review` |
| 334 | `muscle.intertransversarii_mediales_lumborum.midline` | Muscular | `trunk` | `midline` | Músculos intertransversários mediais do lombo | *Musculi intertransversarii mediales lumborum* | `FMA76775` | `muscle.intertransversarii_mediales_lumborum.midline` | `pending_review` |
| 335 | `muscle.latissimus_dorsi.left` | Muscular | `trunk` | `left` | Músculo latíssimo do dorso | *Musculus latissimus dorsi* | `FMA13359` | `muscle.latissimus_dorsi.left` | `pending_review` |
| 336 | `muscle.latissimus_dorsi.right` | Muscular | `trunk` | `right` | Músculo latíssimo do dorso | *Musculus latissimus dorsi* | `FMA13358` | `muscle.latissimus_dorsi.right` | `pending_review` |
| 337 | `muscle.levator_ani.left` | Muscular | `trunk` | `left` | Músculo levantador do ânus | *Musculus levator ani* | `FMA45855`, `FMA45857`, `FMA45859` | `muscle.levator_ani.left.pubococcygeus`, `muscle.levator_ani.left.puborectalis`, `muscle.levator_ani.left.iliococcygeus` | `pending_review` |
| 338 | `muscle.levator_ani.right` | Muscular | `trunk` | `right` | Músculo levantador do ânus | *Musculus levator ani* | `FMA45854`, `FMA45856`, `FMA45858` | `muscle.levator_ani.right.pubococcygeus`, `muscle.levator_ani.right.puborectalis`, `muscle.levator_ani.right.iliococcygeus` | `pending_review` |
| 339 | `muscle.levator_scapulae.left` | Muscular | `trunk` | `left` | Músculo levantador da escápula | *Musculus levator scapulae* | `FMA32541` | `muscle.levator_scapulae.left` | `pending_review` |
| 340 | `muscle.levator_scapulae.right` | Muscular | `trunk` | `right` | Músculo levantador da escápula | *Musculus levator scapulae* | `FMA32540` | `muscle.levator_scapulae.right` | `pending_review` |
| 341 | `muscle.levatores_costarum_breves.left` | Muscular | `trunk` | `left` | Músculos levantadores curtos das costelas | *Musculi levatores costarum breves* | `FMA74078` | `muscle.levatores_costarum_breves.left` | `pending_review` |
| 342 | `muscle.levatores_costarum_breves.right` | Muscular | `trunk` | `right` | Músculos levantadores curtos das costelas | *Musculi levatores costarum breves* | `FMA74077` | `muscle.levatores_costarum_breves.right` | `pending_review` |
| 343 | `muscle.levatores_costarum_longi.left` | Muscular | `trunk` | `left` | Músculos levantadores longos das costelas | *Musculi levatores costarum longi* | `FMA74076` | `muscle.levatores_costarum_longi.left` | `pending_review` |
| 344 | `muscle.levatores_costarum_longi.right` | Muscular | `trunk` | `right` | Músculos levantadores longos das costelas | *Musculi levatores costarum longi* | `FMA74075` | `muscle.levatores_costarum_longi.right` | `pending_review` |
| 345 | `muscle.linea_alba.midline` | Muscular | `trunk` | `midline` | Linha alba | *Linea alba* | `FMA11336` | `muscle.linea_alba.midline` | `pending_review` |
| 346 | `muscle.longissimus_thoracis.left` | Muscular | `trunk` | `left` | Músculo longuíssimo do tórax | *Musculus longissimus thoracis* | `FMA22753` | `muscle.longissimus_thoracis.left` | `pending_review` |
| 347 | `muscle.longissimus_thoracis.right` | Muscular | `trunk` | `right` | Músculo longuíssimo do tórax | *Musculus longissimus thoracis* | `FMA22751` | `muscle.longissimus_thoracis.right` | `pending_review` |
| 348 | `muscle.multifidus.left` | Muscular | `trunk` | `left` | Músculos multífidos | *Musculi multifidi* | `FMA22879` | `muscle.multifidus.left` | `pending_review` |
| 349 | `muscle.multifidus.right` | Muscular | `trunk` | `right` | Músculos multífidos | *Musculi multifidi* | `FMA22878` | `muscle.multifidus.right` | `pending_review` |
| 350 | `muscle.obliquus_externus_abdominis.left` | Muscular | `trunk` | `left` | Músculo oblíquo externo do abdome | *Musculus obliquus externus abdominis* | `FMA13337` | `muscle.obliquus_externus_abdominis.left` | `pending_review` |
| 351 | `muscle.obliquus_externus_abdominis.right` | Muscular | `trunk` | `right` | Músculo oblíquo externo do abdome | *Musculus obliquus externus abdominis* | `FMA13336` | `muscle.obliquus_externus_abdominis.right` | `pending_review` |
| 352 | `muscle.obliquus_internus_abdominis.left` | Muscular | `trunk` | `left` | Músculo oblíquo interno do abdome | *Musculus obliquus internus abdominis* | `FMA13893` | `muscle.obliquus_internus_abdominis.left` | `pending_review` |
| 353 | `muscle.obliquus_internus_abdominis.right` | Muscular | `trunk` | `right` | Músculo oblíquo interno do abdome | *Musculus obliquus internus abdominis* | `FMA13892` | `muscle.obliquus_internus_abdominis.right` | `pending_review` |
| 354 | `muscle.pyramidalis.left` | Muscular | `trunk` | `left` | Músculo piramidal | *Musculus pyramidalis* | `FMA22347` | `muscle.pyramidalis.left` | `pending_review` |
| 355 | `muscle.pyramidalis.right` | Muscular | `trunk` | `right` | Músculo piramidal | *Musculus pyramidalis* | `FMA22346` | `muscle.pyramidalis.right` | `pending_review` |
| 356 | `muscle.quadratus_lumborum.left` | Muscular | `trunk` | `left` | Músculo quadrado do lombo | *Musculus quadratus lumborum* | `FMA22349` | `muscle.quadratus_lumborum.left` | `pending_review` |
| 357 | `muscle.quadratus_lumborum.right` | Muscular | `trunk` | `right` | Músculo quadrado do lombo | *Musculus quadratus lumborum* | `FMA22348` | `muscle.quadratus_lumborum.right` | `pending_review` |
| 358 | `muscle.rectus_abdominis.left` | Muscular | `trunk` | `left` | Músculo reto do abdome | *Musculus rectus abdominis* | `FMA13378` | `muscle.rectus_abdominis.left` | `pending_review` |
| 359 | `muscle.rectus_abdominis.right` | Muscular | `trunk` | `right` | Músculo reto do abdome | *Musculus rectus abdominis* | `FMA13377` | `muscle.rectus_abdominis.right` | `pending_review` |
| 360 | `muscle.rhomboideus_major.left` | Muscular | `trunk` | `left` | Músculo romboide maior | *Musculus rhomboideus major* | `FMA13382` | `muscle.rhomboideus_major.left` | `pending_review` |
| 361 | `muscle.rhomboideus_major.right` | Muscular | `trunk` | `right` | Músculo romboide maior | *Musculus rhomboideus major* | `FMA13381` | `muscle.rhomboideus_major.right` | `pending_review` |
| 362 | `muscle.rhomboideus_minor.left` | Muscular | `trunk` | `left` | Músculo romboide menor | *Musculus rhomboideus minor* | `FMA13384` | `muscle.rhomboideus_minor.left` | `pending_review` |
| 363 | `muscle.rhomboideus_minor.right` | Muscular | `trunk` | `right` | Músculo romboide menor | *Musculus rhomboideus minor* | `FMA13383` | `muscle.rhomboideus_minor.right` | `pending_review` |
| 364 | `muscle.rotatores_lumborum.left` | Muscular | `trunk` | `left` | Músculos rotadores do lombo | *Musculi rotatores lumborum* | `FMA23090` | `muscle.rotatores_lumborum.left` | `pending_review` |
| 365 | `muscle.rotatores_lumborum.right` | Muscular | `trunk` | `right` | Músculos rotadores do lombo | *Musculi rotatores lumborum* | `FMA23089` | `muscle.rotatores_lumborum.right` | `pending_review` |
| 366 | `muscle.rotatores_thoracis.midline` | Muscular | `trunk` | `midline` | Músculos rotadores do tórax | *Musculi rotatores thoracis* | `FMA23083` | `muscle.rotatores_thoracis.midline` | `pending_review` |
| 367 | `muscle.semispinalis_thoracis.left` | Muscular | `trunk` | `left` | Músculo semiespinal do tórax | *Musculus semispinalis thoracis* | `FMA22873` | `muscle.semispinalis_thoracis.left` | `pending_review` |
| 368 | `muscle.semispinalis_thoracis.right` | Muscular | `trunk` | `right` | Músculo semiespinal do tórax | *Musculus semispinalis thoracis* | `FMA22872` | `muscle.semispinalis_thoracis.right` | `pending_review` |
| 369 | `muscle.serratus_posterior_inferior.left` | Muscular | `trunk` | `left` | Músculo serrátil posterior inferior | *Musculus serratus posterior inferior* | `FMA13406` | `muscle.serratus_posterior_inferior.left` | `pending_review` |
| 370 | `muscle.serratus_posterior_inferior.right` | Muscular | `trunk` | `right` | Músculo serrátil posterior inferior | *Musculus serratus posterior inferior* | `FMA13405` | `muscle.serratus_posterior_inferior.right` | `pending_review` |
| 371 | `muscle.serratus_posterior_superior.left` | Muscular | `trunk` | `left` | Músculo serrátil posterior superior | *Musculus serratus posterior superior* | `FMA13404` | `muscle.serratus_posterior_superior.left` | `pending_review` |
| 372 | `muscle.serratus_posterior_superior.right` | Muscular | `trunk` | `right` | Músculo serrátil posterior superior | *Musculus serratus posterior superior* | `FMA13403` | `muscle.serratus_posterior_superior.right` | `pending_review` |
| 373 | `muscle.sphincter_ani_externus.midline` | Muscular | `trunk` | `midline` | Músculo esfíncter externo do ânus | *Musculus sphincter ani externus* | `FMA21930` | `muscle.sphincter_ani_externus.midline` | `pending_review` |
| 374 | `muscle.spinalis_thoracis.left` | Muscular | `trunk` | `left` | Músculo espinal do tórax | *Musculus spinalis thoracis* | `FMA22780` | `muscle.spinalis_thoracis.left` | `pending_review` |
| 375 | `muscle.spinalis_thoracis.right` | Muscular | `trunk` | `right` | Músculo espinal do tórax | *Musculus spinalis thoracis* | `FMA22779` | `muscle.spinalis_thoracis.right` | `pending_review` |
| 376 | `muscle.transversus_abdominis.left` | Muscular | `trunk` | `left` | Músculo transverso do abdome | *Musculus transversus abdominis* | `FMA22345` | `muscle.transversus_abdominis.left` | `pending_review` |
| 377 | `muscle.transversus_abdominis.right` | Muscular | `trunk` | `right` | Músculo transverso do abdome | *Musculus transversus abdominis* | `FMA22344` | `muscle.transversus_abdominis.right` | `pending_review` |
| 378 | `muscle.transversus_thoracis.left` | Muscular | `trunk` | `left` | Músculo transverso do tórax | *Musculus transversus thoracis* | `FMA9762` | `muscle.transversus_thoracis.left` | `pending_review` |
| 379 | `muscle.transversus_thoracis.right` | Muscular | `trunk` | `right` | Músculo transverso do tórax | *Musculus transversus thoracis* | `FMA9761` | `muscle.transversus_thoracis.right` | `pending_review` |
| 380 | `muscle.trapezius.left` | Muscular | `trunk` | `left` | Músculo trapézio | *Musculus trapezius* | `FMA33583`, `FMA33585`, `FMA33587` | `muscle.trapezius.left.ascending`, `muscle.trapezius.left.transverse`, `muscle.trapezius.left.descending` | `pending_review` |
| 381 | `muscle.trapezius.right` | Muscular | `trunk` | `right` | Músculo trapézio | *Musculus trapezius* | `FMA33581`, `FMA33584`, `FMA33586` | `muscle.trapezius.right.ascending`, `muscle.trapezius.right.transverse`, `muscle.trapezius.right.descending` | `pending_review` |
| 382 | `muscle.abductor_digiti_minimi_manus.left` | Muscular | `upper_limb` | `left` | Músculo abdutor do dedo mínimo da mão | *Musculus abductor digiti minimi manus* | `FMA37397` | `muscle.abductor_digiti_minimi_manus.left` | `pending_review` |
| 383 | `muscle.abductor_digiti_minimi_manus.right` | Muscular | `upper_limb` | `right` | Músculo abdutor do dedo mínimo da mão | *Musculus abductor digiti minimi manus* | `FMA37396` | `muscle.abductor_digiti_minimi_manus.right` | `pending_review` |
| 384 | `muscle.abductor_pollicis_brevis.left` | Muscular | `upper_limb` | `left` | Músculo abdutor curto do polegar | *Musculus abductor pollicis brevis* | `FMA37387` | `muscle.abductor_pollicis_brevis.left` | `pending_review` |
| 385 | `muscle.abductor_pollicis_brevis.right` | Muscular | `upper_limb` | `right` | Músculo abdutor curto do polegar | *Musculus abductor pollicis brevis* | `FMA37386` | `muscle.abductor_pollicis_brevis.right` | `pending_review` |
| 386 | `muscle.abductor_pollicis_longus.left` | Muscular | `upper_limb` | `left` | Músculo abdutor longo do polegar | *Musculus abductor pollicis longus* | `FMA38517` | `muscle.abductor_pollicis_longus.left` | `pending_review` |
| 387 | `muscle.abductor_pollicis_longus.right` | Muscular | `upper_limb` | `right` | Músculo abdutor longo do polegar | *Musculus abductor pollicis longus* | `FMA38516` | `muscle.abductor_pollicis_longus.right` | `pending_review` |
| 388 | `muscle.adductor_pollicis.left` | Muscular | `upper_limb` | `left` | Músculo adutor do polegar | *Musculus adductor pollicis* | `FMA46122`, `FMA46124` | `muscle.adductor_pollicis.left.oblique_head`, `muscle.adductor_pollicis.left.transverse_head` | `pending_review` |
| 389 | `muscle.adductor_pollicis.right` | Muscular | `upper_limb` | `right` | Músculo adutor do polegar | *Musculus adductor pollicis* | `FMA46121`, `FMA46123` | `muscle.adductor_pollicis.right.oblique_head`, `muscle.adductor_pollicis.right.transverse_head` | `pending_review` |
| 390 | `muscle.anconeus.left` | Muscular | `upper_limb` | `left` | Músculo ancôneo | *Musculus anconeus* | `FMA37706` | `muscle.anconeus.left` | `pending_review` |
| 391 | `muscle.anconeus.right` | Muscular | `upper_limb` | `right` | Músculo ancôneo | *Musculus anconeus* | `FMA37705` | `muscle.anconeus.right` | `pending_review` |
| 392 | `muscle.coracobrachialis.left` | Muscular | `upper_limb` | `left` | Músculo coracobraquial | *Musculus coracobrachialis* | `FMA37666` | `muscle.coracobrachialis.left` | `pending_review` |
| 393 | `muscle.coracobrachialis.right` | Muscular | `upper_limb` | `right` | Músculo coracobraquial | *Musculus coracobrachialis* | `FMA37665` | `muscle.coracobrachialis.right` | `pending_review` |
| 394 | `muscle.extensor_carpi_radialis_brevis.left` | Muscular | `upper_limb` | `left` | Músculo extensor radial curto do carpo | *Musculus extensor carpi radialis brevis* | `FMA38499` | `muscle.extensor_carpi_radialis_brevis.left` | `pending_review` |
| 395 | `muscle.extensor_carpi_radialis_brevis.right` | Muscular | `upper_limb` | `right` | Músculo extensor radial curto do carpo | *Musculus extensor carpi radialis brevis* | `FMA38498` | `muscle.extensor_carpi_radialis_brevis.right` | `pending_review` |
| 396 | `muscle.extensor_carpi_radialis_longus.left` | Muscular | `upper_limb` | `left` | Músculo extensor radial longo do carpo | *Musculus extensor carpi radialis longus* | `FMA38496` | `muscle.extensor_carpi_radialis_longus.left` | `pending_review` |
| 397 | `muscle.extensor_carpi_radialis_longus.right` | Muscular | `upper_limb` | `right` | Músculo extensor radial longo do carpo | *Musculus extensor carpi radialis longus* | `FMA38495` | `muscle.extensor_carpi_radialis_longus.right` | `pending_review` |
| 398 | `muscle.extensor_carpi_ulnaris.left` | Muscular | `upper_limb` | `left` | Músculo extensor ulnar do carpo | *Musculus extensor carpi ulnaris* | `FMA38508`, `FMA77260`, `FMA77261` | `muscle.extensor_carpi_ulnaris.left.humeral_head`, `muscle.extensor_carpi_ulnaris.left.ulnar_head` | `pending_review` |
| 399 | `muscle.extensor_carpi_ulnaris.right` | Muscular | `upper_limb` | `right` | Músculo extensor ulnar do carpo | *Musculus extensor carpi ulnaris* | `FMA38507`, `FMA77260`, `FMA77261` | `muscle.extensor_carpi_ulnaris.right.humeral_head`, `muscle.extensor_carpi_ulnaris.right.ulnar_head` | `pending_review` |
| 400 | `muscle.extensor_digiti_minimi.left` | Muscular | `upper_limb` | `left` | Músculo extensor do dedo mínimo | *Musculus extensor digiti minimi* | `FMA38505` | `muscle.extensor_digiti_minimi.left` | `pending_review` |
| 401 | `muscle.extensor_digiti_minimi.right` | Muscular | `upper_limb` | `right` | Músculo extensor do dedo mínimo | *Musculus extensor digiti minimi* | `FMA38504` | `muscle.extensor_digiti_minimi.right` | `pending_review` |
| 402 | `muscle.extensor_digitorum.left` | Muscular | `upper_limb` | `left` | Músculo extensor dos dedos | *Musculus extensor digitorum* | `FMA38502` | `muscle.extensor_digitorum.left` | `pending_review` |
| 403 | `muscle.extensor_digitorum.right` | Muscular | `upper_limb` | `right` | Músculo extensor dos dedos | *Musculus extensor digitorum* | `FMA38501` | `muscle.extensor_digitorum.right` | `pending_review` |
| 404 | `muscle.extensor_indicis.left` | Muscular | `upper_limb` | `left` | Músculo extensor do indicador | *Musculus extensor indicis* | `FMA38526` | `muscle.extensor_indicis.left` | `pending_review` |
| 405 | `muscle.extensor_indicis.right` | Muscular | `upper_limb` | `right` | Músculo extensor do indicador | *Musculus extensor indicis* | `FMA38525` | `muscle.extensor_indicis.right` | `pending_review` |
| 406 | `muscle.extensor_pollicis_brevis.left` | Muscular | `upper_limb` | `left` | Músculo extensor curto do polegar | *Musculus extensor pollicis brevis* | `FMA38520` | `muscle.extensor_pollicis_brevis.left` | `pending_review` |
| 407 | `muscle.extensor_pollicis_brevis.right` | Muscular | `upper_limb` | `right` | Músculo extensor curto do polegar | *Musculus extensor pollicis brevis* | `FMA38519` | `muscle.extensor_pollicis_brevis.right` | `pending_review` |
| 408 | `muscle.extensor_pollicis_longus.left` | Muscular | `upper_limb` | `left` | Músculo extensor longo do polegar | *Musculus extensor pollicis longus* | `FMA38523` | `muscle.extensor_pollicis_longus.left` | `pending_review` |
| 409 | `muscle.extensor_pollicis_longus.right` | Muscular | `upper_limb` | `right` | Músculo extensor longo do polegar | *Musculus extensor pollicis longus* | `FMA38522` | `muscle.extensor_pollicis_longus.right` | `pending_review` |
| 410 | `muscle.flexor_carpi_radialis.left` | Muscular | `upper_limb` | `left` | Músculo flexor radial do carpo | *Musculus flexor carpi radialis* | `FMA38461` | `muscle.flexor_carpi_radialis.left` | `pending_review` |
| 411 | `muscle.flexor_carpi_radialis.right` | Muscular | `upper_limb` | `right` | Músculo flexor radial do carpo | *Musculus flexor carpi radialis* | `FMA38460` | `muscle.flexor_carpi_radialis.right` | `pending_review` |
| 412 | `muscle.flexor_carpi_ulnaris.left` | Muscular | `upper_limb` | `left` | Músculo flexor ulnar do carpo | *Musculus flexor carpi ulnaris* | `FMA38618`, `FMA38620` | `muscle.flexor_carpi_ulnaris.left.humeral_head`, `muscle.flexor_carpi_ulnaris.left.ulnar_head` | `pending_review` |
| 413 | `muscle.flexor_carpi_ulnaris.right` | Muscular | `upper_limb` | `right` | Músculo flexor ulnar do carpo | *Musculus flexor carpi ulnaris* | `FMA38617`, `FMA38619` | `muscle.flexor_carpi_ulnaris.right.humeral_head`, `muscle.flexor_carpi_ulnaris.right.ulnar_head` | `pending_review` |
| 414 | `muscle.flexor_digiti_minimi_brevis_manus.left` | Muscular | `upper_limb` | `left` | Músculo flexor curto do dedo mínimo da mão | *Musculus flexor digiti minimi brevis manus* | `FMA37399` | `muscle.flexor_digiti_minimi_brevis_manus.left` | `pending_review` |
| 415 | `muscle.flexor_digiti_minimi_brevis_manus.right` | Muscular | `upper_limb` | `right` | Músculo flexor curto do dedo mínimo da mão | *Musculus flexor digiti minimi brevis manus* | `FMA37398` | `muscle.flexor_digiti_minimi_brevis_manus.right` | `pending_review` |
| 416 | `muscle.flexor_digitorum_profundus.left` | Muscular | `upper_limb` | `left` | Músculo flexor profundo dos dedos | *Musculus flexor digitorum profundus* | `FMA38480` | `muscle.flexor_digitorum_profundus.left` | `pending_review` |
| 417 | `muscle.flexor_digitorum_profundus.right` | Muscular | `upper_limb` | `right` | Músculo flexor profundo dos dedos | *Musculus flexor digitorum profundus* | `FMA38479` | `muscle.flexor_digitorum_profundus.right` | `pending_review` |
| 418 | `muscle.flexor_digitorum_superficialis.left` | Muscular | `upper_limb` | `left` | Músculo flexor superficial dos dedos | *Musculus flexor digitorum superficialis* | `FMA38639`, `FMA38641` | `muscle.flexor_digitorum_superficialis.left.humeroulnar_head`, `muscle.flexor_digitorum_superficialis.left.radial_head` | `pending_review` |
| 419 | `muscle.flexor_digitorum_superficialis.right` | Muscular | `upper_limb` | `right` | Músculo flexor superficial dos dedos | *Musculus flexor digitorum superficialis* | `FMA38638`, `FMA38640` | `muscle.flexor_digitorum_superficialis.right.humeroulnar_head`, `muscle.flexor_digitorum_superficialis.right.radial_head` | `pending_review` |
| 420 | `muscle.flexor_pollicis_brevis.left` | Muscular | `upper_limb` | `left` | Músculo flexor curto do polegar | *Musculus flexor pollicis brevis* | `FMA46111`, `FMA65199` | `muscle.flexor_pollicis_brevis.left.deep_head`, `muscle.flexor_pollicis_brevis.left.superficial_head` | `pending_review` |
| 421 | `muscle.flexor_pollicis_brevis.right` | Muscular | `upper_limb` | `right` | Músculo flexor curto do polegar | *Musculus flexor pollicis brevis* | `FMA46110`, `FMA65198` | `muscle.flexor_pollicis_brevis.right.deep_head`, `muscle.flexor_pollicis_brevis.right.superficial_head` | `pending_review` |
| 422 | `muscle.flexor_pollicis_longus.left` | Muscular | `upper_limb` | `left` | Músculo flexor longo do polegar | *Musculus flexor pollicis longus* | `FMA38484` | `muscle.flexor_pollicis_longus.left` | `pending_review` |
| 423 | `muscle.flexor_pollicis_longus.right` | Muscular | `upper_limb` | `right` | Músculo flexor longo do polegar | *Musculus flexor pollicis longus* | `FMA38482` | `muscle.flexor_pollicis_longus.right` | `pending_review` |
| 424 | `muscle.infraspinatus.left` | Muscular | `upper_limb` | `left` | Músculo infraespinal | *Musculus infraspinatus* | `FMA32548` | `muscle.infraspinatus.left` | `pending_review` |
| 425 | `muscle.infraspinatus.right` | Muscular | `upper_limb` | `right` | Músculo infraespinal | *Musculus infraspinatus* | `FMA32547` | `muscle.infraspinatus.right` | `pending_review` |
| 426 | `muscle.interossei_dorsales_manus.left` | Muscular | `upper_limb` | `left` | Músculos interósseos dorsais da mão | *Musculi interossei dorsales manus* | `FMA42405` | `muscle.interossei_dorsales_manus.left` | `pending_review` |
| 427 | `muscle.interossei_dorsales_manus.right` | Muscular | `upper_limb` | `right` | Músculos interósseos dorsais da mão | *Musculi interossei dorsales manus* | `FMA42404` | `muscle.interossei_dorsales_manus.right` | `pending_review` |
| 428 | `muscle.interossei_palmares.left` | Muscular | `upper_limb` | `left` | Músculos interósseos palmares | *Musculi interossei palmares* | `FMA42403` | `muscle.interossei_palmares.left` | `pending_review` |
| 429 | `muscle.interossei_palmares.right` | Muscular | `upper_limb` | `right` | Músculos interósseos palmares | *Musculi interossei palmares* | `FMA42402` | `muscle.interossei_palmares.right` | `pending_review` |
| 430 | `muscle.lumbricales_manus.left` | Muscular | `upper_limb` | `left` | Músculos lumbricais da mão | *Musculi lumbricales manus* | `FMA42399` | `muscle.lumbricales_manus.left` | `pending_review` |
| 431 | `muscle.lumbricales_manus.right` | Muscular | `upper_limb` | `right` | Músculos lumbricais da mão | *Musculi lumbricales manus* | `FMA42398` | `muscle.lumbricales_manus.right` | `pending_review` |
| 432 | `muscle.opponens_digiti_minimi_manus.left` | Muscular | `upper_limb` | `left` | Músculo oponente do dedo mínimo da mão | *Musculus opponens digiti minimi manus* | `FMA37401` | `muscle.opponens_digiti_minimi_manus.left` | `pending_review` |
| 433 | `muscle.opponens_digiti_minimi_manus.right` | Muscular | `upper_limb` | `right` | Músculo oponente do dedo mínimo da mão | *Musculus opponens digiti minimi manus* | `FMA37400` | `muscle.opponens_digiti_minimi_manus.right` | `pending_review` |
| 434 | `muscle.opponens_pollicis.left` | Muscular | `upper_limb` | `left` | Músculo oponente do polegar | *Musculus opponens pollicis* | `FMA37391` | `muscle.opponens_pollicis.left` | `pending_review` |
| 435 | `muscle.opponens_pollicis.right` | Muscular | `upper_limb` | `right` | Músculo oponente do polegar | *Musculus opponens pollicis* | `FMA37390` | `muscle.opponens_pollicis.right` | `pending_review` |
| 436 | `muscle.palmaris_longus.left` | Muscular | `upper_limb` | `left` | Músculo palmar longo | *Musculus palmaris longus* | `FMA38464` | `muscle.palmaris_longus.left` | `pending_review` |
| 437 | `muscle.palmaris_longus.right` | Muscular | `upper_limb` | `right` | Músculo palmar longo | *Musculus palmaris longus* | `FMA38463` | `muscle.palmaris_longus.right` | `pending_review` |
| 438 | `muscle.pectoralis_minor.left` | Muscular | `upper_limb` | `left` | Músculo peitoral menor | *Musculus pectoralis minor* | `FMA13376` | `muscle.pectoralis_minor.left` | `pending_review` |
| 439 | `muscle.pectoralis_minor.right` | Muscular | `upper_limb` | `right` | Músculo peitoral menor | *Musculus pectoralis minor* | `FMA13375` | `muscle.pectoralis_minor.right` | `pending_review` |
| 440 | `muscle.pronator_quadratus.left` | Muscular | `upper_limb` | `left` | Músculo pronador quadrado | *Musculus pronator quadratus* | `FMA38455` | `muscle.pronator_quadratus.left` | `pending_review` |
| 441 | `muscle.pronator_quadratus.right` | Muscular | `upper_limb` | `right` | Músculo pronador quadrado | *Musculus pronator quadratus* | `FMA38454` | `muscle.pronator_quadratus.right` | `pending_review` |
| 442 | `muscle.pronator_teres.left` | Muscular | `upper_limb` | `left` | Músculo pronador redondo | *Musculus pronator teres* | `FMA38561`, `FMA38563` | `muscle.pronator_teres.left.humeral_head`, `muscle.pronator_teres.left.ulnar_head` | `pending_review` |
| 443 | `muscle.pronator_teres.right` | Muscular | `upper_limb` | `right` | Músculo pronador redondo | *Musculus pronator teres* | `FMA38560`, `FMA38562` | `muscle.pronator_teres.right.humeral_head`, `muscle.pronator_teres.right.ulnar_head` | `pending_review` |
| 444 | `muscle.serratus_anterior.left` | Muscular | `upper_limb` | `left` | Músculo serrátil anterior | *Musculus serratus anterior* | `FMA13399` | `muscle.serratus_anterior.left` | `pending_review` |
| 445 | `muscle.serratus_anterior.right` | Muscular | `upper_limb` | `right` | Músculo serrátil anterior | *Musculus serratus anterior* | `FMA13398` | `muscle.serratus_anterior.right` | `pending_review` |
| 446 | `muscle.subclavius.left` | Muscular | `upper_limb` | `left` | Músculo subclávio | *Musculus subclavius* | `FMA13411` | `muscle.subclavius.left` | `pending_review` |
| 447 | `muscle.subclavius.right` | Muscular | `upper_limb` | `right` | Músculo subclávio | *Musculus subclavius* | `FMA13412` | `muscle.subclavius.right` | `pending_review` |
| 448 | `muscle.subscapularis.left` | Muscular | `upper_limb` | `left` | Músculo subescapular | *Musculus subscapularis* | `FMA13415` | `muscle.subscapularis.left` | `pending_review` |
| 449 | `muscle.subscapularis.right` | Muscular | `upper_limb` | `right` | Músculo subescapular | *Musculus subscapularis* | `FMA13414` | `muscle.subscapularis.right` | `pending_review` |
| 450 | `muscle.supinator.left` | Muscular | `upper_limb` | `left` | Músculo supinador | *Musculus supinator* | `FMA38514` | `muscle.supinator.left` | `pending_review` |
| 451 | `muscle.supinator.right` | Muscular | `upper_limb` | `right` | Músculo supinador | *Musculus supinator* | `FMA38513` | `muscle.supinator.right` | `pending_review` |
| 452 | `muscle.supraspinatus.left` | Muscular | `upper_limb` | `left` | Músculo supraespinal | *Musculus supraspinatus* | `FMA32545` | `muscle.supraspinatus.left` | `pending_review` |
| 453 | `muscle.supraspinatus.right` | Muscular | `upper_limb` | `right` | Músculo supraespinal | *Musculus supraspinatus* | `FMA32544` | `muscle.supraspinatus.right` | `pending_review` |
| 454 | `muscle.teres_major.left` | Muscular | `upper_limb` | `left` | Músculo redondo maior | *Musculus teres major* | `FMA32552` | `muscle.teres_major.left` | `pending_review` |
| 455 | `muscle.teres_major.right` | Muscular | `upper_limb` | `right` | Músculo redondo maior | *Musculus teres major* | `FMA32551` | `muscle.teres_major.right` | `pending_review` |
| 456 | `muscle.teres_minor.left` | Muscular | `upper_limb` | `left` | Músculo redondo menor | *Musculus teres minor* | `FMA32554` | `muscle.teres_minor.left` | `pending_review` |
| 457 | `muscle.teres_minor.right` | Muscular | `upper_limb` | `right` | Músculo redondo menor | *Musculus teres minor* | `FMA32553` | `muscle.teres_minor.right` | `pending_review` |
| 458 | `muscle.abductor_digiti_minimi_pedis.left` | Muscular | `lower_limb` | `left` | Músculo abdutor do dedo mínimo do pé | *Musculus abductor digiti minimi pedis* | `FMA37464` | `muscle.abductor_digiti_minimi_pedis.left` | `pending_review` |
| 459 | `muscle.abductor_digiti_minimi_pedis.right` | Muscular | `lower_limb` | `right` | Músculo abdutor do dedo mínimo do pé | *Musculus abductor digiti minimi pedis* | `FMA37463` | `muscle.abductor_digiti_minimi_pedis.right` | `pending_review` |
| 460 | `muscle.abductor_hallucis.left` | Muscular | `lower_limb` | `left` | Músculo abdutor do hálux | *Musculus abductor hallucis* | `FMA37460` | `muscle.abductor_hallucis.left` | `pending_review` |
| 461 | `muscle.abductor_hallucis.right` | Muscular | `lower_limb` | `right` | Músculo abdutor do hálux | *Musculus abductor hallucis* | `FMA37459` | `muscle.abductor_hallucis.right` | `pending_review` |
| 462 | `muscle.adductor_brevis.left` | Muscular | `lower_limb` | `left` | Músculo adutor curto | *Musculus adductor brevis* | `FMA22454` | `muscle.adductor_brevis.left` | `pending_review` |
| 463 | `muscle.adductor_brevis.right` | Muscular | `lower_limb` | `right` | Músculo adutor curto | *Musculus adductor brevis* | `FMA22452` | `muscle.adductor_brevis.right` | `pending_review` |
| 464 | `muscle.adductor_hallucis.left` | Muscular | `lower_limb` | `left` | Músculo adutor do hálux | *Musculus adductor hallucis* | `FMA46019`, `FMA46021` | `muscle.adductor_hallucis.left.oblique_head`, `muscle.adductor_hallucis.left.transverse_head` | `pending_review` |
| 465 | `muscle.adductor_hallucis.right` | Muscular | `lower_limb` | `right` | Músculo adutor do hálux | *Musculus adductor hallucis* | `FMA46018`, `FMA46020` | `muscle.adductor_hallucis.right.oblique_head`, `muscle.adductor_hallucis.right.transverse_head` | `pending_review` |
| 466 | `muscle.adductor_longus.left` | Muscular | `lower_limb` | `left` | Músculo adutor longo | *Musculus adductor longus* | `FMA22457` | `muscle.adductor_longus.left` | `pending_review` |
| 467 | `muscle.adductor_longus.right` | Muscular | `lower_limb` | `right` | Músculo adutor longo | *Musculus adductor longus* | `FMA22456` | `muscle.adductor_longus.right` | `pending_review` |
| 468 | `muscle.adductor_magnus.left` | Muscular | `lower_limb` | `left` | Músculo adutor magno | *Musculus adductor magnus* | `FMA22460` | `muscle.adductor_magnus.left` | `pending_review` |
| 469 | `muscle.adductor_magnus.right` | Muscular | `lower_limb` | `right` | Músculo adutor magno | *Musculus adductor magnus* | `FMA22459` | `muscle.adductor_magnus.right` | `pending_review` |
| 470 | `muscle.adductor_minimus.left` | Muscular | `lower_limb` | `left` | Músculo adutor mínimo | *Musculus adductor minimus* | `FMA43887` | `muscle.adductor_minimus.left` | `pending_review` |
| 471 | `muscle.adductor_minimus.right` | Muscular | `lower_limb` | `right` | Músculo adutor mínimo | *Musculus adductor minimus* | `FMA43886` | `muscle.adductor_minimus.right` | `pending_review` |
| 472 | `muscle.biceps_femoris.left` | Muscular | `lower_limb` | `left` | Músculo bíceps femoral | *Musculus biceps femoris* | `FMA45889`, `FMA45892` | `muscle.biceps_femoris.left.long_head`, `muscle.biceps_femoris.left.short_head` | `pending_review` |
| 473 | `muscle.biceps_femoris.right` | Muscular | `lower_limb` | `right` | Músculo bíceps femoral | *Musculus biceps femoris* | `FMA45888`, `FMA45891` | `muscle.biceps_femoris.right.long_head`, `muscle.biceps_femoris.right.short_head` | `pending_review` |
| 474 | `muscle.extensor_digitorum_brevis.left` | Muscular | `lower_limb` | `left` | Músculo extensor curto dos dedos | *Musculus extensor digitorum brevis* | `FMA51143` | `muscle.extensor_digitorum_brevis.left` | `pending_review` |
| 475 | `muscle.extensor_digitorum_brevis.right` | Muscular | `lower_limb` | `right` | Músculo extensor curto dos dedos | *Musculus extensor digitorum brevis* | `FMA51142` | `muscle.extensor_digitorum_brevis.right` | `pending_review` |
| 476 | `muscle.extensor_digitorum_longus.left` | Muscular | `lower_limb` | `left` | Músculo extensor longo dos dedos | *Musculus extensor digitorum longus* | `FMA22549` | `muscle.extensor_digitorum_longus.left` | `pending_review` |
| 477 | `muscle.extensor_digitorum_longus.right` | Muscular | `lower_limb` | `right` | Músculo extensor longo dos dedos | *Musculus extensor digitorum longus* | `FMA22548` | `muscle.extensor_digitorum_longus.right` | `pending_review` |
| 478 | `muscle.extensor_hallucis_brevis.left` | Muscular | `lower_limb` | `left` | Músculo extensor curto do hálux | *Musculus extensor hallucis brevis* | `FMA51145` | `muscle.extensor_hallucis_brevis.left` | `pending_review` |
| 479 | `muscle.extensor_hallucis_brevis.right` | Muscular | `lower_limb` | `right` | Músculo extensor curto do hálux | *Musculus extensor hallucis brevis* | `FMA51144` | `muscle.extensor_hallucis_brevis.right` | `pending_review` |
| 480 | `muscle.extensor_hallucis_longus.left` | Muscular | `lower_limb` | `left` | Músculo extensor longo do hálux | *Musculus extensor hallucis longus* | `FMA22547` | `muscle.extensor_hallucis_longus.left` | `pending_review` |
| 481 | `muscle.extensor_hallucis_longus.right` | Muscular | `lower_limb` | `right` | Músculo extensor longo do hálux | *Musculus extensor hallucis longus* | `FMA22546` | `muscle.extensor_hallucis_longus.right` | `pending_review` |
| 482 | `muscle.fibularis_brevis.left` | Muscular | `lower_limb` | `left` | Músculo fibular curto | *Musculus fibularis brevis* | `FMA22555` | `muscle.fibularis_brevis.left` | `pending_review` |
| 483 | `muscle.fibularis_brevis.right` | Muscular | `lower_limb` | `right` | Músculo fibular curto | *Musculus fibularis brevis* | `FMA22554` | `muscle.fibularis_brevis.right` | `pending_review` |
| 484 | `muscle.fibularis_longus.left` | Muscular | `lower_limb` | `left` | Músculo fibular longo | *Musculus fibularis longus* | `FMA22553` | `muscle.fibularis_longus.left` | `pending_review` |
| 485 | `muscle.fibularis_longus.right` | Muscular | `lower_limb` | `right` | Músculo fibular longo | *Musculus fibularis longus* | `FMA22552` | `muscle.fibularis_longus.right` | `pending_review` |
| 486 | `muscle.fibularis_tertius.left` | Muscular | `lower_limb` | `left` | Músculo fibular terceiro | *Musculus fibularis tertius* | `FMA22551` | `muscle.fibularis_tertius.left` | `pending_review` |
| 487 | `muscle.fibularis_tertius.right` | Muscular | `lower_limb` | `right` | Músculo fibular terceiro | *Musculus fibularis tertius* | `FMA22550` | `muscle.fibularis_tertius.right` | `pending_review` |
| 488 | `muscle.flexor_digiti_minimi_brevis_pedis.left` | Muscular | `lower_limb` | `left` | Músculo flexor curto do dedo mínimo do pé | *Musculus flexor digiti minimi brevis pedis* | `FMA37472` | `muscle.flexor_digiti_minimi_brevis_pedis.left` | `pending_review` |
| 489 | `muscle.flexor_digiti_minimi_brevis_pedis.right` | Muscular | `lower_limb` | `right` | Músculo flexor curto do dedo mínimo do pé | *Musculus flexor digiti minimi brevis pedis* | `FMA37471` | `muscle.flexor_digiti_minimi_brevis_pedis.right` | `pending_review` |
| 490 | `muscle.flexor_digitorum_brevis.left` | Muscular | `lower_limb` | `left` | Músculo flexor curto dos dedos | *Musculus flexor digitorum brevis* | `FMA37462` | `muscle.flexor_digitorum_brevis.left` | `pending_review` |
| 491 | `muscle.flexor_digitorum_brevis.right` | Muscular | `lower_limb` | `right` | Músculo flexor curto dos dedos | *Musculus flexor digitorum brevis* | `FMA37461` | `muscle.flexor_digitorum_brevis.right` | `pending_review` |
| 492 | `muscle.flexor_digitorum_longus.left` | Muscular | `lower_limb` | `left` | Músculo flexor longo dos dedos | *Musculus flexor digitorum longus* | `FMA65017` | `muscle.flexor_digitorum_longus.left` | `pending_review` |
| 493 | `muscle.flexor_digitorum_longus.right` | Muscular | `lower_limb` | `right` | Músculo flexor longo dos dedos | *Musculus flexor digitorum longus* | `FMA65016` | `muscle.flexor_digitorum_longus.right` | `pending_review` |
| 494 | `muscle.flexor_hallucis_brevis.left` | Muscular | `lower_limb` | `left` | Músculo flexor curto do hálux | *Musculus flexor hallucis brevis* | `FMA45972`, `FMA45974` | `muscle.flexor_hallucis_brevis.left.medial_head`, `muscle.flexor_hallucis_brevis.left.lateral_head` | `pending_review` |
| 495 | `muscle.flexor_hallucis_brevis.right` | Muscular | `lower_limb` | `right` | Músculo flexor curto do hálux | *Musculus flexor hallucis brevis* | `FMA45971`, `FMA45973` | `muscle.flexor_hallucis_brevis.right.medial_head`, `muscle.flexor_hallucis_brevis.right.lateral_head` | `pending_review` |
| 496 | `muscle.flexor_hallucis_longus.left` | Muscular | `lower_limb` | `left` | Músculo flexor longo do hálux | *Musculus flexor hallucis longus* | `FMA65015` | `muscle.flexor_hallucis_longus.left` | `pending_review` |
| 497 | `muscle.flexor_hallucis_longus.right` | Muscular | `lower_limb` | `right` | Músculo flexor longo do hálux | *Musculus flexor hallucis longus* | `FMA65014` | `muscle.flexor_hallucis_longus.right` | `pending_review` |
| 498 | `muscle.gastrocnemius.left` | Muscular | `lower_limb` | `left` | Músculo gastrocnêmio | *Musculus gastrocnemius* | `FMA45958`, `FMA45961` | `muscle.gastrocnemius.left.medial_head`, `muscle.gastrocnemius.left.lateral_head` | `pending_review` |
| 499 | `muscle.gastrocnemius.right` | Muscular | `lower_limb` | `right` | Músculo gastrocnêmio | *Musculus gastrocnemius* | `FMA45957`, `FMA45960` | `muscle.gastrocnemius.right.medial_head`, `muscle.gastrocnemius.right.lateral_head` | `pending_review` |
| 500 | `muscle.gemellus_inferior.left` | Muscular | `lower_limb` | `left` | Músculo gêmeo inferior | *Musculus gemellus inferior* | `FMA22337` | `muscle.gemellus_inferior.left` | `pending_review` |
| 501 | `muscle.gemellus_inferior.right` | Muscular | `lower_limb` | `right` | Músculo gêmeo inferior | *Musculus gemellus inferior* | `FMA22336` | `muscle.gemellus_inferior.right` | `pending_review` |
| 502 | `muscle.gemellus_superior.left` | Muscular | `lower_limb` | `left` | Músculo gêmeo superior | *Musculus gemellus superior* | `FMA22335` | `muscle.gemellus_superior.left` | `pending_review` |
| 503 | `muscle.gemellus_superior.right` | Muscular | `lower_limb` | `right` | Músculo gêmeo superior | *Musculus gemellus superior* | `FMA22334` | `muscle.gemellus_superior.right` | `pending_review` |
| 504 | `muscle.gluteus_maximus.left` | Muscular | `lower_limb` | `left` | Músculo glúteo máximo | *Musculus gluteus maximus* | `FMA22329` | `muscle.gluteus_maximus.left` | `pending_review` |
| 505 | `muscle.gluteus_maximus.right` | Muscular | `lower_limb` | `right` | Músculo glúteo máximo | *Musculus gluteus maximus* | `FMA22328` | `muscle.gluteus_maximus.right` | `pending_review` |
| 506 | `muscle.gluteus_medius.left` | Muscular | `lower_limb` | `left` | Músculo glúteo médio | *Musculus gluteus medius* | `FMA22331` | `muscle.gluteus_medius.left` | `pending_review` |
| 507 | `muscle.gluteus_medius.right` | Muscular | `lower_limb` | `right` | Músculo glúteo médio | *Musculus gluteus medius* | `FMA22330` | `muscle.gluteus_medius.right` | `pending_review` |
| 508 | `muscle.gluteus_minimus.left` | Muscular | `lower_limb` | `left` | Músculo glúteo mínimo | *Musculus gluteus minimus* | `FMA22333` | `muscle.gluteus_minimus.left` | `pending_review` |
| 509 | `muscle.gluteus_minimus.right` | Muscular | `lower_limb` | `right` | Músculo glúteo mínimo | *Musculus gluteus minimus* | `FMA22332` | `muscle.gluteus_minimus.right` | `pending_review` |
| 510 | `muscle.gracilis.left` | Muscular | `lower_limb` | `left` | Músculo grácil | *Musculus gracilis* | `FMA43884` | `muscle.gracilis.left` | `pending_review` |
| 511 | `muscle.gracilis.right` | Muscular | `lower_limb` | `right` | Músculo grácil | *Musculus gracilis* | `FMA43883` | `muscle.gracilis.right` | `pending_review` |
| 512 | `muscle.iliacus.left` | Muscular | `lower_limb` | `left` | Músculo ilíaco | *Musculus iliacus* | `FMA22323` | `muscle.iliacus.left` | `pending_review` |
| 513 | `muscle.iliacus.right` | Muscular | `lower_limb` | `right` | Músculo ilíaco | *Musculus iliacus* | `FMA22322` | `muscle.iliacus.right` | `pending_review` |
| 514 | `muscle.interossei_dorsales_pedis.left` | Muscular | `lower_limb` | `left` | Músculos interósseos dorsais do pé | *Musculi interossei dorsales pedis* | `FMA74141` | `muscle.interossei_dorsales_pedis.left` | `pending_review` |
| 515 | `muscle.interossei_dorsales_pedis.right` | Muscular | `lower_limb` | `right` | Músculos interósseos dorsais do pé | *Musculi interossei dorsales pedis* | `FMA74140` | `muscle.interossei_dorsales_pedis.right` | `pending_review` |
| 516 | `muscle.interosseus_plantaris.left.1` | Muscular | `lower_limb` | `left` | 1º músculo interósseo plantar | *Musculus interosseus plantaris I* | `FMA37746` | `muscle.interosseus_plantaris.left.1` | `pending_review` |
| 517 | `muscle.interosseus_plantaris.left.2` | Muscular | `lower_limb` | `left` | 2º músculo interósseo plantar | *Musculus interosseus plantaris II* | `FMA37744` | `muscle.interosseus_plantaris.left.2` | `pending_review` |
| 518 | `muscle.interosseus_plantaris.left.3` | Muscular | `lower_limb` | `left` | 3º músculo interósseo plantar | *Musculus interosseus plantaris III* | `FMA37742` | `muscle.interosseus_plantaris.left.3` | `pending_review` |
| 519 | `muscle.interosseus_plantaris.right.1` | Muscular | `lower_limb` | `right` | 1º músculo interósseo plantar | *Musculus interosseus plantaris I* | `FMA37745` | `muscle.interosseus_plantaris.right.1` | `pending_review` |
| 520 | `muscle.interosseus_plantaris.right.2` | Muscular | `lower_limb` | `right` | 2º músculo interósseo plantar | *Musculus interosseus plantaris II* | `FMA37743` | `muscle.interosseus_plantaris.right.2` | `pending_review` |
| 521 | `muscle.interosseus_plantaris.right.3` | Muscular | `lower_limb` | `right` | 3º músculo interósseo plantar | *Musculus interosseus plantaris III* | `FMA37741` | `muscle.interosseus_plantaris.right.3` | `pending_review` |
| 522 | `muscle.lumbricalis_pedis.left.1` | Muscular | `lower_limb` | `left` | 1º músculo lumbrical do pé | *Musculus lumbricalis I pedis* | `FMA37718` | `muscle.lumbricalis_pedis.left.1` | `pending_review` |
| 523 | `muscle.lumbricalis_pedis.left.2` | Muscular | `lower_limb` | `left` | 2º músculo lumbrical do pé | *Musculus lumbricalis II pedis* | `FMA37720` | `muscle.lumbricalis_pedis.left.2` | `pending_review` |
| 524 | `muscle.lumbricalis_pedis.left.3` | Muscular | `lower_limb` | `left` | 3º músculo lumbrical do pé | *Musculus lumbricalis III pedis* | `FMA37486` | `muscle.lumbricalis_pedis.left.3` | `pending_review` |
| 525 | `muscle.lumbricalis_pedis.left.4` | Muscular | `lower_limb` | `left` | 4º músculo lumbrical do pé | *Musculus lumbricalis IV pedis* | `FMA37484` | `muscle.lumbricalis_pedis.left.4` | `pending_review` |
| 526 | `muscle.lumbricalis_pedis.right.1` | Muscular | `lower_limb` | `right` | 1º músculo lumbrical do pé | *Musculus lumbricalis I pedis* | `FMA37717` | `muscle.lumbricalis_pedis.right.1` | `pending_review` |
| 527 | `muscle.lumbricalis_pedis.right.2` | Muscular | `lower_limb` | `right` | 2º músculo lumbrical do pé | *Musculus lumbricalis II pedis* | `FMA37719` | `muscle.lumbricalis_pedis.right.2` | `pending_review` |
| 528 | `muscle.lumbricalis_pedis.right.3` | Muscular | `lower_limb` | `right` | 3º músculo lumbrical do pé | *Musculus lumbricalis III pedis* | `FMA37485` | `muscle.lumbricalis_pedis.right.3` | `pending_review` |
| 529 | `muscle.lumbricalis_pedis.right.4` | Muscular | `lower_limb` | `right` | 4º músculo lumbrical do pé | *Musculus lumbricalis IV pedis* | `FMA37483` | `muscle.lumbricalis_pedis.right.4` | `pending_review` |
| 530 | `muscle.obturatorius_externus.left` | Muscular | `lower_limb` | `left` | Músculo obturador externo | *Musculus obturatorius externus* | `FMA22327` | `muscle.obturatorius_externus.left` | `pending_review` |
| 531 | `muscle.obturatorius_externus.right` | Muscular | `lower_limb` | `right` | Músculo obturador externo | *Musculus obturatorius externus* | `FMA22326` | `muscle.obturatorius_externus.right` | `pending_review` |
| 532 | `muscle.obturatorius_internus.left` | Muscular | `lower_limb` | `left` | Músculo obturador interno | *Musculus obturatorius internus* | `FMA22325` | `muscle.obturatorius_internus.left` | `pending_review` |
| 533 | `muscle.obturatorius_internus.right` | Muscular | `lower_limb` | `right` | Músculo obturador interno | *Musculus obturatorius internus* | `FMA22324` | `muscle.obturatorius_internus.right` | `pending_review` |
| 534 | `muscle.opponens_digiti_minimi_pedis.left` | Muscular | `lower_limb` | `left` | Músculo oponente do dedo mínimo do pé | *Musculus opponens digiti minimi pedis* | `FMA86035` | `muscle.opponens_digiti_minimi_pedis.left` | `pending_review` |
| 535 | `muscle.opponens_digiti_minimi_pedis.right` | Muscular | `lower_limb` | `right` | Músculo oponente do dedo mínimo do pé | *Musculus opponens digiti minimi pedis* | `FMA86034` | `muscle.opponens_digiti_minimi_pedis.right` | `pending_review` |
| 536 | `muscle.pectineus.left` | Muscular | `lower_limb` | `left` | Músculo pectíneo | *Musculus pectineus* | `FMA22451` | `muscle.pectineus.left` | `pending_review` |
| 537 | `muscle.pectineus.right` | Muscular | `lower_limb` | `right` | Músculo pectíneo | *Musculus pectineus* | `FMA22450` | `muscle.pectineus.right` | `pending_review` |
| 538 | `muscle.piriformis.left` | Muscular | `lower_limb` | `left` | Músculo piriforme | *Musculus piriformis* | `FMA22341` | `muscle.piriformis.left` | `pending_review` |
| 539 | `muscle.piriformis.right` | Muscular | `lower_limb` | `right` | Músculo piriforme | *Musculus piriformis* | `FMA22340` | `muscle.piriformis.right` | `pending_review` |
| 540 | `muscle.plantaris.left` | Muscular | `lower_limb` | `left` | Músculo plantar | *Musculus plantaris* | `FMA22561` | `muscle.plantaris.left` | `pending_review` |
| 541 | `muscle.plantaris.right` | Muscular | `lower_limb` | `right` | Músculo plantar | *Musculus plantaris* | `FMA22560` | `muscle.plantaris.right` | `pending_review` |
| 542 | `muscle.popliteus.left` | Muscular | `lower_limb` | `left` | Músculo poplíteo | *Musculus popliteus* | `FMA22592` | `muscle.popliteus.left` | `pending_review` |
| 543 | `muscle.popliteus.right` | Muscular | `lower_limb` | `right` | Músculo poplíteo | *Musculus popliteus* | `FMA22591` | `muscle.popliteus.right` | `pending_review` |
| 544 | `muscle.psoas_major.left` | Muscular | `lower_limb` | `left` | Músculo psoas maior | *Musculus psoas major* | `FMA22343` | `muscle.psoas_major.left` | `pending_review` |
| 545 | `muscle.psoas_major.right` | Muscular | `lower_limb` | `right` | Músculo psoas maior | *Musculus psoas major* | `FMA22342` | `muscle.psoas_major.right` | `pending_review` |
| 546 | `muscle.quadratus_femoris.left` | Muscular | `lower_limb` | `left` | Músculo quadrado femoral | *Musculus quadratus femoris* | `FMA22339` | `muscle.quadratus_femoris.left` | `pending_review` |
| 547 | `muscle.quadratus_femoris.right` | Muscular | `lower_limb` | `right` | Músculo quadrado femoral | *Musculus quadratus femoris* | `FMA22338` | `muscle.quadratus_femoris.right` | `pending_review` |
| 548 | `muscle.quadratus_plantae.left` | Muscular | `lower_limb` | `left` | Músculo quadrado plantar | *Musculus quadratus plantae* | `FMA37466` | `muscle.quadratus_plantae.left` | `pending_review` |
| 549 | `muscle.quadratus_plantae.right` | Muscular | `lower_limb` | `right` | Músculo quadrado plantar | *Musculus quadratus plantae* | `FMA37465` | `muscle.quadratus_plantae.right` | `pending_review` |
| 550 | `muscle.rectus_femoris.left` | Muscular | `lower_limb` | `left` | Músculo reto femoral | *Musculus rectus femoris* | `FMA38929` | `muscle.rectus_femoris.left` | `pending_review` |
| 551 | `muscle.rectus_femoris.right` | Muscular | `lower_limb` | `right` | Músculo reto femoral | *Musculus rectus femoris* | `FMA38928` | `muscle.rectus_femoris.right` | `pending_review` |
| 552 | `muscle.sartorius.left` | Muscular | `lower_limb` | `left` | Músculo sartório | *Musculus sartorius* | `FMA22355` | `muscle.sartorius.left` | `pending_review` |
| 553 | `muscle.sartorius.right` | Muscular | `lower_limb` | `right` | Músculo sartório | *Musculus sartorius* | `FMA22354` | `muscle.sartorius.right` | `pending_review` |
| 554 | `muscle.semimembranosus.left` | Muscular | `lower_limb` | `left` | Músculo semimembranáceo | *Musculus semimembranosus* | `FMA22449` | `muscle.semimembranosus.left` | `pending_review` |
| 555 | `muscle.semimembranosus.right` | Muscular | `lower_limb` | `right` | Músculo semimembranáceo | *Musculus semimembranosus* | `FMA22448` | `muscle.semimembranosus.right` | `pending_review` |
| 556 | `muscle.semitendinosus.left` | Muscular | `lower_limb` | `left` | Músculo semitendíneo | *Musculus semitendinosus* | `FMA22359` | `muscle.semitendinosus.left` | `pending_review` |
| 557 | `muscle.semitendinosus.right` | Muscular | `lower_limb` | `right` | Músculo semitendíneo | *Musculus semitendinosus* | `FMA22358` | `muscle.semitendinosus.right` | `pending_review` |
| 558 | `muscle.soleus.left` | Muscular | `lower_limb` | `left` | Músculo sóleo | *Musculus soleus* | `FMA22559` | `muscle.soleus.left` | `pending_review` |
| 559 | `muscle.soleus.right` | Muscular | `lower_limb` | `right` | Músculo sóleo | *Musculus soleus* | `FMA22558` | `muscle.soleus.right` | `pending_review` |
| 560 | `muscle.tendo_calcaneus.left` | Muscular | `lower_limb` | `left` | Tendão do calcâneo (tendão de Aquiles) | *Tendo calcaneus* | `FMA264844` | `muscle.tendo_calcaneus.left` | `pending_review` |
| 561 | `muscle.tendo_calcaneus.right` | Muscular | `lower_limb` | `right` | Tendão do calcâneo (tendão de Aquiles) | *Tendo calcaneus* | `FMA258847` | `muscle.tendo_calcaneus.right` | `pending_review` |
| 562 | `muscle.tensor_fasciae_latae.left` | Muscular | `lower_limb` | `left` | Músculo tensor da fáscia lata | *Musculus tensor fasciae latae* | `FMA22426` | `muscle.tensor_fasciae_latae.left` | `pending_review` |
| 563 | `muscle.tensor_fasciae_latae.right` | Muscular | `lower_limb` | `right` | Músculo tensor da fáscia lata | *Musculus tensor fasciae latae* | `FMA22425` | `muscle.tensor_fasciae_latae.right` | `pending_review` |
| 564 | `muscle.tibialis_anterior.left` | Muscular | `lower_limb` | `left` | Músculo tibial anterior | *Musculus tibialis anterior* | `FMA22545` | `muscle.tibialis_anterior.left` | `pending_review` |
| 565 | `muscle.tibialis_anterior.right` | Muscular | `lower_limb` | `right` | Músculo tibial anterior | *Musculus tibialis anterior* | `FMA22544` | `muscle.tibialis_anterior.right` | `pending_review` |
| 566 | `muscle.tibialis_posterior.left` | Muscular | `lower_limb` | `left` | Músculo tibial posterior | *Musculus tibialis posterior* | `FMA65019` | `muscle.tibialis_posterior.left` | `pending_review` |
| 567 | `muscle.tibialis_posterior.right` | Muscular | `lower_limb` | `right` | Músculo tibial posterior | *Musculus tibialis posterior* | `FMA65018` | `muscle.tibialis_posterior.right` | `pending_review` |
| 568 | `muscle.tractus_iliotibialis.left` | Muscular | `lower_limb` | `left` | Trato iliotibial | *Tractus iliotibialis* | `FMA58777` | `muscle.tractus_iliotibialis.left` | `pending_review` |
| 569 | `muscle.tractus_iliotibialis.right` | Muscular | `lower_limb` | `right` | Trato iliotibial | *Tractus iliotibialis* | `FMA58776` | `muscle.tractus_iliotibialis.right` | `pending_review` |
| 570 | `muscle.vastus_intermedius.left` | Muscular | `lower_limb` | `left` | Músculo vasto intermédio | *Musculus vastus intermedius* | `FMA38935` | `muscle.vastus_intermedius.left` | `pending_review` |
| 571 | `muscle.vastus_intermedius.right` | Muscular | `lower_limb` | `right` | Músculo vasto intermédio | *Musculus vastus intermedius* | `FMA38934` | `muscle.vastus_intermedius.right` | `pending_review` |
| 572 | `muscle.vastus_lateralis.left` | Muscular | `lower_limb` | `left` | Músculo vasto lateral | *Musculus vastus lateralis* | `FMA38931` | `muscle.vastus_lateralis.left` | `pending_review` |
| 573 | `muscle.vastus_lateralis.right` | Muscular | `lower_limb` | `right` | Músculo vasto lateral | *Musculus vastus lateralis* | `FMA38930` | `muscle.vastus_lateralis.right` | `pending_review` |
| 574 | `muscle.vastus_medialis.left` | Muscular | `lower_limb` | `left` | Músculo vasto medial | *Musculus vastus medialis* | `FMA38933` | `muscle.vastus_medialis.left` | `pending_review` |
| 575 | `muscle.vastus_medialis.right` | Muscular | `lower_limb` | `right` | Músculo vasto medial | *Musculus vastus medialis* | `FMA38932` | `muscle.vastus_medialis.right` | `pending_review` |

---

## 4. Protocolo de Revisão Científica (Seção 17.2)

Todas as **575 estruturas** da `v2` permanecem com `review.status = "pending_review"` (`reviewedBy: "unassigned"`, `reviewedAt: null`) após auditoria técnico-científica pré-renderização (`SUB-05`). A promoção para `"approved"` exige revisão interativa completa por profissional humano qualificado em anatomia humana (Fase 3):

- [ ] **Presença e completude:** as 575 estruturas e 635 malhas listadas estão presentes e identificáveis na cena 3D.
- [ ] **Lateralidade anatômica:** 100% das estruturas `right` no antímero direito (`x < 0`), `left` no antímero esquerdo (`x > 0`) e `midline` sobre o plano mediano.
- [ ] **Preservação geométrica pós-Meshopt:** acidentes ósseos delicados (etmoide, esfenoide, processo estiloide temporal, dente do áxis C2, arcos costais, forames sacrais, acetábulo, olécrano) e ventres musculares preservados sem perfuração ou fusão indevida.
- [ ] **Nomenclatura PT-BR e Latim (*TA2*):** ortografia vigente e concordância aprovadas nas 575 entradas.
- [ ] **Pontos de ancoragem (`labelAnchor`):** etiquetas das 4 regiões apontam corretamente sobre superfícies visíveis.
- [ ] **Oclusão e transparência:** leitura óssea sob opacidade muscular reduzida em crânio, tronco e membros não induz erro anatômico.

**Registro futuro de aprovação:**
- **Versão dos ativos avaliada:** `v2` (`assetVersion: "v2"`, `metadataVersion: "v2"`)
- **Credencial / papel revisor:** *A definir na Fase 3*
- **Data da revisão:** *Pendente*
