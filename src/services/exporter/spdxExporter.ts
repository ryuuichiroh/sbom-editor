/**
 * SPDX 2.3 エクスポーター
 * UnifiedSBOM を SPDX JSON 形式に変換してダウンロードする
 */

import type {
  UnifiedSBOM,
  Component,
  Creator,
  Hash,
  ExternalRef,
  OrganizationalEntity,
  Property,
} from '../../types/unified';

/**
 * SPDX ドキュメント型定義（エクスポート用）
 */
interface SPDXDocument {
  spdxVersion: string;
  dataLicense: string;
  SPDXID: string;
  name: string;
  documentNamespace: string;
  creationInfo: SPDXCreationInfo;
  packages: SPDXPackage[];
  relationships: SPDXRelationship[];
  documentDescribes?: string[];
  comment?: string;
}

interface SPDXCreationInfo {
  created: string;
  creators: string[];
  licenseListVersion?: string;
  comment?: string;
}

interface SPDXPackage {
  SPDXID: string;
  name: string;
  versionInfo?: string;
  downloadLocation: string;
  filesAnalyzed?: boolean;
  packageVerificationCode?: {
    packageVerificationCodeValue: string;
  };
  checksums?: {
    algorithm: string;
    checksumValue: string;
  }[];
  homepage?: string;
  sourceInfo?: string;
  licenseConcluded?: string;
  licenseInfoFromFiles?: string[];
  licenseDeclared?: string;
  licenseComments?: string;
  copyrightText?: string;
  summary?: string;
  description?: string;
  comment?: string;
  externalRefs?: {
    referenceCategory: string;
    referenceType: string;
    referenceLocator: string;
    comment?: string;
  }[];
  supplier?: string;
  originator?: string;
  attributionTexts?: string[];
  primaryPackagePurpose?: string;
  releaseDate?: string;
  builtDate?: string;
  validUntilDate?: string;
}

interface SPDXRelationship {
  spdxElementId: string;
  relationshipType: string;
  relatedSpdxElement: string;
  comment?: string;
}

/**
 * UnifiedSBOM を SPDX JSON に変換する
 */
export function convertToSPDXJSON(sbom: UnifiedSBOM): string {
  // rawSource が SPDX の場合は可能な限り元データを活用
  const spdxDoc =
    sbom.rawSource && sbom.format === 'spdx'
      ? mergeWithRawSource(sbom, sbom.rawSource as SPDXDocument)
      : buildSPDXDocument(sbom);

  return JSON.stringify(spdxDoc, null, 2);
}

/**
 * rawSource を活用して SPDX ドキュメントを構築する（情報損失を防ぐ）
 */
function mergeWithRawSource(sbom: UnifiedSBOM, rawSource: SPDXDocument): SPDXDocument {
  // 基本的な構造は rawSource をベースにする
  const spdxDoc: SPDXDocument = {
    ...rawSource,
    // メタデータは最新の値で上書き
    spdxVersion: sbom.specVersion,
    dataLicense: sbom.metadata.dataLicense ?? 'CC0-1.0',
    SPDXID: sbom.metadata.spdxId ?? 'SPDXRef-DOCUMENT',
    name: sbom.metadata.name,
    documentNamespace: sbom.metadata.namespace ?? rawSource.documentNamespace,
    creationInfo: {
      ...rawSource.creationInfo,
      created: sbom.metadata.created ?? new Date().toISOString(),
      creators: sbom.metadata.creators.map(formatCreator),
      licenseListVersion:
        sbom.metadata.licenseListVersion ?? rawSource.creationInfo?.licenseListVersion,
      comment: sbom.metadata.comment ?? rawSource.creationInfo?.comment,
    },
    comment: sbom.metadata.comment ?? rawSource.comment,
  };

  // パッケージの更新
  spdxDoc.packages = sbom.components.map((comp) => {
    // 元のパッケージデータを探す
    const originalPkg = rawSource.packages?.find((pkg) => pkg.SPDXID === comp.spdxId);

    return originalPkg
      ? mergePackageWithRawSource(comp, originalPkg)
      : convertComponentToPackage(comp);
  });

  // 関係性の更新
  spdxDoc.relationships = sbom.relationships.map((rel) => {
    const sourceComp = sbom.components.find((c) => c.id === rel.sourceId);
    const targetComp = sbom.components.find((c) => c.id === rel.targetId);

    return {
      spdxElementId: sourceComp?.spdxId ?? `SPDXRef-${rel.sourceId}`,
      relationshipType: rel.type,
      relatedSpdxElement: targetComp?.spdxId ?? `SPDXRef-${rel.targetId}`,
      comment: rel.comment,
    };
  });

  return spdxDoc;
}

/**
 * コンポーネントと元のパッケージデータをマージする
 */
