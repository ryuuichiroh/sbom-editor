/**
 * SPDX 2.3 パーサー
 * SPDX フォーマット（JSON, YAML, tag-value）を UnifiedSBOM に変換する
 */

import type {
  UnifiedSBOM,
  SBOMMetadata,
  Component,
  ComponentType,
  SPDXPackagePurpose,
  ComponentLicense,
  Relationship,
  Creator,
  Hash,
  HashAlgorithm,
  ExternalRef,
  OrganizationalEntity,
} from '../../types/unified';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';

/**
 * SPDX ドキュメント型定義（JSON 形式）
 */
interface SPDXDocument {
  spdxVersion?: string;
  SPDXVersion?: string;
  dataLicense?: string;
  DataLicense?: string;
  SPDXID?: string;
  name?: string;
  documentName?: string;
  DocumentName?: string;
  documentNamespace?: string;
  DocumentNamespace?: string;
  creationInfo?: SPDXCreationInfo;
  packages?: SPDXPackage[];
  relationships?: SPDXRelationship[];
  files?: SPDXFile[];
  documentDescribes?: string[];
  externalDocumentRefs?: unknown[];
  hasExtractedLicensingInfos?: unknown[];
  annotations?: unknown[];
  reviewers?: unknown[];
  comment?: string;
  documentComment?: string;
}

interface SPDXCreationInfo {
  created?: string;
  creators?: string[];
  licenseListVersion?: string;
  comment?: string;
  creatorComment?: string;
}

interface SPDXPackage {
  SPDXID?: string;
  name?: string;
  versionInfo?: string;
  packageFileName?: string;
  supplier?: string;
  originator?: string;
  downloadLocation?: string;
  filesAnalyzed?: boolean;
  packageVerificationCode?: SPDXPackageVerificationCode;
  checksums?: SPDXChecksum[];
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
  externalRefs?: SPDXExternalRef[];
  attributionTexts?: string[];
  primaryPackagePurpose?: SPDXPackagePurpose;
  releaseDate?: string;
  builtDate?: string;
  validUntilDate?: string;
}

interface SPDXPackageVerificationCode {
  packageVerificationCodeValue?: string;
  packageVerificationCodeExcludedFiles?: string[];
}

interface SPDXChecksum {
  algorithm?: string;
  checksumValue?: string;
}

interface SPDXExternalRef {
  referenceCategory?: string;
  referenceType?: string;
  referenceLocator?: string;
  comment?: string;
}

interface SPDXRelationship {
  spdxElementId?: string;
  relationshipType?: string;
  relatedSpdxElement?: string;
  comment?: string;
}

interface SPDXFile {
  SPDXID?: string;
  fileName?: string;
  checksums?: SPDXChecksum[];
  licenseConcluded?: string;
  licenseInfoInFiles?: string[];
  copyrightText?: string;
  comment?: string;
  fileTypes?: string[];
  noticeText?: string;
  fileContributors?: string[];
  attributionTexts?: string[];
}

/**
 * SPDX JSON をパースして UnifiedSBOM に変換する
 */
export function parseSPDXJSON(jsonString: string): UnifiedSBOM {
  const spdxDoc = JSON.parse(jsonString) as SPDXDocument;
  return convertSPDXToUnified(spdxDoc);
}

/**
 * SPDX ドキュメントを UnifiedSBOM に変換する
 */
function convertSPDXToUnified(spdxDoc: SPDXDocument): UnifiedSBOM {
  // メタデータの変換
  const metadata = convertMetadata(spdxDoc);

  // パッケージの変換
  const components = (spdxDoc.packages ?? []).map((pkg) => convertPackageToComponent(pkg));

  // 関係性の変換
  const relationships = convertRelationships(spdxDoc.relationships ?? [], components);

  // 親子関係の設定（CONTAINS 関係から）
  setParentChildRelationships(components, relationships);

  return {
    format: 'spdx',
    specVersion: spdxDoc.spdxVersion ?? spdxDoc.SPDXVersion ?? 'SPDX-2.3',
    metadata,
    components,
    relationships,
    rawSource: spdxDoc,
  };
}

/**
 * SPDX メタデータを SBOMMetadata に変換する
 */
