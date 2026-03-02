/**
 * 統一データモデル型定義
 * SPDX 2.3 と CycloneDX 1.4 の両フォーマットを統一的に扱うための型定義
 */

/**
 * SBOM ドキュメント全体
 */
export interface UnifiedSBOM {
  format: 'spdx' | 'cyclonedx';
  /** SPDX: "SPDX-2.3" / CycloneDX: "1.4" */
  specVersion: string;
  metadata: SBOMMetadata;
  components: Component[];
  /** SPDX: Relationship / CycloneDX: dependencies */
  relationships: Relationship[];
  /** パース時に保持する元データ（エクスポート時の情報損失防止） */
  rawSource?: unknown;
}

/**
 * ドキュメントメタデータ
 */
export interface SBOMMetadata {
  // 共通
  /** SPDX: DocumentName / CycloneDX: metadata.component.name */
  name: string;
  /** SPDX: DocumentNamespace / CycloneDX: serialNumber */
  namespace?: string;
  /** ISO 8601 */
  created?: string;
  /** SPDX: Creator / CycloneDX: metadata.tools + metadata.authors */
  creators: Creator[];
  comment?: string;

  // SPDX 固有
  /** 固定値 "SPDXRef-DOCUMENT" */
  spdxId?: string;
  /** 固定値 "CC0-1.0" */
  dataLicense?: string;
  licenseListVersion?: string;

  // CycloneDX 固有
  /** URN UUID */
  serialNumber?: string;
  /** デフォルト 1 */
  bomVersion?: number;
  supplier?: OrganizationalEntity;
  licenses?: BomLicense[];
  properties?: Property[];
}

export interface Creator {
  type: 'person' | 'organization' | 'tool';
  name: string;
  email?: string;
  /** ツールのバージョン */
  version?: string;
}

/**
 * コンポーネント（パッケージ）
 */
export interface Component {
  // 共通
  /** 内部管理用 UUID */
  id: string;
  name: string;
  version?: string;
  /**
   * CycloneDX の type に対応。
   * SPDX には対応する必須フィールドがないため、PrimaryPackagePurpose から変換するか
   * インポート時にデフォルト値 'library' を設定する。
   */
  type: ComponentType;
  /** 複数ライセンスに対応 */
  licenses: ComponentLicense[];
  copyrightText?: string;
  description?: string;
  supplier?: OrganizationalEntity;
  hashes: Hash[];
  externalRefs: ExternalRef[];
  /**
   * ユーザーが追加したカスタム属性（標準仕様外）。
   * - CycloneDX エクスポート: properties に出力（string[] は同名エントリを複数展開）
   * - SPDX エクスポート: ExternalRef (OTHER カテゴリ) またはコメントフィールドに格納
   * CycloneDX 標準の properties（元データ）は cdxProperties に分離して保持する。
   */
  customAttributes: Property[];

  // 関係性（UI 操作用、実体は UnifiedSBOM.relationships に保持）
  /** 親コンポーネントの id（複数親に対応） */
  parentIds: string[];

  // SPDX 固有
  /** "SPDXRef-xxx" */
  spdxId?: string;
  /** NONE / NOASSERTION / URL */
  downloadLocation?: string;
  filesAnalyzed?: boolean;
  verificationCode?: string;
  originator?: OrganizationalEntity;
  sourceInfo?: string;
  /** SPDX License Expression */
  licenseConcluded?: string;
  /** SPDX License Expression */
  licenseDeclared?: string;
  licenseInfoFromFiles?: string[];
  licenseComments?: string;
  summary?: string;
  packageComment?: string;
  attributionTexts?: string[];
  /**
   * SPDX の任意属性。ComponentType とは独立して保持する。
   * インポート時に ComponentType へのマッピングには使用するが、
   * エクスポート時はこのフィールドをそのまま出力する。
   */
  primaryPackagePurpose?: SPDXPackagePurpose;
  releaseDate?: string;
  builtDate?: string;
  validUntilDate?: string;

  // CycloneDX 固有
  bomRef?: string;
  /** ネームスペース（例: org.apache.commons） */
  group?: string;
  /** Package URL */
  purl?: string;
  /** CPE 2.2 or 2.3 */
  cpe?: string;
  scope?: CycloneDXScope;
  author?: string;
  publisher?: string;
  /** アセンブリ（子コンポーネントの bomRef 一覧）。依存関係とは別概念。 */
  assemblyComponents?: string[];
  releaseNotes?: ReleaseNotes;
  /**
   * CycloneDX 元データの properties をそのまま保持するフィールド。
   * customAttributes とは別管理とし、エクスポート時に customAttributes と
   * マージして出力する（customAttributes が優先）。
   */
  cdxProperties?: Property[];
  swid?: SWID;
  pedigree?: Pedigree;
}

