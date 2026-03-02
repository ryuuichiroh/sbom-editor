/**
 * 型定義の統一エクスポート
 */

// 統一データモデル
export type {
  UnifiedSBOM,
  SBOMMetadata,
  Creator,
  Component,
  ComponentType,
  SPDXPackagePurpose,
  CycloneDXScope,
  ComponentLicense,
  LicenseCategory,
  Relationship,
  Hash,
  HashAlgorithm,
  ExternalRef,
  OrganizationalEntity,
  Property,
  BomLicense,
  SWID,
  Pedigree,
  ReleaseNotes,
} from './unified';

// 設定ファイル型
export type {
  FieldRequirementsConfig,
  FieldRequirement,
  CustomAttributesConfig,
  CustomAttributeDefinition,
} from './config';