function convertMetadata(spdxDoc: SPDXDocument): SBOMMetadata {
  const creationInfo = spdxDoc.creationInfo ?? {};

  return {
    name: spdxDoc.name ?? spdxDoc.documentName ?? spdxDoc.DocumentName ?? '',
    namespace: spdxDoc.documentNamespace ?? spdxDoc.DocumentNamespace,
    created: creationInfo.created,
    creators: parseCreators(creationInfo.creators ?? []),
    comment:
      spdxDoc.comment ??
      spdxDoc.documentComment ??
      creationInfo.comment ??
      creationInfo.creatorComment,
    spdxId: spdxDoc.SPDXID ?? 'SPDXRef-DOCUMENT',
    dataLicense: spdxDoc.dataLicense ?? spdxDoc.DataLicense ?? 'CC0-1.0',
    licenseListVersion: creationInfo.licenseListVersion,
  };
}

/**
 * SPDX Creator 文字列を Creator 配列に変換する
 * 形式: "Person: John Doe (john@example.com)", "Organization: ACME", "Tool: scanner-1.0"
 */
function parseCreators(creators: string[]): Creator[] {
  return creators.map((creator) => {
    const match = /^(Person|Organization|Tool):\s*(.+)$/i.exec(creator);
    if (!match) {
      return { type: 'tool', name: creator };
    }

    const type = match[1].toLowerCase() as 'person' | 'organization' | 'tool';
    const rest = match[2].trim();

    // メールアドレスの抽出
    const emailMatch = /\(([^)]+@[^)]+)\)/.exec(rest);
    const email = emailMatch ? emailMatch[1] : undefined;
    const nameWithoutEmail = emailMatch ? rest.replace(/\s*\([^)]+\)/, '') : rest;

    // ツールのバージョン抽出（例: "scanner-1.0" → name: "scanner", version: "1.0"）
    let name = nameWithoutEmail;
    let version: string | undefined;
    if (type === 'tool') {
      const versionMatch = /^(.+?)-(\d+\.\d+.*)$/.exec(nameWithoutEmail);
      if (versionMatch) {
        name = versionMatch[1];
        version = versionMatch[2];
      }
    }

    return { type, name, email, version };
  });
}

/**
 * SPDX Package を Component に変換する
 */
function convertPackageToComponent(pkg: SPDXPackage): Component {
  const id = uuidv4();

  // PrimaryPackagePurpose から ComponentType へのマッピング
  const type = mapPurposeToType(pkg.primaryPackagePurpose);

  // ライセンス情報の変換
  const licenses = convertLicenses(
    pkg.licenseConcluded,
    pkg.licenseDeclared,
    pkg.licenseInfoFromFiles
  );

  // ハッシュ値の変換
  const hashes = (pkg.checksums ?? []).map(convertChecksum).filter((h): h is Hash => h !== null);

  // 外部参照の変換
  const externalRefs = (pkg.externalRefs ?? []).map(convertExternalRef);

  // Supplier / Originator の変換
  const supplier = parseOrganizationalEntity(pkg.supplier);
  const originator = parseOrganizationalEntity(pkg.originator);

  return {
    id,
    name: pkg.name ?? '',
    version: pkg.versionInfo,
    type,
    licenses,
    copyrightText: pkg.copyrightText,
    description: pkg.description,
    supplier,
    hashes,
    externalRefs,
    customAttributes: [],
    parentIds: [],

    // SPDX 固有フィールド
    spdxId: pkg.SPDXID,
    downloadLocation: pkg.downloadLocation,
    filesAnalyzed: pkg.filesAnalyzed,
    verificationCode: pkg.packageVerificationCode?.packageVerificationCodeValue,
    originator,
    sourceInfo: pkg.sourceInfo,
    licenseConcluded: pkg.licenseConcluded,
    licenseDeclared: pkg.licenseDeclared,
    licenseInfoFromFiles: pkg.licenseInfoFromFiles,
    licenseComments: pkg.licenseComments,
    summary: pkg.summary,
    packageComment: pkg.comment,
    attributionTexts: pkg.attributionTexts,
    primaryPackagePurpose: pkg.primaryPackagePurpose,
    releaseDate: pkg.releaseDate,
    builtDate: pkg.builtDate,
    validUntilDate: pkg.validUntilDate,
  };
}