function mergePackageWithRawSource(comp: Component, originalPkg: SPDXPackage): SPDXPackage {
  const pkg: SPDXPackage = {
    ...originalPkg,
    // 編集された値で上書き
    SPDXID: comp.spdxId ?? originalPkg.SPDXID,
    name: comp.name,
    versionInfo: comp.version,
    downloadLocation: comp.downloadLocation ?? originalPkg.downloadLocation ?? 'NOASSERTION',
    filesAnalyzed: comp.filesAnalyzed ?? originalPkg.filesAnalyzed,
    sourceInfo: comp.sourceInfo ?? originalPkg.sourceInfo,
    licenseConcluded: comp.licenseConcluded ?? originalPkg.licenseConcluded,
    licenseDeclared: comp.licenseDeclared ?? originalPkg.licenseDeclared,
    licenseInfoFromFiles: comp.licenseInfoFromFiles ?? originalPkg.licenseInfoFromFiles,
    licenseComments: comp.licenseComments ?? originalPkg.licenseComments,
    copyrightText: comp.copyrightText ?? originalPkg.copyrightText,
    summary: comp.summary ?? originalPkg.summary,
    description: comp.description ?? originalPkg.description,
    comment: comp.packageComment ?? originalPkg.comment,
    primaryPackagePurpose: comp.primaryPackagePurpose ?? originalPkg.primaryPackagePurpose,
    releaseDate: comp.releaseDate ?? originalPkg.releaseDate,
    builtDate: comp.builtDate ?? originalPkg.builtDate,
    validUntilDate: comp.validUntilDate ?? originalPkg.validUntilDate,
  };

  // ハッシュ値の更新
  if (comp.hashes.length > 0) {
    pkg.checksums = comp.hashes.map(convertHashToChecksum);
  }

  // 外部参照の更新（カスタム属性を含む）
  const externalRefs = [...comp.externalRefs];

  // カスタム属性を ExternalRef (OTHER カテゴリ) として追加
  comp.customAttributes.forEach((attr) => {
    externalRefs.push({
      category: 'OTHER',
      type: `custom:${attr.name}`,
      locator: formatCustomAttributeValue(attr),
      comment: `Custom attribute: ${attr.name}`,
    });
  });

  if (externalRefs.length > 0) {
    pkg.externalRefs = externalRefs.map(convertExternalRef);
  }

  // Supplier / Originator の更新
  if (comp.supplier) {
    pkg.supplier = formatOrganizationalEntity('Organization', comp.supplier);
  }
  if (comp.originator) {
    pkg.originator = formatOrganizationalEntity('Organization', comp.originator);
  }

  // Attribution texts の更新
  if (comp.attributionTexts && comp.attributionTexts.length > 0) {
    pkg.attributionTexts = comp.attributionTexts;
  }

  // Verification code の更新
  if (comp.verificationCode) {
    pkg.packageVerificationCode = {
      packageVerificationCodeValue: comp.verificationCode,
    };
  }

  return pkg;
}

/**
 * ゼロから SPDX ドキュメントを構築する
 */
function buildSPDXDocument(sbom: UnifiedSBOM): SPDXDocument {
  const spdxDoc: SPDXDocument = {
    spdxVersion: sbom.specVersion ?? 'SPDX-2.3',
    dataLicense: sbom.metadata.dataLicense ?? 'CC0-1.0',
    SPDXID: sbom.metadata.spdxId ?? 'SPDXRef-DOCUMENT',
    name: sbom.metadata.name,
    documentNamespace:
      sbom.metadata.namespace ??
      `https://sbom.example.com/${sbom.metadata.name}/${Date.now().toString()}`,
    creationInfo: {
      created: sbom.metadata.created ?? new Date().toISOString(),
      creators: sbom.metadata.creators.map(formatCreator),
      licenseListVersion: sbom.metadata.licenseListVersion,
      comment: sbom.metadata.comment,
    },
    packages: sbom.components.map(convertComponentToPackage),
    relationships: sbom.relationships.map((rel) => {
      const sourceComp = sbom.components.find((c) => c.id === rel.sourceId);
      const targetComp = sbom.components.find((c) => c.id === rel.targetId);

      return {
        spdxElementId: sourceComp?.spdxId ?? `SPDXRef-${rel.sourceId}`,
        relationshipType: rel.type,
        relatedSpdxElement: targetComp?.spdxId ?? `SPDXRef-${rel.targetId}`,
        comment: rel.comment,
      };
    }),
  };

  // documentDescribes の設定（ルートコンポーネント）
  const rootComponents = sbom.components.filter((comp) => comp.parentIds.length === 0);
  if (rootComponents.length > 0) {
    spdxDoc.documentDescribes = rootComponents.map((comp) => comp.spdxId ?? `SPDXRef-${comp.id}`);
  }

  return spdxDoc;
}

/**
 * Component を SPDXPackage に変換する
 */
