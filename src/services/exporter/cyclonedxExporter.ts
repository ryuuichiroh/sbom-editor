/**
 * CycloneDX 1.4 エクスポーター
 * UnifiedSBOM を CycloneDX JSON 形式に変換してダウンロードする
 */

import type {
  UnifiedSBOM,
  Component,
  Creator,
  Hash,
  ExternalRef,
  OrganizationalEntity,
  Property,
  BomLicense,
  SWID,
  Pedigree,
  ReleaseNotes,
} from '../../types/unified';

/**
 * CycloneDX BOM ドキュメント型定義（エクスポート用）
 */
interface CycloneDXBom {
  bomFormat: string;
  specVersion: string;
  serialNumber?: string;
  version?: number;
  metadata?: CycloneDXMetadata;
  components?: CycloneDXComponent[];
  dependencies?: CycloneDXDependency[];
}

interface CycloneDXMetadata {
  timestamp?: string;
  tools?: CycloneDXTool[];
  authors?: CycloneDXOrganizationalContact[];
  component?: CycloneDXComponent;
  supplier?: CycloneDXOrganizationalEntity;
  licenses?: CycloneDXLicense[];
  properties?: CycloneDXProperty[];
}

interface CycloneDXTool {
  vendor?: string;
  name?: string;
  version?: string;
}

interface CycloneDXOrganizationalContact {
  name?: string;
  email?: string;
}

interface CycloneDXOrganizationalEntity {
  name?: string;
  url?: string[];
  contact?: CycloneDXOrganizationalContact[];
}

interface CycloneDXLicense {
  license?: {
    id?: string;
    name?: string;
    url?: string;
  };
  expression?: string;
}

interface CycloneDXProperty {
  name: string;
  value: string;
}

interface CycloneDXComponent {
  type: string;
  'bom-ref'?: string;
  name: string;
  version?: string;
  group?: string;
  purl?: string;
  cpe?: string;
  swid?: CycloneDXSwid;
  supplier?: CycloneDXOrganizationalEntity;
  author?: string;
  publisher?: string;
  description?: string;
  scope?: string;
  hashes?: CycloneDXHash[];
  licenses?: CycloneDXLicense[];
  copyright?: string;
  externalReferences?: CycloneDXExternalReference[];
  properties?: CycloneDXProperty[];
  pedigree?: CycloneDXPedigree;
  releaseNotes?: CycloneDXReleaseNotes;
}

interface CycloneDXHash {
  alg: string;
  content: string;
}

interface CycloneDXExternalReference {
  type: string;
  url: string;
  comment?: string;
}

interface CycloneDXSwid {
  tagId: string;
  name: string;
  version?: string;
  tagVersion?: number;
  patch?: boolean;
}

interface CycloneDXPedigree {
  ancestors?: CycloneDXComponent[];
  descendants?: CycloneDXComponent[];
  notes?: string;
}

interface CycloneDXReleaseNotes {
  type: string;
  title?: string;
  description?: string;
  timestamp?: string;
}

interface CycloneDXDependency {
  ref: string;
  dependsOn?: string[];
}

/**
 * UnifiedSBOM を CycloneDX JSON に変換する
 */
export function convertToCycloneDXJSON(sbom: UnifiedSBOM): string {
  // rawSource が CycloneDX の場合は可能な限り元データを活用
  const cdxBom =
    sbom.rawSource && sbom.format === 'cyclonedx'
      ? mergeWithRawSource(sbom, sbom.rawSource as CycloneDXBom)
      : buildCycloneDXBom(sbom);

  return JSON.stringify(cdxBom, null, 2);
}

/**
 * rawSource を活用して CycloneDX BOM を構築する（情報損失を防ぐ）
 */
