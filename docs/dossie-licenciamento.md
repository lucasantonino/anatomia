# Dossiê de Licenciamento, Proveniência e Avaliação de Ativos

Este dossiê atende às exigências das Seções 9 e 17.1 da [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md), documentando a auditoria de candidatos 3D, os termos contratuais do ativo adotado na Fase 1, o texto obrigatório de atribuição na interface e o registro de proveniência dos arquivos-fonte.

---

## 1. Ficha de Licenciamento do Ativo Adotado (Fase 1 — `v1`)

| Campo | Registro |
|---|---|
| **Ativo / Base científica** | **BodyParts3D** (Release `3.0` / `2011-09-15`) |
| **Titular original dos direitos** | **Database Center for Life Science (DBCLS)** — Research Organization of Information and Systems (ROIS), Japão |
| **Distribuição binária STL utilizada** | Repositório espelho `Kevin-Mattheus-Moerman/BodyParts3D` (branch `main`, diretório `assets/BodyParts3D_data/stl/`) |
| **Licença do conteúdo 3D** | **Creative Commons Attribution-ShareAlike 2.1 Japan (`CC BY-SA 2.1 JP`)** |
| **Termos originais (DBCLS)** | `http://lifesciencedb.jp/bp3d/info_en/license/index.html` |
| **Texto legal da licença** | `https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en` |
| **Licença do código wrapper do espelho** | MIT (aplicável aos scripts Julia do espelho; os arquivos STL e mapas de conteúdo permanecem sob `CC BY-SA 2.1 JP`) |
| **Custo de aquisição** | Gratuito (uso aberto) |
| **Território e prazo** | Mundial, perpétuo (enquanto cumpridas as condições da licença CC BY-SA 2.1 JP) |
| **Permissões concedidas** | Copiar, redistribuir em CDN/web, adaptar, converter formato (STL → glTF 2.0 `.glb`), simplificar geometria e recalcular normais |
| **Obrigações obrigatórias** | 1) Exibir crédito e link da licença; 2) Indicar modificações realizadas (conversão/otimização); 3) Distribuir quaisquer obras derivadas dos modelos 3D sob a mesma licença (`CC BY-SA 2.1 JP` ou compatível conforme permitido pelos termos) |
| **Compatibilidade com CDN e Web** | Sim. Sem restrições contratuais contra cache HTTP público, entrega via CDN ou uso educacional gratuito |

---

## 2. Texto Obrigatório de Atribuição e Aviso Educacional na Interface

A tela de **Créditos e Licenças** (`CreditsModal`) deve exibir de forma legível, acessível e verificável por testes automatizados:

### Atribuição obrigatória do ativo 3D
> **Modelos anatômicos 3D:** derivados de *BodyParts3D, Copyright © 2008 Life Science Integrated Database Center (DBCLS)*, licenciados sob **Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)**.  
> **Modificações realizadas nesta versão (`v1`):** recorte regional da cintura escapular e membro superior bilateral (36 malhas), conversão de coordenadas para glTF 2.0 (Y-up em metros), soldagem de vértices, recálculo de normais, simplificação geométrica e compressão Meshopt. Os arquivos `.glb` resultantes são disponibilizados sob termos compatíveis `CC BY-SA 2.1 JP`.

### Transparência de cobertura e finalidade educacional
> **Escopo anatômico desta versão (`v1`):** exibe exclusivamente 22 estruturas (10 ossos e 12 músculos) da cintura escapular e do membro superior bilateral, conforme a matriz de cobertura publicada. Status de revisão científica atual: *pendente de validação por revisor anatômico (`pending_review`)*.  
> **Aviso educacional:** o Anatomia 3D é uma ferramenta estritamente educacional e não constitui dispositivo médico, orientação clínica, diagnóstico ou substituto para ensino supervisionado e atlas anatômicos de referência.

---

## 3. Matriz de Avaliação de Candidatos (Seção 9 da Spec)

### 3.1 Critérios eliminatórios

