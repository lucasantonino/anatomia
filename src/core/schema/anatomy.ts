import { z } from 'zod';

/**
 * Regex canônica de identificadores anatômicos (tipo.nome_latino.lateralidade[.parte]).
 * Exemplos válidos:
 * - bone.clavicula.right
 * - bone.clavicula.left
 * - muscle.biceps_brachii.left
 * - muscle.biceps_brachii.left.short_head
 * - bone.sternum.midline
 */
export const ANATOMY_ID_REGEX =
  /^(bone|muscle)\.[a-z][a-z0-9_]*\.(left|right|midline)(\.[a-z0-9_]+)?$/;

export const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
export const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;
export const FMA_ID_REGEX = /^FMA\d+$/;
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const SAFE_ASSET_URL_PATTERN = /^\/assets\/[a-zA-Z0-9/_.-]+$/;
const SAFE_EXTERNAL_HTTP_URL_PATTERN = /^https?:\/\/[^\s"'<>]+$/;

/**
 * Tolerância máxima (5 mm = 0,005 m) para validação geométrica de labelAnchor
 * em relação à boundingBox da estrutura (Contrato Seção 6, verificação 7).
 */
export const LABEL_ANCHOR_BBOX_TOLERANCE_METERS = 0.005;

/**
 * Valida se uma URL de ativo é um caminho relativo seguro sob `/assets/`,
 * sem travessia de diretório (`..`), barras invertidas, segmentos codificados
 * perigosos ou protocolos externos.
 */
export function isSafeAssetUrl(value: string): boolean {
  if (!value.startsWith('/assets/')) {
    return false;
  }
  if (
    value.startsWith('//') ||
    value.includes('://') ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('//') ||
    /%2e|%2f|%5c/i.test(value) ||
    value.endsWith('/')
  ) {
    return false;
  }
  if (!SAFE_ASSET_URL_PATTERN.test(value)) {
    return false;
  }

  const segments = value.slice(1).split('/');
  return (
    segments.length >= 2 &&
    segments[0] === 'assets' &&
    segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
  );
}

/**
 * Valida uma data civil estrita no formato YYYY-MM-DD (sem dependências de DOM).
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isSafeExternalHttpUrl(value: string): boolean {
  return SAFE_EXTERNAL_HTTP_URL_PATTERN.test(value);
}

const NonEmptyStringSchema = z.string().trim().min(1, 'Campo obrigatório não pode ser vazio.');

export const SemverSchema = z
  .string()
  .regex(SEMVER_REGEX, 'Versão de schema inválida (esperado formato SemVer X.Y.Z).');

export const Sha256HexSchema = z
  .string()
  .regex(SHA256_HEX_REGEX, 'Hash SHA-256 deve conter exatamente 64 dígitos hexadecimais minúsculos.');

export const FmaIdSchema = z
  .string()
  .regex(FMA_ID_REGEX, 'Identificador FMA inválido (esperado formato FMA seguido de dígitos).');

export const SafeAssetUrlSchema = z.string().refine(isSafeAssetUrl, {
  message:
    'URL de ativo inválida: deve ser caminho relativo seguro iniciado por "/assets/" sem ".." ou protocolo externo.',
});

export const AnatomyIdSchema = z
  .string()
  .regex(
    ANATOMY_ID_REGEX,
    'anatomyId inválido: deve obedecer ao padrão tipo.nome_latino.lateralidade[.parte].',
  );

export const AnatomySystemSchema = z.enum(['muscular', 'skeletal']);
export const AnatomyRegionSchema = z.enum([
  'head_neck',
  'trunk',
  'upper_limb',
  'lower_limb',
]);
export const LateralitySchema = z.enum(['left', 'right', 'midline']);
export const ReviewStatusSchema = z.enum(['pending_review', 'approved']);

export const Vec3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export const NonZeroVec3Schema = Vec3Schema.refine(
  ([x, y, z]) => Math.hypot(x, y, z) > 1e-6,
  {
    message: 'Vetor de direção não pode ser nulo.',
  },
);

export const BoundingBoxSchema = z
  .object({
    min: Vec3Schema,
    max: Vec3Schema,
  })
  .refine(
    ({ min, max }) => min[0] <= max[0] && min[1] <= max[1] && min[2] <= max[2],
    {
      message: 'boundingBox inválido: cada coordenada min deve ser menor ou igual à coordenada max.',
    },
  );

export const LocalizedPtBrTextSchema = z.object({
  'pt-BR': NonEmptyStringSchema,
});

export const DisplayNameSchema = z.object({
  'pt-BR': NonEmptyStringSchema,
  la: NonEmptyStringSchema,
});

export const SystemAssetManifestSchema = z.object({
  url: SafeAssetUrlSchema,
  sha256: Sha256HexSchema,
  bytes: z.number().int().positive('bytes deve ser inteiro maior que zero.'),
  triangles: z.number().int().positive('triangles deve ser inteiro maior que zero.'),
  meshCount: z.number().int().positive('meshCount deve ser inteiro maior que zero.'),
});

export const ManifestLicenseSchema = z.object({
  sourceName: NonEmptyStringSchema,
  spdxOrIdentifier: NonEmptyStringSchema,
  attributionText: NonEmptyStringSchema,
  licenseUrl: z
    .string()
    .refine(isSafeExternalHttpUrl, 'licenseUrl deve ser uma URL HTTP/HTTPS válida.'),
});

export const ManifestSchema = z.object({
  schemaVersion: SemverSchema,
  assetVersion: NonEmptyStringSchema,
  metadataVersion: NonEmptyStringSchema,
  coverageMatrixVersion: NonEmptyStringSchema,
  coordinateSystem: z.literal('gltf-y-up-meters-anterior-pos-z'),
  sceneOriginOffset: Vec3Schema,
  metadataUrl: SafeAssetUrlSchema,
  coverageMatrixUrl: SafeAssetUrlSchema,
  systems: z.object({
    skeletal: SystemAssetManifestSchema,
    muscular: SystemAssetManifestSchema,
  }),
  license: ManifestLicenseSchema,
});

export const StructureSourceSchema = z.object({
  assetVersion: NonEmptyStringSchema,
  referenceIds: z.array(NonEmptyStringSchema).min(1, 'referenceIds deve conter ao menos uma referência.'),
  fmaIds: z.array(FmaIdSchema).min(1, 'fmaIds deve conter ao menos um FMA ID válido.'),
});

export const StructureReviewSchema = z
  .object({
    status: ReviewStatusSchema,
    reviewedBy: NonEmptyStringSchema,
    reviewedAt: z.string().nullable(),
  })
  .superRefine((review, ctx) => {
    if (review.status === 'approved') {
      if (review.reviewedBy === 'unassigned') {
        ctx.addIssue({
          code: 'custom',
          path: ['reviewedBy'],
          message:
            'Quando review.status for "approved", reviewedBy não pode ser "unassigned".',
        });
      }
      if (review.reviewedAt === null || !isValidIsoDate(review.reviewedAt)) {
        ctx.addIssue({
          code: 'custom',
          path: ['reviewedAt'],
          message:
            'Quando review.status for "approved", reviewedAt deve ser uma data válida no formato YYYY-MM-DD.',
        });
      }
      return;
    }

    if (review.reviewedAt !== null && !isValidIsoDate(review.reviewedAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message:
          'Quando review.status for "pending_review", reviewedAt deve ser null ou uma data YYYY-MM-DD válida.',
      });
    }
  });

function validateAnatomyIdConsistency(
  data: { anatomyId: string; system: AnatomySystem; laterality: Laterality },
  ctx: z.RefinementCtx,
): void {
  const parts = data.anatomyId.split('.');
  const prefix = parts[0];
  const idLaterality = parts[2];

  const expectedSystem: AnatomySystem = prefix === 'bone' ? 'skeletal' : 'muscular';
  if (data.system !== expectedSystem) {
    ctx.addIssue({
      code: 'custom',
      path: ['system'],
      message: `Inconsistência entre anatomyId "${data.anatomyId}" e system "${data.system}" (esperado "${expectedSystem}").`,
    });
  }

  if (idLaterality !== data.laterality) {
    ctx.addIssue({
      code: 'custom',
      path: ['laterality'],
      message: `Inconsistência entre lateralidade de anatomyId "${data.anatomyId}" e laterality "${data.laterality}".`,
    });
  }
}

export const StructureMetadataSchema = z
  .object({
    anatomyId: AnatomyIdSchema,
    system: AnatomySystemSchema,
    laterality: LateralitySchema,
    region: AnatomyRegionSchema,
    displayName: DisplayNameSchema,
    scientificName: NonEmptyStringSchema,
    meshNodes: z
      .array(AnatomyIdSchema)
      .min(1, 'meshNodes deve conter ao menos um nó de malha.')
      .refine((nodes) => new Set(nodes).size === nodes.length, {
        message: 'meshNodes não pode conter nós duplicados na mesma estrutura.',
      }),
    labelAnchor: Vec3Schema,
    focusDirection: NonZeroVec3Schema.optional(),
    boundingBox: BoundingBoxSchema,
    source: StructureSourceSchema,
    review: StructureReviewSchema,
    // Campos opcionais reservados para evolução P1 (Contrato Seção 3.2)
    description: LocalizedPtBrTextSchema.optional(),
    origin: LocalizedPtBrTextSchema.optional(),
    insertion: LocalizedPtBrTextSchema.optional(),
    action: LocalizedPtBrTextSchema.optional(),
  })
  .superRefine((structure, ctx) => {
    validateAnatomyIdConsistency(structure, ctx);
  });

export const MetadataDocumentSchema = z
  .object({
    schemaVersion: SemverSchema,
    assetVersion: NonEmptyStringSchema,
    metadataVersion: NonEmptyStringSchema,
    terminologyReference: NonEmptyStringSchema,
    generatedAt: z
      .string()
      .regex(
        ISO_DATETIME_REGEX,
        'generatedAt deve estar em formato ISO-8601 completo com fuso horário (ex.: 2026-11-20T00:00:00Z).',
      ),
    structures: z
      .array(StructureMetadataSchema)
      .min(1, 'structures deve conter ao menos uma estrutura anatômica.'),
  })
  .superRefine((doc, ctx) => {
    const seenIds = new Set<string>();
    const seenNodes = new Set<string>();

    doc.structures.forEach((structure, index) => {
      if (seenIds.has(structure.anatomyId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['structures', index, 'anatomyId'],
          message: `anatomyId duplicado em metadata: "${structure.anatomyId}".`,
        });
      }
      seenIds.add(structure.anatomyId);

      structure.meshNodes.forEach((nodeName, nodeIndex) => {
        if (seenNodes.has(nodeName)) {
          ctx.addIssue({
            code: 'custom',
            path: ['structures', index, 'meshNodes', nodeIndex],
            message: `Nó de malha duplicado entre estruturas em metadata: "${nodeName}".`,
          });
        }
        seenNodes.add(nodeName);
      });
    });
  });

export const CoverageStructureSchema = z
  .object({
    anatomyId: AnatomyIdSchema,
    system: AnatomySystemSchema,
    laterality: LateralitySchema,
    region: AnatomyRegionSchema.optional(),
    presentInAsset: z.boolean(),
    detailLevel: NonEmptyStringSchema,
    meshNodes: z
      .array(AnatomyIdSchema)
      .refine((nodes) => new Set(nodes).size === nodes.length, {
        message: 'meshNodes não pode conter nós duplicados na matriz de cobertura.',
      }),
    fmaIds: z.array(FmaIdSchema).min(1, 'fmaIds deve conter ao menos um FMA ID válido.'),
    reviewStatus: ReviewStatusSchema,
  })
  .superRefine((entry, ctx) => {
    validateAnatomyIdConsistency(entry, ctx);
    if (entry.presentInAsset && entry.meshNodes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['meshNodes'],
        message: 'Estrutura marcada com presentInAsset=true deve declarar ao menos um meshNode.',
      });
    }
  });

export const CoverageMatrixSchema = z
  .object({
    schemaVersion: SemverSchema.optional(),
    assetVersion: NonEmptyStringSchema.optional(),
    coverageMatrixVersion: NonEmptyStringSchema,
    scopeStatement: NonEmptyStringSchema,
    generatedAt: z
      .string()
      .regex(
        ISO_DATETIME_REGEX,
        'generatedAt deve estar em formato ISO-8601 completo com fuso horário.',
      )
      .optional(),
    structures: z
      .array(CoverageStructureSchema)
      .min(1, 'A matriz de cobertura deve listar ao menos uma estrutura.'),
  })
  .superRefine((matrix, ctx) => {
    const seenIds = new Set<string>();
    matrix.structures.forEach((entry, index) => {
      if (seenIds.has(entry.anatomyId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['structures', index, 'anatomyId'],
          message: `anatomyId duplicado na matriz de cobertura: "${entry.anatomyId}".`,
        });
      }
      seenIds.add(entry.anatomyId);
    });
  });

/**
 * Verifica se um ponto 3D (em metros) está contido dentro de uma boundingBox
 * respeitando uma tolerância opcional em metros (padrão: 5 mm = 0,005 m).
 */
export function isPointWithinBoundingBox(
  point: Vec3,
  box: BoundingBox,
  toleranceMeters: number = LABEL_ANCHOR_BBOX_TOLERANCE_METERS,
): boolean {
  return (
    point[0] >= box.min[0] - toleranceMeters &&
    point[0] <= box.max[0] + toleranceMeters &&
    point[1] >= box.min[1] - toleranceMeters &&
    point[1] <= box.max[1] + toleranceMeters &&
    point[2] >= box.min[2] - toleranceMeters &&
    point[2] <= box.max[2] + toleranceMeters
  );
}

// Tipos inferidos dos schemas Zod
export type AnatomySystem = z.infer<typeof AnatomySystemSchema>;
export type AnatomyRegion = z.infer<typeof AnatomyRegionSchema>;
export type Laterality = z.infer<typeof LateralitySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type Vec3 = z.infer<typeof Vec3Schema>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type DisplayName = z.infer<typeof DisplayNameSchema>;
export type LocalizedPtBrText = z.infer<typeof LocalizedPtBrTextSchema>;
export type SystemAssetManifest = z.infer<typeof SystemAssetManifestSchema>;
export type ManifestLicense = z.infer<typeof ManifestLicenseSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type StructureSource = z.infer<typeof StructureSourceSchema>;
export type StructureReview = z.infer<typeof StructureReviewSchema>;
export type StructureMetadata = z.infer<typeof StructureMetadataSchema>;
export type MetadataDocument = z.infer<typeof MetadataDocumentSchema>;
export type CoverageStructure = z.infer<typeof CoverageStructureSchema>;
export type CoverageMatrix = z.infer<typeof CoverageMatrixSchema>;