function mergeWithRawSource(sbom: UnifiedSBOM, rawSource: CycloneDXBom): CycloneDXBom {
  // 基本的な構造は rawSource をベースにする
  const cdxBom: CycloneDXBom = {
    ...rawSource,
    // メタデータは最新の値で上書き
    bomFormat: 'CycloneDX',
    specVersion: sbom.specVersion ?? '1.4',
    serialNumber: sbom.metadata.serialNumber ?? rawSource.serialNumber,
    version: sbom.metadata.bomVersion ?? rawSource.version,
  };

  // メタデータの更新
  if (rawSource.metadata) {
    cdxBom.metadata = {
      ...rawSource.metadata,
      timestamp: sbom.metadata.created ?? rawSource.metadata.timestamp,
      tools: sbom.metadata.creators.filter((c) => c.type === 'tool').map(convertCreatorToTool),
      authors: sbom.metadata.creators
        .filter((c) => c.type === 'person')
        .map(convertCreatorToAuthor),
      supplier: sbom.metadata.supplier
        ? convertOrganizationalEntity(sbom.metadata.supplier)
        : rawSource.metadata.supplier,
      licenses: sbom.metadata.licenses
        ? sbom.metadata.licenses.map(convertBomLicense)
        : rawSource.metadata.licenses,
      properties: sbom.metadata.properties
        ? sbom.metadata.properties.map(convertProperty)
        : rawSource.metadata.properties,
    };
  } else {
    cdxBom.metadata = buildMetadata(sbom);
  }

  // コンポーネントの更新
  cdxBom.components = sbom.components.map((comp) => {
    // 元のコンポーネントデータを探す
    const originalComp = rawSource.components?.find((c) => c['bom-ref'] === comp.bomRef);

    return originalComp
      ? mergeComponentWithRawSource(comp, originalComp)
      : convertComponentToCycloneDXComponent(comp);
  });

  // 依存関係の更新
  cdxBom.dependencies = buildDependencies(sbom);

  return cdxBom;
}

/**
 * コンポーネントと元のコンポーネントデータをマージする
 */
function mergeComponentWithRawSource(
  comp: Component,
  originalComp: CycloneDXComponent
): CycloneDXComponent {
  const cdxComp: CycloneDXComponent = {
    ...originalComp,
    // 編集された値で上書き
    type: comp.type,
    'bom-ref': comp.bomRef ?? originalComp['bom-ref'],
    name: comp.name,
    version: comp.version,
    group: comp.group ?? originalComp.group,
    purl: comp.purl ?? originalComp.purl,
    cpe: comp.cpe ?? originalComp.cpe,
    description: comp.description ?? originalComp.description,
    scope: comp.scope ?? originalComp.scope,
    author: comp.author ?? originalComp.author,
    publisher: comp.publisher ?? originalComp.publisher,
    copyright: comp.copyrightText ?? originalComp.copyright,
  };

  // ハッシュ値の更新
  if (comp.hashes.length > 0) {
    cdxComp.hashes = comp.hashes.map(convertHash);
  }

  // ライセンスの更新
  if (comp.licenses.length > 0) {
    cdxComp.licenses = comp.licenses
      .filter((lic) => lic.licenseId ?? lic.licenseName ?? lic.expression)
      .map(convertLicense);
  }

  // 外部参照の更新
  if (comp.externalRefs.length > 0) {
    cdxComp.externalReferences = comp.externalRefs.map(convertExternalRef);
  }

  // properties の更新（cdxProperties + customAttributes をマージ）
  const properties: CycloneDXProperty[] = [];

  // 元の cdxProperties を追加
  if (comp.cdxProperties) {
    comp.cdxProperties.forEach((prop) => {
      if (Array.isArray(prop.value)) {
        // string[] の場合は同名エントリを複数展開
        prop.value.forEach((val) => {
          properties.push({ name: prop.name, value: val });
        });
      } else {
        properties.push({ name: prop.name, value: prop.value });
      }
    });
  }

  // カスタム属性を追加（customAttributes が優先）
  comp.customAttributes.forEach((attr) => {
    if (Array.isArray(attr.value)) {
      // string[] の場合は同名エントリを複数展開
      attr.value.forEach((val) => {
        properties.push({ name: attr.name, value: val });
      });
    } else {
      properties.push({ name: attr.name, value: attr.value });
    }
  });

  if (properties.length > 0) {
    cdxComp.properties = properties;
  }

  // Supplier の更新
  if (comp.supplier) {
    cdxComp.supplier = convertOrganizationalEntity(comp.supplier);
  }

  // SWID の更新
  if (comp.swid) {
    cdxComp.swid = convertSwid(comp.swid);
  }

  // Pedigree の更新
  if (comp.pedigree) {
    cdxComp.pedigree = convertPedigree(comp.pedigree);
  }

  // Release notes の更新
  if (comp.releaseNotes) {
    cdxComp.releaseNotes = convertReleaseNotes(comp.releaseNotes);
  }

  return cdxComp;
}