/**
 * PrimaryPackagePurpose を ComponentType にマッピングする
 */
function mapPurposeToType(purpose?: SPDXPackagePurpose): ComponentType {
  if (!purpose) return 'library';

  const mapping: Record<SPDXPackagePurpose, ComponentType> = {
    APPLICATION: 'application',
    FRAMEWORK: 'framework',
    LIBRARY: 'library',
    CONTAINER: 'container',
    'OPERATING-SYSTEM': 'operating-system',
    DEVICE: 'device',
    FIRMWARE: 'firmware',
    FILE: 'file',
    SOURCE: 'other',
    ARCHIVE: 'other',
    INSTALL: 'other',
    OTHER: 'other',
  };

  return mapping[purpose] ?? 'library';
}

/**
 * SPDX ライセンス情報を ComponentLicense 配列に変換する
 */
function convertLicenses(
  licenseConcluded?: string,
  licenseDeclared?: string,
  licenseInfoFromFiles?: string[]
): ComponentLicense[] {
  const licenses: ComponentLicense[] = [];

  // licenseConcluded を優先
  if (licenseConcluded && licenseConcluded !== 'NOASSERTION' && licenseConcluded !== 'NONE') {
    licenses.push({
      expression: licenseConcluded,
      licenseId: extractSimpleLicenseId(licenseConcluded),
      category: 'unknown', // 後でライセンス分類ロジックで更新される
    });
  } else if (licenseDeclared && licenseDeclared !== 'NOASSERTION' && licenseDeclared !== 'NONE') {
    licenses.push({
      expression: licenseDeclared,
      licenseId: extractSimpleLicenseId(licenseDeclared),
      category: 'unknown',
    });
  }

  // licenseInfoFromFiles から追加のライセンスを抽出
  if (licenseInfoFromFiles && licenseInfoFromFiles.length > 0) {
    licenseInfoFromFiles.forEach((lic) => {
      if (lic !== 'NOASSERTION' && lic !== 'NONE') {
        // 既に追加されていない場合のみ追加
        const exists = licenses.some((l) => l.licenseId === lic || l.expression === lic);
        if (!exists) {
          licenses.push({
            licenseId: lic,
            category: 'unknown',
          });
        }
      }
    });
  }

  // ライセンスが1つもない場合は unknown を追加
  if (licenses.length === 0) {
    licenses.push({
      category: 'unknown',
    });
  }

  return licenses;
}

/**
 * SPDX License Expression から単純なライセンス ID を抽出する
 * 例: "MIT" → "MIT", "MIT OR Apache-2.0" → undefined（複雑な式）
 */
function extractSimpleLicenseId(expression: string): string | undefined {
  // 単純なライセンス ID の場合のみ返す（OR, AND, WITH などを含まない）
  if (!/\s+(OR|AND|WITH)\s+/i.test(expression)) {
    return expression.trim();
  }
  return undefined;
}

/**
 * SPDX Checksum を Hash に変換する
 */
function convertChecksum(checksum: SPDXChecksum): Hash | null {
  if (!checksum.algorithm || !checksum.checksumValue) {
    return null;
  }

  // アルゴリズム名の正規化
  const algorithm = normalizeHashAlgorithm(checksum.algorithm);
  if (!algorithm) {
    return null;
  }

  return {
    algorithm,
    value: checksum.checksumValue,
  };
}

/**
 * ハッシュアルゴリズム名を正規化する
 */
function normalizeHashAlgorithm(algorithm: string): HashAlgorithm | null {
  const normalized = algorithm.toUpperCase().replace(/_/g, '-');

  const validAlgorithms: HashAlgorithm[] = [
    'MD5',
    'SHA-1',
    'SHA-256',
    'SHA-384',
    'SHA-512',
    'SHA3-256',
    'SHA3-384',
    'SHA3-512',
    'BLAKE2b-256',
    'BLAKE2b-384',
    'BLAKE2b-512',
    'BLAKE3',
  ];

  // SHA1 → SHA-1, SHA256 → SHA-256 などの変換
  const mappings: Record<string, HashAlgorithm> = {
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
    'SHA3-256': 'SHA3-256',
    'SHA3-384': 'SHA3-384',
    'SHA3-512': 'SHA3-512',
  };

  const mapped = mappings[normalized] ?? normalized;

  return validAlgorithms.includes(mapped) ? mapped : null;
}