| Critério eliminatório | BodyParts3D v3.0 (STL) | Z-Anatomy (Blender `.blend`) |
|---|---|---|
| Licença compatível com publicação web aberta | **Aprovado** (`CC BY-SA 2.1 JP`) | **Aprovado** (`CC BY-SA 4.0`) |
| Origem e titularidade demonstráveis | **Aprovado** (DBCLS / papers publicados / FMA) | **Aprovado** (Gauthier Kervyn & cols., derivado do BodyParts3D) |
| Permissão explícita para modificar, otimizar e redistribuir | **Aprovado** (ShareAlike) | **Aprovado** (ShareAlike) |
| Cobertura de músculos e ossos segmentados | **Aprovado** (937 STLs individuais por FMA; musculatura completa na v3.0) | **Aprovado** (sistema completo organizado por coleções `TA2`) |
| Pipeline viável para `.glb` no ambiente atual | **Aprovado** (pipeline Node puro sem Blender) | **Condicionado** (exige Blender instalado para exportação) |
| Ausência de bloqueio contratual a CDN/cache | **Aprovado** | **Aprovado** |

### 3.2 Avaliação ponderada para decisão Fase 1 vs. Fase 2

| Critério | BodyParts3D v3.0 (Escolha Fase 1) | Z-Anatomy (Candidato prioritário Fase 2) |
|---|---|---|
| **Separação de malhas** | Excelente: arquivos STL individuais mapeados por FMA; músculos multi-cabeça já separados | Excelente: objetos separados em coleções Blender já agrupados por sistema |
| **Nomenclatura** | Baseado em FMA (inglês/ID numérico), exigindo dicionário de mapeamento para `TA2`/PT-BR | Já alinhado nativamente à *Terminologia Anatomica (TA2)* |
| **Qualidade geométrica bruta** | Alta densidade bruta (até ~113k triângulos em uma única escápula), exigindo `weld` + `simplify` | Geometria retrabalhada por ilustrador médico com topologia e proporções refinadas |
| **Prontidão de automação local** | Imediata via Node.js (`@gltf-transform` + `meshoptimizer`) | Requer ambiente com Blender CLI para extração em lote |

**Conclusão:** **BodyParts3D v3.0** é a escolha ótima para **Fase 0 + Fase 1** por desbloquear imediatamente malhas reais segmentadas e cientificamente rastreáveis por FMA sem dependência de Blender. Para a **Fase 2 (Corpo Completo)**, avaliar na auditoria final se o corpo completo será expandido a partir das demais malhas do BodyParts3D ou migrado para **Z-Anatomy** via Blender, preservando o contrato `.glb` + Zod já validado.

---

## 4. Registro de Proveniência e Integridade (`v1`)

Durante a execução de `npm run build:assets` (Marco 2 de [plano-de-implementacao-e-testes.md](./plano-de-implementacao-e-testes.md)), o pipeline deverá baixar os 36 arquivos abaixo da fonte oficial e preencher os hashes **SHA-256** observados tanto nesta tabela quanto no `manifest.json`:

