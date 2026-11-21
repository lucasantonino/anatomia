import type {
  AnatomyRegion,
  AnatomySystem,
  Laterality,
  MetadataDocument,
  StructureMetadata,
} from '../schema/anatomy';

export type AnatomySystemFilter = AnatomySystem | 'all';
export type AnatomyRegionFilter = AnatomyRegion | 'all';

export interface SystemStructureCounts {
  readonly all: number;
  readonly muscular: number;
  readonly skeletal: number;
}

export type RegionStructureCounts = Record<AnatomyRegionFilter, number>;

export interface AnatomyRegistryVersion {
  readonly assetVersion: string;
  readonly metadataVersion: string;
  readonly terminologyReference: string;
}

const REGION_SEARCH_TERMS: Record<AnatomyRegion, string> = {
  head_neck: 'cabeca pescoco head_neck head neck',
  trunk: 'tronco torax coluna dorso abdome pelve trunk',
  upper_limb: 'membro superior braco antebraco mao ombro upper_limb upper limb',
  lower_limb: 'membro inferior coxa perna pe quadril lower_limb lower limb',
};

const LATERALITY_SEARCH_TERMS: Record<Laterality, readonly string[]> = {
  right: ['direito', 'direita', 'lado direito', 'right'],
  left: ['esquerdo', 'esquerda', 'lado esquerdo', 'left'],
  midline: ['mediano', 'mediana', 'linha media', 'midline'],
};

const ALL_LATERALITY_TOKENS = new Set<string>([
  'direito',
  'direita',
  'esquerdo',
  'esquerda',
  'lado',
  'right',
  'left',
  'mediano',
  'mediana',
  'linha',
  'media',
  'midline',
]);

const LATERALITY_SORT_ORDER: Record<Laterality, number> = {
  right: 0,
  left: 1,
  midline: 2,
};

/**
 * Normaliza texto para busca insensível a acentos, caixa e espaços extras.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

interface IndexedStructureEntry {
  readonly structure: StructureMetadata;
  readonly ptBr: string;
  readonly ptBrWithoutMusculoPrefix: string;
  readonly la: string;
  readonly scientific: string;
  readonly anatomyIdNormalized: string;
  readonly anatomyIdSpaced: string;
  readonly lateralityHaystack: string;
  readonly regionHaystack: string;
  readonly fullHaystack: string;
}

function buildIndexedEntry(structure: StructureMetadata): IndexedStructureEntry {
  const ptBr = normalizeSearchText(structure.displayName['pt-BR']);
  const ptBrWithoutMusculoPrefix = ptBr.startsWith('musculo ')
    ? ptBr.slice('musculo '.length)
    : ptBr;
  const la = normalizeSearchText(structure.displayName.la);
  const scientific = normalizeSearchText(structure.scientificName);
  const anatomyIdNormalized = normalizeSearchText(structure.anatomyId);
  const anatomyIdSpaced = normalizeSearchText(
    structure.anatomyId.replace(/[._]/g, ' '),
  );
  const lateralityHaystack = LATERALITY_SEARCH_TERMS[structure.laterality].join(' ');
  const regionHaystack = REGION_SEARCH_TERMS[structure.region];
  const fullHaystack = [
    ptBr,
    la,
    scientific,
    anatomyIdNormalized,
    anatomyIdSpaced,
    lateralityHaystack,
    regionHaystack,
  ].join(' ');

  return {
    structure,
    ptBr,
    ptBrWithoutMusculoPrefix,
    la,
    scientific,
    anatomyIdNormalized,
    anatomyIdSpaced,
    lateralityHaystack,
    regionHaystack,
    fullHaystack,
  };
}

function compareEntriesAlphabetically(
  a: IndexedStructureEntry,
  b: IndexedStructureEntry,
): number {
  if (a.ptBr !== b.ptBr) {
    return a.ptBr < b.ptBr ? -1 : 1;
  }

  const latDiff =
    LATERALITY_SORT_ORDER[a.structure.laterality] -
    LATERALITY_SORT_ORDER[b.structure.laterality];
  if (latDiff !== 0) {
    return latDiff;
  }

  if (a.anatomyIdNormalized !== b.anatomyIdNormalized) {
    return a.anatomyIdNormalized < b.anatomyIdNormalized ? -1 : 1;
  }
  return 0;
}

/**
 * Calcula pontuação determinística de relevância (menor valor = maior prioridade):
 * 0: início exato do nome PT-BR
 * 10..11: correspondência/substring no nome PT-BR
 * 20: início do nome Latim / científico
 * 25..26: tokens não-lateralidade casam com nome PT-BR (ex.: "biceps esquerdo")
 * 30: demais correspondências (substring Latim, anatomyId, lateralidade pura)
 */