function convertComponentToPackage(comp: Component): SPDXPackage {
  const pkg: SPDXPackage = {
    SPDXID: comp.spdxId ?? `SPDXRef-${comp.id}`,
    name: comp.name,
    versionInfo: comp.version,
    downloadLocation: comp.downloadLocation ?? 'NOASSERTION',
    filesAnalyzed: comp.filesAnalyzed ?? false,
    licenseConcluded: comp.licenseConcluded ?? 'NOASSERTION',
    licenseDeclared: comp.licenseDeclared ?? 'NOASSERTION',
    copyrightText: comp.copyrightText ?? 'NOASSERTION',
  };

  // オプショナルフィールドの設定
  if (comp.sourceInfo) pkg.sourceInfo = comp.sourceInfo;
  if (comp.licenseInfoFromFiles && comp.licenseInfoFromFiles.length > 0) {
    pkg.licenseInfoFromFiles = comp.licenseInfoFromFiles;
  }
  if (comp.licenseComments) pkg.licenseComments = comp.licenseComments;
  if (comp.summary) pkg.summary = comp.summary;
  if (comp.description) pkg.description = comp.description;
  if (comp.packageComment) pkg.comment = comp.packageComment;
  if (comp.primaryPackagePurpose) pkg.primaryPackagePurpose = comp.primaryPackagePurpose;
  if (comp.releaseDate) pkg.releaseDate = comp.releaseDate;
  if (comp.builtDate) pkg.builtDate = comp.builtDate;
  if (comp.validUntilDate) pkg.validUntilDate = comp.validUntilDate;

  // ハッシュ値の変換
  if (comp.hashes.length > 0) {
    pkg.checksums = comp.hashes.map(convertHashToChecksum);
  }

  // 外部参照の変換（カスタム属性を含む）
  const externalRefs = [...comp.externalRefs];

  // カスタム属性を ExternalRef (OTHER カテゴリ) として追加
  comp.customAttributes.forEach((attr) => {
    externalRefs.push({
      category: 'OTHER',
      type: `custom:${attr.name}`,
      locator: formatCustomAttributeValue(attr),
      comment: `Custom attribute: ${attr.name}`,
    });
  });

  if (externalRefs.length > 0) {
    pkg.externalRefs = externalRefs.map(convertExternalRef);
  }

  // Supplier / Originator の設定
  if (comp.supplier) {
    pkg.supplier = formatOrganizationalEntity('Organization', comp.supplier);
  }
  if (comp.originator) {
    pkg.originator = formatOrganizationalEntity('Organization', comp.originator);
  }

  // Attribution texts の設定
  if (comp.attributionTexts && comp.attributionTexts.length > 0) {
    pkg.attributionTexts = comp.attributionTexts;
  }

  // Verification code の設定
  if (comp.verificationCode) {
    pkg.packageVerificationCode = {
      packageVerificationCodeValue: comp.verificationCode,
    };
  }

  return pkg;
}

/**
 * Creator を SPDX 形式の文字列に変換する
 * 形式: "Person: John Doe (john@example.com)", "Organization: ACME", "Tool: scanner-1.0"
 */
function formatCreator(creator: Creator): string {
  const typePrefix = creator.type.charAt(0).toUpperCase() + creator.type.slice(1);

  let name = creator.name;
  if (creator.type === 'tool' && creator.version) {
    name = `${name}-${creator.version}`;
  }

  if (creator.email) {
    return `${typePrefix}: ${name} (${creator.email})`;
  }

  return `${typePrefix}: ${name}`;
}

/**
 * Hash を SPDX Checksum に変換する
 */
function convertHashToChecksum(hash: Hash): {
  algorithm: string;
  checksumValue: string;
} {
  return {
    algorithm: hash.algorithm,
    checksumValue: hash.value,
  };
}

/**
 * ExternalRef を SPDX ExternalRef に変換する
 */
function convertExternalRef(ref: ExternalRef): {
  referenceCategory: string;
  referenceType: string;
  referenceLocator: string;
  comment?: string;
} {
  return {
    referenceCategory: ref.category,
    referenceType: ref.type,
    referenceLocator: ref.locator,
    comment: ref.comment,
  };
}

/**
 * OrganizationalEntity を SPDX 形式の文字列に変換する
 * 形式: "Person: John Doe (john@example.com)", "Organization: ACME (info@acme.com)"
 */
function formatOrganizationalEntity(
  type: 'Person' | 'Organization',
  entity: OrganizationalEntity
): string {
  if (entity.email) {
    return `${type}: ${entity.name} (${entity.email})`;
  }
  return `${type}: ${entity.name}`;
}

/**
 * カスタム属性の値を文字列に変換する
 * string[] の場合は delimiter で結合（デフォルト: カンマ）
 */
function formatCustomAttributeValue(attr: Property): string {
  if (Array.isArray(attr.value)) {
    // string[] の場合はカンマ区切りで結合
    return attr.value.join(',');
  }
  return attr.value;
}

/**
 * SPDX JSON をダウンロードする
 */
export function downloadSPDXJSON(sbom: UnifiedSBOM, filename?: string): void {
  const jsonString = convertToSPDXJSON(sbom);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `${sbom.metadata.name ?? 'sbom'}.spdx.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