| Sistema | FMA ID | Arquivo-fonte (`assets/BodyParts3D_data/stl/`) | Tamanho esperado (B) | SHA-256 STL bruto (registrado no build) |
|---|---|---|---|---|
| Ósseo | `FMA13322` | `FMA13322.stl` | 255.684 | `f340050375ea4397a85082fb7bd68ea553d52f4718656599804ecf8f4c7768be` |
| Ósseo | `FMA13323` | `FMA13323.stl` | 257.084 | `ec68d362926061c62c2b7493fb6554941d78250f27ecdf744375659050bdc7ee` |
| Ósseo | `FMA13395` | `FMA13395.stl` | 5.662.884 | `c0a3afd469db1fec9527bb81ec1f0956876d3d64d3acbf3a083619d4e7ce297b` |
| Ósseo | `FMA13396` | `FMA13396.stl` | 6.090.884 | `104b7749a10794987535c539d6c412b9b9afb3fd1819bdf5911ab1852f07a425` |
| Ósseo | `FMA23130` | `FMA23130.stl` | 813.484 | `6e26ad2b9794b136000abe2cc0b54cade989b943214e2149732cc2db2e337dce` |
| Ósseo | `FMA23131` | `FMA23131.stl` | 824.684 | `a0650a72c481093ee8c3b1fe7cf8ad97b2d63875685e1acf608dec7a5e031748` |
| Ósseo | `FMA23464` | `FMA23464.stl` | 140.284 | `23eed49ade9f558406782b47decee325d12ee9e1d5ef661a051a0516a142dfa3` |
| Ósseo | `FMA23465` | `FMA23465.stl` | 135.784 | `1a09c41034b916d138696db3266bf66f159f3770f9446f45a9a198db4486ae07` |
| Ósseo | `FMA23467` | `FMA23467.stl` | 179.684 | `c6074d69a2ccbcef6db2fb8bf758b44a5f6438b035da3399d6efb41b9d759a03` |
| Ósseo | `FMA23468` | `FMA23468.stl` | 176.984 | `1284c72ce602b533b97cfb24fa73a72342cc049ebf6a6f8e709b686cdb828ed6` |
| Muscular | `FMA34680` | `FMA34680.stl` | 1.454.184 | `89f2568231a3f44d4de8119e8d3a5de8303ce18b607338be448e4de9169fcb9e` |
| Muscular | `FMA34681` | `FMA34681.stl` | 1.424.384 | `74a6b52b59635579a69047bd98c544a6f4427f270ecc5abe78b70109304342d4` |
| Muscular | `FMA34682` | `FMA34682.stl` | 1.484.184 | `1d261c2d378ca98a352dca1511bb1c2aa005a0a4309b9f9998d23d8397d80d0b` |
| Muscular | `FMA34683` | `FMA34683.stl` | 1.453.884 | `82c39b100f36dd92ea51bf00cd233486d5b2e1c7dfdd265a85b8185faa0e07ae` |
| Muscular | `FMA34684` | `FMA34684.stl` | 2.200.584 | `685c2c3b8e24b7a31e2274749b5306d96880420feb035ea4ecce5fb2d0993ac0` |
| Muscular | `FMA34685` | `FMA34685.stl` | 2.231.484 | `d87ce42e4e42b8332e1677d35d59201fbc825de745ca77f9740741ef8bd42b3a` |
| Muscular | `FMA34690` | `FMA34690.stl` | 466.584 | `1725833b2da2e72bd64322c256e81910eae9fb9490ee721fd82910ae2eaed921` |
| Muscular | `FMA34691` | `FMA34691.stl` | 460.684 | `29d0cc082b0ee0b753eafa1f259fd0e3da8de4a3a480a863abef76664a432f6a` |
| Muscular | `FMA79979` | `FMA79979.stl` | 1.800.784 | `50cec276c3919d5c8857e789852a0e7cfe2c3d789bfd52334e4dc37849079915` |
| Muscular | `FMA79980` | `FMA79980.stl` | 1.789.984 | `6a7dcc338b91d2f7201a3c19c120d0c9067874f470f3c626f2a965e11893940f` |
| Muscular | `FMA45874` | `FMA45874.stl` | 377.384 | `130109f109bac097eb5c710b7e34cb9e7ffa1ac0f88a76182fe8795ba19b2056` |
| Muscular | `FMA45875` | `FMA45875.stl` | 373.484 | `57ff119e61e7af839088d9d6581c2898384ad66a00c0c457361d316f8ff90099` |
| Muscular | `FMA37684` | `FMA37684.stl` | 1.392.084 | `254c2b9528925155b360d919be825040fd6fb46f9fcf006a9969f25d738a50b0` |
| Muscular | `FMA37685` | `FMA37685.stl` | 1.435.484 | `dcffdccfcbde15923e92aca1a56a006f911921f8fe4d66b7dd57408fdb792406` |
| Muscular | `FMA37686` | `FMA37686.stl` | 1.613.384 | `1ceb9b9892b4cfe905d108cd096a24c9ea0c20bbe182364d748852e1eaeab344` |
| Muscular | `FMA37687` | `FMA37687.stl` | 1.645.384 | `8a0d8998ec26224e8f3ef63c36190bcf6b187007bd2d4b62c60c898f0ba12c2c` |
| Muscular | `FMA37668` | `FMA37668.stl` | 1.749.484 | `2eb8019befa2c5f67e138757b0b4b52bef9bedba735e6bde1596becca8388b19` |
| Muscular | `FMA37669` | `FMA37669.stl` | 1.734.384 | `ebada57b7f34fac71abc0a17c5c91c531778997b7a698be66e9c5879c241b143` |
| Muscular | `FMA37695` | `FMA37695.stl` | 1.344.084 | `1a92c34f2891072488e55f65b9bed1560b473f36b6a4b996a2ccab6681b4c3ea` |
| Muscular | `FMA37696` | `FMA37696.stl` | 1.311.384 | `fc0ec8d87af90596edec36ddc35ddccb06787c9db53c439e10c6bd7811a7c4e2` |
| Muscular | `FMA37697` | `FMA37697.stl` | 1.815.684 | `c875ced0ecedde0637edf88b27e9a2086fd80088d9f89252664f49e981a8f855` |
| Muscular | `FMA37698` | `FMA37698.stl` | 1.798.784 | `8bda791fe4d142e9a9a0060027328bd88734e95d6be4651fe82b111446e6b43a` |
| Muscular | `FMA37699` | `FMA37699.stl` | 1.975.784 | `1ed7dd3d76fe3b6c89a6998e4cbd908ae22a545c4779a54e4cb720dc0e571a9f` |
| Muscular | `FMA37700` | `FMA37700.stl` | 1.906.484 | `8f289dc2825e02602c3b7e42b2831c582e6958b74788c28acaa7c765c8c4acd9` |
| Muscular | `FMA38486` | `FMA38486.stl` | 3.658.084 | `40398de8e866a88962d98480a3c5a4487e61f0d5ac99c5064b1fdd3f6340f1f4` |
| Muscular | `FMA38487` | `FMA38487.stl` | 3.677.984 | `c0c57bd4b20d9bf241e26d54a8d509fe64920a037e8001f6da2f226f3906ee24` |