/**
 * ゼロから CycloneDX BOM を構築する
 */
function buildCycloneDXBom(sbom: UnifiedSBOM): CycloneDXBom {
  const cdxBom: CycloneDXBom = {
    bomFormat: 'CycloneDX',
    specVersion: sbom.specVersion ?? '1.4',
    serialNumber: sbom.metadata.serialNumber ?? `urn:uuid:${generateUUID()}`,
    version: sbom.metadata.bomVersion ?? 1,
    metadata: buildMetadata(sbom),
    components: sbom.components.map(convertComponentToCycloneDXComponent),
    dependencies: buildDependencies(sbom),
  };

  return cdxBom;
}

/**
 * メタデータを構築する
 */
function buildMetadata(sbom: UnifiedSBOM): CycloneDXMetadata {
  const metadata: CycloneDXMetadata = {
    timestamp: sbom.metadata.created ?? new Date().toISOString(),
  };

  // tools の設定
  const tools = sbom.metadata.creators.filter((c) => c.type === 'tool').map(convertCreatorToTool);
  if (tools.length > 0) {
    metadata.tools = tools;
  }

  // authors の設定
  const authors = sbom.metadata.creators
    .filter((c) => c.type === 'person')
    .map(convertCreatorToAuthor);
  if (authors.length > 0) {
    metadata.authors = authors;
  }

  // supplier の設定
  if (sbom.metadata.supplier) {
    metadata.supplier = convertOrganizationalEntity(sbom.metadata.supplier);
  }

  // licenses の設定
  if (sbom.metadata.licenses && sbom.metadata.licenses.length > 0) {
    metadata.licenses = sbom.metadata.licenses.map(convertBomLicense);
  }

  // properties の設定
  if (sbom.metadata.properties && sbom.metadata.properties.length > 0) {
    metadata.properties = sbom.metadata.properties.map(convertProperty);
  }

  // component の設定（ルートコンポーネント）
  const rootComponents = sbom.components.filter((comp) => comp.parentIds.length === 0);
  if (rootComponents.length > 0) {
    metadata.component = convertComponentToCycloneDXComponent(rootComponents[0]);
  }

  return metadata;
}

/**
 * Component を CycloneDXComponent に変換する
 */