/**
 * SPDX ExternalRef を ExternalRef に変換する
 */
function convertExternalRef(ref: SPDXExternalRef): ExternalRef {
  return {
    category: ref.referenceCategory ?? '',
    type: ref.referenceType ?? '',
    locator: ref.referenceLocator ?? '',
    comment: ref.comment,
  };
}

/**
 * SPDX Supplier/Originator 文字列を OrganizationalEntity に変換する
 * 形式: "Person: John Doe (john@example.com)", "Organization: ACME (info@acme.com)"
 */
function parseOrganizationalEntity(entity?: string): OrganizationalEntity | undefined {
  if (!entity || entity === 'NOASSERTION') {
    return undefined;
  }

  const match = /^(?:Person|Organization):\s*(.+)$/i.exec(entity);
  const content = match ? match[1].trim() : entity;

  // メールアドレスの抽出
  const emailMatch = /\(([^)]+@[^)]+)\)/.exec(content);
  const email = emailMatch ? emailMatch[1] : undefined;
  const name = emailMatch ? content.replace(/\s*\([^)]+\)/, '').trim() : content;

  return { name, email };
}

/**
 * SPDX Relationship を Relationship 配列に変換する
 */
function convertRelationships(
  spdxRelationships: SPDXRelationship[],
  components: Component[]
): Relationship[] {
  // SPDXID → Component.id のマッピングを作成
  const spdxIdToId = new Map<string, string>();
  components.forEach((comp) => {
    if (comp.spdxId) {
      spdxIdToId.set(comp.spdxId, comp.id);
    }
  });

  return spdxRelationships
    .map((rel) => {
      const sourceId = rel.spdxElementId ? spdxIdToId.get(rel.spdxElementId) : undefined;
      const targetId = rel.relatedSpdxElement ? spdxIdToId.get(rel.relatedSpdxElement) : undefined;

      // 両方の ID が解決できた場合のみ関係を追加
      if (sourceId && targetId) {
        const relationship: Relationship = {
          sourceId,
          targetId,
          type: rel.relationshipType ?? '',
        };
        if (rel.comment) {
          relationship.comment = rel.comment;
        }
        return relationship;
      }
      return null;
    })
    .filter((rel): rel is Relationship => rel !== null);
}

/**
 * CONTAINS 関係から親子関係を設定する
 */
function setParentChildRelationships(components: Component[], relationships: Relationship[]): void {
  // Component.id → Component のマッピング
  const idToComponent = new Map<string, Component>();
  components.forEach((comp) => {
    idToComponent.set(comp.id, comp);
  });

  // CONTAINS 関係を処理
  relationships.forEach((rel) => {
    if (rel.type === 'CONTAINS') {
      const child = idToComponent.get(rel.targetId);
      if (child) {
        if (!child.parentIds.includes(rel.sourceId)) {
          child.parentIds.push(rel.sourceId);
        }
      }
    }
  });
}

/**
 * SPDX tag-value 形式をパースする
 */