### Hashes SHA-256 dos ativos otimizados publicados (`public/assets/v1/`)

| Arquivo | Tamanho (B) | Triângulos | Malhas | SHA-256 |
|---|---:|---:|---:|---|
| `public/assets/v1/skeletal-v1.glb` | 169.216 | 34.200 | 10 | `dbf73fa745f2ef899b12a017a4dfe5cb85faeff95009adf55096f4386e9904ef` |
| `public/assets/v1/muscular-v1.glb` | 317.728 | 59.972 | 26 | `4c32a49bf4bab67ad7ecb47ef63ac3a5322a2417953f8593a8ccdaab1586323d` |

---

## 5. Registro de Proveniência e Integridade (`v2` — MVP Corpo Completo)

Na **Fase 2**, a unidade de lançamento `v2` expande o recorte mantendo a mesma fonte **BodyParts3D v3.0 (DBCLS)** sob licença **`CC BY-SA 2.1 JP`** (`575` estruturas / `635` malhas STL brutas somando `958,23 MiB` e `20.094.438` triângulos). Os hashes **SHA-256** individuais de todos os **635 arquivos STL brutos** (incluindo os 4 arquivos com `stlId` proprietário `BP44`–`BP47` mapeados aos FMA oficiais `FMA38507`/`FMA38508`, `FMA77260` e `FMA77261`) estão registrados em [proveniencia-v2-hashes.json](./proveniencia-v2-hashes.json).

### Hashes SHA-256 dos ativos otimizados publicados (`public/assets/v2/`)

| Arquivo | Tamanho (B) | Triângulos | Malhas | SHA-256 |
|---|---:|---:|---:|---|
| `public/assets/v2/skeletal-v2.glb` | 907.880 | 123.846 | 203 | `f48984f165c765cd3905c3f74c93c970e95d3aab4bc2524f7c91aa864133e37d` |
| `public/assets/v2/muscular-v2.glb` | 1.565.372 | 186.238 | 432 | `2942d2fe7011623e6dbc207ecd66443ce6a77d1254c19c5c082fab575f54507f` |

- **Atribuição na UI (`CreditsModal`):** exibida dinamicamente a partir de `manifest.license`, `coverageMatrix.scopeStatement` e contagens do manifesto ativo (`assetVersion: v2`, `575 estruturas`, `635 malhas`, `pending_review`).
- **Licença do código-fonte:** código da aplicação e scripts sob `MIT` ([LICENSE](../LICENSE)); modelos 3D derivados `.glb` sob **`CC BY-SA 2.1 JP`**.
