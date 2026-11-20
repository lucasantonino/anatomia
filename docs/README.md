# Anatomia 3D — Documentação de Engenharia e Pré-Implementação

Este diretório reúne a documentação técnica, contratual, científica, jurídica e de interface que antecede a implementação do projeto **Anatomia 3D** (Fases 0 e 1), em estrita conformidade com a [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md).

> [!IMPORTANT]
> **Estado atual do projeto:** **Fase 0** (pipeline reproduzível + ativos reais `v1` em `public/assets/v1/`) e **Fase 1** (protótipo técnico completo em `src/core/`, `src/scene/`, `src/ui/` e suítes Vitest + Playwright em `tests/`) **implementadas e validadas (Gate 4 — 100% verde)**. As 22 estruturas da `v1` permanecem com `review.status = "pending_review"` aguardando revisão científica formal por profissional humano habilitado na Fase 3.

---

## Mapa da Documentação

| Documento | Propósito | Público-alvo | Status |
|---|---|---|---|
| [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md) | Especificação técnica definitiva v1.0 (visão, MVP, `RF-01`–`RF-09`, RNFs, critérios de aceite) | Produto, Engenharia, Ciência | Referência base |
| [adr-decisoes-arquiteturais.md](./adr-decisoes-arquiteturais.md) | Registro formal das decisões fechadas (ADR-001 a ADR-006): licenciamento, stack, motor 3D, estilização, nomenclatura e opacidade experimental | Engenharia, Arquitetura, Produto | Aceita |
| [arquitetura-tecnica.md](./arquitetura-tecnica.md) | Arquitetura da SPA cliente, árvore de diretórios, contratos TypeScript de estado, motor WebGL 2, materiais, *raycasting*, projeção de etiquetas e CSP | Engenharia Frontend / 3D | Pronta para implementação |
| [contrato-dados-e-pipeline-3d.md](./contrato-dados-e-pipeline-3d.md) | Convenção de `anatomyId`, hierarquia `.glb`, schemas JSON/Zod, prova matemática da conversão BodyParts3D → glTF 2.0, pipeline Node/Meshopt e *gate* de validação | Engenharia de Dados / 3D | Pronta para implementação |
| [matriz-de-cobertura.md](./matriz-de-cobertura.md) | Inventário completo das 22 estruturas (36 malhas STL reais) da Fase 1 (cintura escapular e membro superior bilateral) e checklist de validação científica | Revisão Científica, Engenharia, QA | Aguardando revisão científica (`pending_review`) |
| [dossie-licenciamento.md](./dossie-licenciamento.md) | Dossiê jurídico e de proveniência do BodyParts3D v3.0 (`CC BY-SA 2.1 JP`), matriz comparativa com Z-Anatomy (`CC BY-SA 4.0`), atribuição obrigatória e registro de hashes | Jurídico, Produto, Engenharia | Consolidado para Fase 1 |
| [ux-interacao-e-acessibilidade.md](./ux-interacao-e-acessibilidade.md) | Design system clínico em fundo `#000000`, tokens CSS, *wireframes* responsivos (320 px a desktop), gestos táteis, atalhos de teclado e checklist WCAG 2.2 AA | Design, Frontend, Acessibilidade | Pronta para implementação |
| [plano-de-implementacao-e-testes.md](./plano-de-implementacao-e-testes.md) | Roteiro executável em 6 marcos (Fase 0 + Fase 1), matriz de rastreabilidade `RF`/`RNF` → testes Vitest e Playwright, orçamentos de carga e critérios de saída | Engenharia, QA | Pronta para execução |

---

## Ordem Recomendada de Leitura

Antes de escrever a primeira linha de código ou executar o pipeline de conversão de ativos:

1. Leia [especificacao-tecnica-anatomia-3d.md](../especificacao-tecnica-anatomia-3d.md) para alinhar os objetivos do MVP e o que está explicitamente fora de escopo.
2. Consulte [adr-decisoes-arquiteturais.md](./adr-decisoes-arquiteturais.md) para compreender o racional de cada escolha técnica e de produto.
3. Estude [contrato-dados-e-pipeline-3d.md](./contrato-dados-e-pipeline-3d.md), [matriz-de-cobertura.md](./matriz-de-cobertura.md) e [dossie-licenciamento.md](./dossie-licenciamento.md) para dominar o contrato de ativos da **Fase 0** (36 malhas reais → 22 estruturas → 2 `.glb` progressivos + JSONs validados).
4. Revise [arquitetura-tecnica.md](./arquitetura-tecnica.md) e [ux-interacao-e-acessibilidade.md](./ux-interacao-e-acessibilidade.md) para implementar a **Fase 1** mantendo desacoplamento total entre UI React, store de estado e adaptador Three.js.
5. Siga a sequência de marcos e gates de qualidade descrita em [plano-de-implementacao-e-testes.md](./plano-de-implementacao-e-testes.md).

---

## Regras Inegociáveis de Governança e Workspace

- **Proteção de `sources/`:** Conforme [AGENTS.md](../AGENTS.md), todos os arquivos sob `sources/` devem ser tratados como material de referência **somente leitura**. Nunca editar, renomear, mover ou excluir conteúdo nessa pasta.
- **Fonte de verdade de cobertura:** A aplicação **nunca** deve afirmar ou sugerir cobertura anatômica de corpo inteiro enquanto publicar apenas a matriz da Fase 1. Toda exibição pública de cobertura deve refletir exatamente o que estiver validado em [matriz-de-cobertura.md](./matriz-de-cobertura.md).
- **Licença e atribuição:** Os modelos da Fase 1 derivam do **BodyParts3D v3.0** (DBCLS) sob licença `CC BY-SA 2.1 JP`. Toda publicação ou redistribuição dos derivados `.glb` deve preservar a atribuição exigida e manter os derivados 3D sob termos compatíveis com ShareAlike (detalhes em [dossie-licenciamento.md](./dossie-licenciamento.md)).
- **Desacoplamento estrito:** Metadados anatômicos, malhas `.glb`, engine 3D e componentes de interface permanecem separados por contratos explícitos validados por schema Zod em tempo de build e carga.