function computeSearchRank(
  entry: IndexedStructureEntry,
  normalizedQuery: string,
  tokens: readonly string[],
  nonLateralityTokens: readonly string[],
): number {
  if (entry.ptBr.startsWith(normalizedQuery)) {
    return 0;
  }

  if (
    entry.ptBr.includes(normalizedQuery) ||
    tokens.every((token) => entry.ptBr.includes(token))
  ) {
    if (entry.ptBrWithoutMusculoPrefix.startsWith(normalizedQuery)) {
      return 10;
    }
    return 11;
  }

  if (
    entry.la.startsWith(normalizedQuery) ||
    entry.scientific.startsWith(normalizedQuery)
  ) {
    return 20;
  }

  if (nonLateralityTokens.length > 0) {
    const joinedCore = nonLateralityTokens.join(' ');
    if (
      entry.ptBr.startsWith(joinedCore) ||
      entry.ptBrWithoutMusculoPrefix.startsWith(joinedCore)
    ) {
      return 25;
    }
    if (nonLateralityTokens.every((token) => entry.ptBr.includes(token))) {
      return 26;
    }
  }

  return 30;
}

function createZeroRegionCounts(): Record<AnatomyRegionFilter, number> {
  return {
    all: 0,
    head_neck: 0,
    trunk: 0,
    upper_limb: 0,
    lower_limb: 0,
  };
}

export class AnatomyRegistry {
  public readonly version: AnatomyRegistryVersion;
  public readonly byAnatomyId: ReadonlyMap<string, StructureMetadata>;
  public readonly byMeshNode: ReadonlyMap<string, string>;

  private readonly entries: readonly IndexedStructureEntry[];
  private readonly counts: SystemStructureCounts;
  private readonly countsByRegion: Record<
    AnatomySystemFilter,
    Readonly<RegionStructureCounts>
  >;

  public constructor(
    structures: readonly StructureMetadata[],
    version: AnatomyRegistryVersion = {
      assetVersion: '',
      metadataVersion: '',
      terminologyReference: '',
    },
  ) {
    this.version = version;

    const idMap = new Map<string, StructureMetadata>();
    const nodeMap = new Map<string, string>();
    const indexed: IndexedStructureEntry[] = [];

    let muscularCount = 0;
    let skeletalCount = 0;
    const allRegionCounts = createZeroRegionCounts();
    const muscularRegionCounts = createZeroRegionCounts();
    const skeletalRegionCounts = createZeroRegionCounts();

    for (const structure of structures) {
      if (idMap.has(structure.anatomyId)) {
        throw new Error(
          `anatomyId duplicado ao construir AnatomyRegistry: "${structure.anatomyId}".`,
        );
      }
      idMap.set(structure.anatomyId, structure);

      for (const meshNode of structure.meshNodes) {
        if (nodeMap.has(meshNode)) {
          throw new Error(
            `meshNode duplicado ao construir AnatomyRegistry: "${meshNode}".`,
          );
        }
        nodeMap.set(meshNode, structure.anatomyId);
      }

      allRegionCounts.all += 1;
      allRegionCounts[structure.region] += 1;

      if (structure.system === 'muscular') {
        muscularCount += 1;
        muscularRegionCounts.all += 1;
        muscularRegionCounts[structure.region] += 1;
      } else {
        skeletalCount += 1;
        skeletalRegionCounts.all += 1;
        skeletalRegionCounts[structure.region] += 1;
      }

      indexed.push(buildIndexedEntry(structure));
    }

    indexed.sort(compareEntriesAlphabetically);

    this.byAnatomyId = idMap;
    this.byMeshNode = nodeMap;
    this.entries = indexed;
    this.counts = {
      all: indexed.length,
      muscular: muscularCount,
      skeletal: skeletalCount,
    };
    this.countsByRegion = {
      all: allRegionCounts,
      muscular: muscularRegionCounts,
      skeletal: skeletalRegionCounts,
    };
  }