function convertComponentToCycloneDXComponent(comp: Component): CycloneDXComponent {
  const cdxComp: CycloneDXComponent = {
    type: comp.type,
    'bom-ref': comp.bomRef ?? comp.id,
    name: comp.name,
  };

  // オプショナルフィールドの設定
  if (comp.version) cdxComp.version = comp.version;
  if (comp.group) cdxComp.group = comp.group;
  if (comp.purl) cdxComp.purl = comp.purl;
  if (comp.cpe) cdxComp.cpe = comp.cpe;
  if (comp.description) cdxComp.description = comp.description;
  if (comp.scope) cdxComp.scope = comp.scope;
  if (comp.author) cdxComp.author = comp.author;
  if (comp.publisher) cdxComp.publisher = comp.publisher;
  if (comp.copyrightText) cdxComp.copyright = comp.copyrightText;

  // ハッシュ値の変換
  if (comp.hashes.length > 0) {
    cdxComp.hashes = comp.hashes.map(convertHash);
  }

  // ライセンスの変換
  const licenses = comp.licenses
    .filter((lic) => lic.licenseId ?? lic.licenseName ?? lic.expression)
    .map(convertLicense);
  if (licenses.length > 0) {
    cdxComp.licenses = licenses;
  }

  // 外部参照の変換
  if (comp.externalRefs.length > 0) {
    cdxComp.externalReferences = comp.externalRefs.map(convertExternalRef);
  }

  // properties の変換（cdxProperties + customAttributes をマージ）
  const properties: CycloneDXProperty[] = [];

  // 元の cdxProperties を追加
  if (comp.cdxProperties) {
    comp.cdxProperties.forEach((prop) => {
      if (Array.isArray(prop.value)) {
        // string[] の場合は同名エントリを複数展開
        prop.value.forEach((val) => {
          properties.push({ name: prop.name, value: val });
        });
      } else {
        properties.push({ name: prop.name, value: prop.value });
      }
    });
  }

  // カスタム属性を追加（customAttributes が優先）
  comp.customAttributes.forEach((attr) => {
    if (Array.isArray(attr.value)) {
      // string[] の場合は同名エントリを複数展開
      attr.value.forEach((val) => {
        properties.push({ name: attr.name, value: val });
      });
    } else {
      properties.push({ name: attr.name, value: attr.value });
    }
  });

  if (properties.length > 0) {
    cdxComp.properties = properties;
  }

  // Supplier の設定
  if (comp.supplier) {
    cdxComp.supplier = convertOrganizationalEntity(comp.supplier);
  }

  // SWID の設定
  if (comp.swid) {
    cdxComp.swid = convertSwid(comp.swid);
  }

  // Pedigree の設定
  if (comp.pedigree) {
    cdxComp.pedigree = convertPedigree(comp.pedigree);
  }

  // Release notes の設定
  if (comp.releaseNotes) {
    cdxComp.releaseNotes = convertReleaseNotes(comp.releaseNotes);
  }

  return cdxComp;
}

/**
 * 依存関係を構築する
 */
function buildDependencies(sbom: UnifiedSBOM): CycloneDXDependency[] {
  const dependencies: CycloneDXDependency[] = [];

  // 各コンポーネントの依存関係を構築
  sbom.components.forEach((comp) => {
    const ref = comp.bomRef ?? comp.id;

    // このコンポーネントが依存している他のコンポーネントを探す
    const dependsOn = sbom.relationships
      .filter((rel) => rel.sourceId === comp.id && rel.type === 'dependsOn')
      .map((rel) => {
        const targetComp = sbom.components.find((c) => c.id === rel.targetId);
        return targetComp?.bomRef ?? targetComp?.id ?? '';
      })
      .filter((bomRef) => bomRef !== '');

    dependencies.push({
      ref,
      dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
    });
  });

  return dependencies;
}

/**
 * Creator を CycloneDX Tool に変換する
 */
function convertCreatorToTool(creator: Creator): CycloneDXTool {
  // name から vendor と name を分離（例: "ACME scanner" → vendor: "ACME", name: "scanner"）
  const parts = creator.name.split(/\s+/);
  const vendor = parts.length > 1 ? parts[0] : undefined;
  const name = parts.length > 1 ? parts.slice(1).join(' ') : creator.name;

  return {
    vendor,
    name,
    version: creator.version,
  };
}

/**
 * Creator を CycloneDX Author に変換する
 */
function convertCreatorToAuthor(creator: Creator): CycloneDXOrganizationalContact {
  return {
    name: creator.name,
    email: creator.email,
  };
}