export function parseSPDXTagValue(tagValueString: string): UnifiedSBOM {
  const lines = tagValueString.split(/\r?\n/);
  const spdxDoc: SPDXDocument = {
    packages: [],
    relationships: [],
    files: [],
  };

  let currentPackage: SPDXPackage | null = null;
  let currentFile: SPDXFile | null = null;
  let multiLineValue = '';
  let multiLineTag = '';

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行やコメントをスキップ
    if (!line || line.startsWith('#')) {
      continue;
    }

    // 複数行テキストの継続（<text>...</text> 形式）
    if (multiLineTag) {
      if (line === '</text>') {
        // 複数行テキストの終了
        setTagValue(spdxDoc, currentPackage, currentFile, multiLineTag, multiLineValue.trim());
        multiLineTag = '';
        multiLineValue = '';
      } else {
        multiLineValue += (multiLineValue ? '\n' : '') + line;
      }
      continue;
    }

    // タグと値の分割
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const tag = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    // 複数行テキストの開始
    if (value === '<text>') {
      multiLineTag = tag;
      multiLineValue = '';
      continue;
    }

    // セクションの判定
    if (tag === 'PackageName') {
      // 新しいパッケージセクション
      if (currentPackage) {
        spdxDoc.packages ??= [];
        spdxDoc.packages.push(currentPackage);
      }
      currentPackage = { name: value };
      currentFile = null;
      continue;
    } else if (tag === 'FileName') {
      // 新しいファイルセクション
      if (currentFile) {
        spdxDoc.files ??= [];
        spdxDoc.files.push(currentFile);
      }
      currentFile = { fileName: value };
      continue;
    }

    // タグと値の設定
    setTagValue(spdxDoc, currentPackage, currentFile, tag, value);
  }

  // 最後のパッケージ/ファイルを追加
  if (currentPackage) {
    spdxDoc.packages ??= [];
    spdxDoc.packages.push(currentPackage);
  }
  if (currentFile) {
    spdxDoc.files ??= [];
    spdxDoc.files.push(currentFile);
  }

  return convertSPDXToUnified(spdxDoc);
}

/**
 * tag-value 形式のタグと値を適切なオブジェクトに設定する
 */
function setTagValue(
  doc: SPDXDocument,
  pkg: SPDXPackage | null,
  file: SPDXFile | null,
  tag: string,
  value: string
): void {
  // Relationship は常にドキュメントレベルで処理
  if (tag === 'Relationship') {
    parseRelationship(doc, value);
    return;
  }

  // ドキュメントレベルのタグ
  if (!pkg && !file) {
    switch (tag) {
      case 'SPDXVersion':
        doc.SPDXVersion = value;
        break;
      case 'DataLicense':
        doc.DataLicense = value;
        break;
      case 'SPDXID':
        doc.SPDXID = value;
        break;
      case 'DocumentName':
        doc.DocumentName = value;
        break;
      case 'DocumentNamespace':
        doc.DocumentNamespace = value;
        break;
      case 'Creator':
        doc.creationInfo ??= {};
        doc.creationInfo.creators ??= [];
        doc.creationInfo.creators.push(value);
        break;
      case 'Created':
        doc.creationInfo ??= {};
        doc.creationInfo.created = value;
        break;
      case 'CreatorComment':
        doc.creationInfo ??= {};
        doc.creationInfo.creatorComment = value;
        break;
      case 'LicenseListVersion':
        doc.creationInfo ??= {};
        doc.creationInfo.licenseListVersion = value;
        break;
      case 'DocumentComment':
        doc.documentComment = value;
        break;
    }
    return;
  }

  // パッケージレベルのタグ
  if (pkg && !file) {
    switch (tag) {
      case 'SPDXID':
        pkg.SPDXID = value;
        break;
      case 'PackageVersion':
        pkg.versionInfo = value;
        break;
      case 'PackageFileName':
        pkg.packageFileName = value;
        break;
      case 'PackageSupplier':
        pkg.supplier = value;
        break;
      case 'PackageOriginator':
        pkg.originator = value;
        break;
      case 'PackageDownloadLocation':
        pkg.downloadLocation = value;
        break;
      case 'FilesAnalyzed':
        pkg.filesAnalyzed = value.toLowerCase() === 'true';
        break;
      case 'PackageVerificationCode':
        pkg.packageVerificationCode ??= {};
        pkg.packageVerificationCode.packageVerificationCodeValue = value;
        break;
      case 'PackageChecksum':
        parseChecksum(pkg, value);
        break;
      case 'PackageHomePage':
        pkg.homepage = value;
        break;
      case 'PackageSourceInfo':
        pkg.sourceInfo = value;
        break;
      case 'PackageLicenseConcluded':
        pkg.licenseConcluded = value;
        break;
      case 'PackageLicenseInfoFromFiles':
        pkg.licenseInfoFromFiles ??= [];
        pkg.licenseInfoFromFiles.push(value);
        break;
      case 'PackageLicenseDeclared':
        pkg.licenseDeclared = value;
        break;
      case 'PackageLicenseComments':
        pkg.licenseComments = value;
        break;
      case 'PackageCopyrightText':
        pkg.copyrightText = value;
        break;
      case 'PackageSummary':
        pkg.summary = value;
        break;
      case 'PackageDescription':
        pkg.description = value;
        break;
      case 'PackageComment':
        pkg.comment = value;
        break;
      case 'ExternalRef':
        parseExternalRef(pkg, value);
        break;
      case 'PackageAttributionText':
        pkg.attributionTexts ??= [];
        pkg.attributionTexts.push(value);
        break;
      case 'PrimaryPackagePurpose':
        pkg.primaryPackagePurpose = value as SPDXPackagePurpose;
        break;
      case 'ReleaseDate':
        pkg.releaseDate = value;
        break;
      case 'BuiltDate':
        pkg.builtDate = value;
        break;
      case 'ValidUntilDate':
        pkg.validUntilDate = value;
        break;
    }
    return;
  }

  // ファイルレベルのタグ
  if (file) {
    switch (tag) {
      case 'SPDXID':
        file.SPDXID = value;
        break;
      case 'FileChecksum':
        parseFileChecksum(file, value);
        break;
      case 'LicenseConcluded':
        file.licenseConcluded = value;
        break;
      case 'LicenseInfoInFile':
        file.licenseInfoInFiles ??= [];
        file.licenseInfoInFiles.push(value);
        break;
      case 'FileCopyrightText':
        file.copyrightText = value;
        break;
      case 'FileComment':
        file.comment = value;
        break;
      case 'FileType':
        file.fileTypes ??= [];
        file.fileTypes.push(value);
        break;
      case 'FileNotice':
        file.noticeText = value;
        break;
      case 'FileContributor':
        file.fileContributors ??= [];
        file.fileContributors.push(value);
        break;
      case 'FileAttributionText':
        file.attributionTexts ??= [];
        file.attributionTexts.push(value);
        break;
    }
  }
}