  public get size(): number {
    return this.entries.length;
  }

  public getById(anatomyId: string): StructureMetadata | undefined {
    return this.byAnatomyId.get(anatomyId);
  }

  public getByMeshNode(meshNode: string): string | undefined {
    return this.byMeshNode.get(meshNode);
  }

  public getStructureByMeshNode(meshNode: string): StructureMetadata | undefined {
    const anatomyId = this.byMeshNode.get(meshNode);
    if (anatomyId === undefined) {
      return undefined;
    }
    return this.byAnatomyId.get(anatomyId);
  }

  public hasAnatomyId(anatomyId: string): boolean {
    return this.byAnatomyId.has(anatomyId);
  }

  public hasMeshNode(meshNode: string): boolean {
    return this.byMeshNode.has(meshNode);
  }

  public getAll(
    filterSystem: AnatomySystemFilter = 'all',
    filterRegion: AnatomyRegionFilter = 'all',
  ): StructureMetadata[] {
    if (filterSystem === 'all' && filterRegion === 'all') {
      return this.entries.map((entry) => entry.structure);
    }
    return this.entries
      .filter(
        (entry) =>
          (filterSystem === 'all' || entry.structure.system === filterSystem) &&
          (filterRegion === 'all' || entry.structure.region === filterRegion),
      )
      .map((entry) => entry.structure);
  }

  public getCountBySystem(): SystemStructureCounts {
    return this.counts;
  }

  public getCountByRegion(
    filterSystem: AnatomySystemFilter = 'all',
  ): RegionStructureCounts {
    return this.countsByRegion[filterSystem];
  }

  public search(
    query: string,
    filterSystem: AnatomySystemFilter = 'all',
    filterRegion: AnatomyRegionFilter = 'all',
  ): StructureMetadata[] {
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery.length === 0) {
      return this.getAll(filterSystem, filterRegion);
    }

    const tokens = normalizedQuery.split(' ').filter((token) => token.length > 0);
    const nonLateralityTokens = tokens.filter(
      (token) => !ALL_LATERALITY_TOKENS.has(token),
    );

    const matched: Array<{
      readonly entry: IndexedStructureEntry;
      readonly rank: number;
    }> = [];

    for (const entry of this.entries) {
      if (filterSystem !== 'all' && entry.structure.system !== filterSystem) {
        continue;
      }
      if (filterRegion !== 'all' && entry.structure.region !== filterRegion) {
        continue;
      }

      const matchesAllTokens = tokens.every((token) =>
        entry.fullHaystack.includes(token),
      );
      if (!matchesAllTokens) {
        continue;
      }

      matched.push({
        entry,
        rank: computeSearchRank(
          entry,
          normalizedQuery,
          tokens,
          nonLateralityTokens,
        ),
      });
    }

    matched.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return compareEntriesAlphabetically(a.entry, b.entry);
    });

    return matched.map((item) => item.entry.structure);
  }
}

export function createAnatomyRegistry(doc: MetadataDocument): AnatomyRegistry {
  return new AnatomyRegistry(doc.structures, {
    assetVersion: doc.assetVersion,
    metadataVersion: doc.metadataVersion,
    terminologyReference: doc.terminologyReference,
  });
}

export function createEmptyAnatomyRegistry(): AnatomyRegistry {
  return new AnatomyRegistry([]);
}