/**
 * Hash を CycloneDX Hash に変換する
 */
function convertHash(hash: Hash): CycloneDXHash {
  return {
    alg: hash.algorithm,
    content: hash.value,
  };
}

/**
 * ComponentLicense を CycloneDX License に変換する
 */
function convertLicense(license: {
  expression?: string;
  licenseId?: string;
  licenseName?: string;
  url?: string;
}): CycloneDXLicense {
  // expression が優先
  if (license.expression) {
    return {
      expression: license.expression,
    };
  }

  // license オブジェクトを構築
  return {
    license: {
      id: license.licenseId,
      name: license.licenseName,
      url: license.url,
    },
  };
}

/**
 * ExternalRef を CycloneDX ExternalReference に変換する
 */
function convertExternalRef(ref: ExternalRef): CycloneDXExternalReference {
  return {
    type: ref.type,
    url: ref.locator,
    comment: ref.comment,
  };
}

/**
 * OrganizationalEntity を CycloneDX OrganizationalEntity に変換する
 */
function convertOrganizationalEntity(entity: OrganizationalEntity): CycloneDXOrganizationalEntity {
  const cdxEntity: CycloneDXOrganizationalEntity = {
    name: entity.name,
  };

  if (entity.url && entity.url.length > 0) {
    cdxEntity.url = entity.url;
  }

  if (entity.email) {
    cdxEntity.contact = [
      {
        email: entity.email,
      },
    ];
  }

  return cdxEntity;
}

/**
 * Property を CycloneDX Property に変換する
 */
function convertProperty(prop: Property): CycloneDXProperty {
  // string[] の場合は最初の値のみを使用（複数エントリは呼び出し側で展開される）
  const value = Array.isArray(prop.value) ? prop.value[0] : prop.value;
  return {
    name: prop.name,
    value: value ?? '',
  };
}

/**
 * BomLicense を CycloneDX License に変換する
 */
function convertBomLicense(license: BomLicense): CycloneDXLicense {
  if (license.expression) {
    return {
      expression: license.expression,
    };
  }

  return {
    license: {
      id: license.licenseId,
      name: license.licenseName,
    },
  };
}

/**
 * SWID を CycloneDX SWID に変換する
 */
function convertSwid(swid: SWID): CycloneDXSwid {
  return {
    tagId: swid.tagId,
    name: swid.name,
    version: swid.version,
    tagVersion: swid.tagVersion,
    patch: swid.patch,
  };
}

/**
 * Pedigree を CycloneDX Pedigree に変換する
 */
function convertPedigree(pedigree: Pedigree): CycloneDXPedigree {
  const cdxPedigree: CycloneDXPedigree = {};

  if (pedigree.ancestors && pedigree.ancestors.length > 0) {
    cdxPedigree.ancestors = pedigree.ancestors.map(convertComponentToCycloneDXComponent);
  }

  if (pedigree.descendants && pedigree.descendants.length > 0) {
    cdxPedigree.descendants = pedigree.descendants.map(convertComponentToCycloneDXComponent);
  }

  if (pedigree.notes) {
    cdxPedigree.notes = pedigree.notes;
  }

  return cdxPedigree;
}

/**
 * ReleaseNotes を CycloneDX ReleaseNotes に変換する
 */
function convertReleaseNotes(releaseNotes: ReleaseNotes): CycloneDXReleaseNotes {
  return {
    type: releaseNotes.type,
    title: releaseNotes.title,
    description: releaseNotes.description,
    timestamp: releaseNotes.timestamp,
  };
}

/**
 * UUID を生成する（簡易版）
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * CycloneDX JSON をダウンロードする
 */
export function downloadCycloneDXJSON(sbom: UnifiedSBOM, filename?: string): void {
  const jsonString = convertToCycloneDXJSON(sbom);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `${sbom.metadata.name ?? 'sbom'}.cdx.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