/**
 * Relationship タグの値をパースする
 * 形式: "SPDXRef-A RELATIONSHIP_TYPE SPDXRef-B"
 */
function parseRelationship(doc: SPDXDocument, value: string): void {
  const parts = value.split(/\s+/);
  if (parts.length >= 3) {
    doc.relationships ??= [];
    doc.relationships.push({
      spdxElementId: parts[0],
      relationshipType: parts[1],
      relatedSpdxElement: parts[2],
    });
  }
}

/**
 * PackageChecksum タグの値をパースする
 * 形式: "SHA1: abc123..."
 */
function parseChecksum(pkg: SPDXPackage, value: string): void {
  const colonIndex = value.indexOf(':');
  if (colonIndex !== -1) {
    const algorithm = value.substring(0, colonIndex).trim();
    const checksumValue = value.substring(colonIndex + 1).trim();
    pkg.checksums ??= [];
    pkg.checksums.push({ algorithm, checksumValue });
  }
}

/**
 * FileChecksum タグの値をパースする
 * 形式: "SHA1: abc123..."
 */
function parseFileChecksum(file: SPDXFile, value: string): void {
  const colonIndex = value.indexOf(':');
  if (colonIndex !== -1) {
    const algorithm = value.substring(0, colonIndex).trim();
    const checksumValue = value.substring(colonIndex + 1).trim();
    file.checksums ??= [];
    file.checksums.push({ algorithm, checksumValue });
  }
}

/**
 * ExternalRef タグの値をパースする
 * 形式: "CATEGORY TYPE LOCATOR"
 */
function parseExternalRef(pkg: SPDXPackage, value: string): void {
  const parts = value.split(/\s+/);
  if (parts.length >= 3) {
    pkg.externalRefs ??= [];
    pkg.externalRefs.push({
      referenceCategory: parts[0],
      referenceType: parts[1],
      referenceLocator: parts.slice(2).join(' '),
    });
  }
}

/**
 * SPDX YAML 形式をパースする
 */
export function parseSPDXYAML(yamlString: string): UnifiedSBOM {
  try {
    const spdxDoc = yaml.load(yamlString) as SPDXDocument;
    return convertSPDXToUnified(spdxDoc);
  } catch (error) {
    throw new Error(
      `Failed to parse SPDX YAML: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