export type ComponentType =
  | 'application'
  | 'framework'
  | 'library'
  | 'container'
  | 'operating-system'
  | 'device'
  | 'firmware'
  | 'file'
  | 'other';

/**
 * SPDX PrimaryPackagePurpose の値。ComponentType とは独立した概念。
 * - ComponentType は CycloneDX の必須フィールドであり、UI 上の主要な分類に使用する。
 * - SPDXPackagePurpose は SPDX の任意フィールドであり、SPDX エクスポート時にそのまま出力する。
 */
export type SPDXPackagePurpose =
  | 'APPLICATION'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'CONTAINER'
  | 'OPERATING-SYSTEM'
  | 'DEVICE'
  | 'FIRMWARE'
  | 'SOURCE'
  | 'ARCHIVE'
  | 'FILE'
  | 'INSTALL'
  | 'OTHER';

export type CycloneDXScope = 'required' | 'optional' | 'excluded';

/**
 * ライセンス情報（コンポーネントに複数付与可能）
 */
export interface ComponentLicense {
  /** SPDX License Expression (例: "MIT OR Apache-2.0") */
  expression?: string;
  /** SPDX License ID (例: "MIT") */
  licenseId?: string;
  /** カスタムライセンス名 */
  licenseName?: string;
  url?: string;
  text?: string;
  /** UI 表示用に解決されたカテゴリ（ライセンス分類ロジックで付与） */
  category: LicenseCategory;
}

/**
 * ライセンスカテゴリ。
 * 分類ロジックは src/utils/licenseClassifier.ts で管理する。
 */
export type LicenseCategory =
  | 'copyleft' // GPL-2.0, GPL-3.0, AGPL-3.0 など
  | 'weak-copyleft' // LGPL-2.1, MPL-2.0, EUPL-1.2 など
  | 'permissive' // MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause など
  | 'proprietary' // 商用ライセンス
  | 'other' // 上記に分類しにくい特殊なもの
  | 'unknown'; // 不明・未分類（NOASSERTION / NONE を含む）

/**
 * コンポーネント間の関係
 */
export interface Relationship {
  /** Component.id */
  sourceId: string;
  /** Component.id */
  targetId: string;
  /**
   * SPDX: DESCRIBES, CONTAINS, DEPENDS_ON, GENERATED_FROM など
   * CycloneDX: "dependsOn"（dependencies セクション）
   */
  type: string;
  comment?: string;
}

/**
 * ハッシュ値
 */
export interface Hash {
  algorithm: HashAlgorithm;
  value: string;
}

export type HashAlgorithm =
  | 'MD5'
  | 'SHA-1'
  | 'SHA-256'
  | 'SHA-384'
  | 'SHA-512'
  | 'SHA3-256'
  | 'SHA3-384'
  | 'SHA3-512'
  | 'BLAKE2b-256'
  | 'BLAKE2b-384'
  | 'BLAKE2b-512'
  | 'BLAKE3';

/**
 * 外部参照
 */
export interface ExternalRef {
  /** SPDX: SECURITY / PACKAGE-MANAGER / PERSISTENT-ID / OTHER */
  category: string;
  /** cpe23Type, purl, swh など */
  type: string;
  locator: string;
  comment?: string;
}

/**
 * 組織・個人エンティティ
 */
export interface OrganizationalEntity {
  name: string;
  email?: string;
  url?: string[];
}

/**
 * カスタムプロパティ / 標準プロパティ共通型。
 * valueType により UI の入力コントロールが切り替わる。
 */
export interface Property {
  name: string;
  value: string | string[];
  valueType: 'string' | 'string[]';
}

/**
 * BOM レベルのライセンス（CycloneDX metadata.licenses）
 */
export interface BomLicense {
  expression?: string;
  licenseId?: string;
  licenseName?: string;
}

/**
 * SWID タグ（CycloneDX）
 */
export interface SWID {
  tagId: string;
  name: string;
  version?: string;
  tagVersion?: number;
  patch?: boolean;
}

/**
 * 来歴情報（CycloneDX pedigree）
 */
export interface Pedigree {
  ancestors?: Component[];
  descendants?: Component[];
  notes?: string;
}

/**
 * リリースノート（CycloneDX releaseNotes）
 */
export interface ReleaseNotes {
  type: string;
  title?: string;
  description?: string;
  timestamp?: string;
}
