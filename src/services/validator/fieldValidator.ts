/**
 * フィールドバリデーター
 * field-requirements.json と custom-attributes.json に基づくバリデーションを実装
 */

import type { Component, SBOMMetadata, UnifiedSBOM } from '../../types/unified';
import type { FieldRequirementsConfig, CustomAttributesConfig } from '../../types/config';

/**
 * バリデーションエラー
 */
export interface ValidationError {
  /** エラーが発生したフィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** エラーの種類 */
  type: 'required' | 'custom';
}

/**
 * コンポーネントバリデーション結果
 */
export interface ComponentValidationResult {
  /** コンポーネント ID */
  componentId: string;
  /** バリデーションエラー一覧 */
  errors: ValidationError[];
  /** バリデーション成功フラグ */
  isValid: boolean;
}

/**
 * メタデータバリデーション結果
 */
export interface MetadataValidationResult {
  /** バリデーションエラー一覧 */
  errors: ValidationError[];
  /** バリデーション成功フラグ */
  isValid: boolean;
}

/**
 * SBOM 全体のバリデーション結果
 */
export interface SBOMValidationResult {
  /** メタデータのバリデーション結果 */
  metadata: MetadataValidationResult;
  /** コンポーネントごとのバリデーション結果 */
  components: ComponentValidationResult[];
  /** SBOM 全体のバリデーション成功フラグ */
  isValid: boolean;
}

/**
 * 値が空かどうかをチェック
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

/**
 * メタデータのバリデーション（SPDX）
 */
function validateSPDXMetadata(
  metadata: SBOMMetadata,
  config: FieldRequirementsConfig | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = config?.spdx.document ?? {};

  // 仕様必須フィールドのチェック
  const specRequiredFields = [
    { field: 'spdxId', value: metadata.spdxId, label: 'SPDXID' },
    { field: 'dataLicense', value: metadata.dataLicense, label: 'DataLicense' },
    { field: 'name', value: metadata.name, label: 'DocumentName' },
    { field: 'namespace', value: metadata.namespace, label: 'DocumentNamespace' },
    { field: 'creators', value: metadata.creators, label: 'Creator' },
    { field: 'created', value: metadata.created, label: 'Created' },
  ];

  for (const { field, value, label } of specRequiredFields) {
    if (isEmpty(value)) {
      const requirement = requirements[label];
      const message = requirement?.errorMessage ?? `${label} は必須です`;
      errors.push({ field, message, type: 'required' });
    }
  }

  // ポリシー必須フィールドのチェック
  if (config) {
    for (const [fieldName, requirement] of Object.entries(requirements)) {
      if (!requirement.required || requirement.specRequired) {
        continue;
      }

      const fieldMap: Record<string, unknown> = {
        CreatorComment: metadata.comment,
        DocumentComment: metadata.comment,
        LicenseListVersion: metadata.licenseListVersion,
      };

      const value = fieldMap[fieldName];
      if (isEmpty(value)) {
        const message = requirement.errorMessage ?? `${requirement.label ?? fieldName} は必須です`;
        errors.push({ field: fieldName, message, type: 'required' });
      }
    }
  }

  return errors;
}

/**
 * メタデータのバリデーション（CycloneDX）
 */
function validateCycloneDXMetadata(
  metadata: SBOMMetadata,
  config: FieldRequirementsConfig | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = config?.cyclonedx.metadata ?? {};

  // 仕様必須フィールドのチェック（bomFormat と specVersion は UnifiedSBOM レベルで保証）
  // metadata レベルでは特に仕様必須フィールドはない

  // ポリシー必須フィールドのチェック
  if (config) {
    for (const [fieldName, requirement] of Object.entries(requirements)) {
      if (!requirement.required) {
        continue;
      }

      const fieldMap: Record<string, unknown> = {
        serialNumber: metadata.serialNumber,
        version: metadata.bomVersion,
        timestamp: metadata.created,
        tools: metadata.creators.filter((c) => c.type === 'tool'),
        authors: metadata.creators.filter((c) => c.type === 'person' || c.type === 'organization'),
        supplier: metadata.supplier,
      };

      const value = fieldMap[fieldName];
      if (isEmpty(value)) {
        const message = requirement.errorMessage ?? `${requirement.label ?? fieldName} は必須です`;
        errors.push({ field: fieldName, message, type: 'required' });
      }
    }
  }

  return errors;
}

/**
 * メタデータのバリデーション
 */
export function validateMetadata(
  sbom: UnifiedSBOM,
  config: FieldRequirementsConfig | null
): MetadataValidationResult {
  const errors =
    sbom.format === 'spdx'
      ? validateSPDXMetadata(sbom.metadata, config)
      : validateCycloneDXMetadata(sbom.metadata, config);

  return {
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * コンポーネントのバリデーション（SPDX）
 */
function validateSPDXComponent(
  component: Component,
  config: FieldRequirementsConfig | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = config?.spdx.package ?? {};

  // 仕様必須フィールドのチェック
  const specRequiredFields = [
    { field: 'name', value: component.name, label: 'PackageName' },
    { field: 'spdxId', value: component.spdxId, label: 'SPDXID' },
    {
      field: 'downloadLocation',
      value: component.downloadLocation,
      label: 'PackageDownloadLocation',
    },
  ];

  for (const { field, value, label } of specRequiredFields) {
    if (isEmpty(value)) {
      const requirement = requirements[label];
      const message = requirement?.errorMessage ?? `${label} は必須です`;
      errors.push({ field, message, type: 'required' });
    }
  }

  // ポリシー必須フィールドのチェック
  if (config) {
    for (const [fieldName, requirement] of Object.entries(requirements)) {
      if (!requirement.required || requirement.specRequired) {
        continue;
      }

      const fieldMap: Record<string, unknown> = {
        PackageVersion: component.version,
        PackageSupplier: component.supplier,
        PackageLicenseConcluded: component.licenseConcluded,
        PackageLicenseDeclared: component.licenseDeclared,
        PackageCopyrightText: component.copyrightText,
        PackageChecksum: component.hashes,
        ExternalRef: component.externalRefs,
        PrimaryPackagePurpose: component.primaryPackagePurpose,
      };

      const value = fieldMap[fieldName];
      if (isEmpty(value)) {
        const message = requirement.errorMessage ?? `${requirement.label ?? fieldName} は必須です`;
        errors.push({ field: fieldName, message, type: 'required' });
      }
    }
  }

  return errors;
}

/**
 * コンポーネントのバリデーション（CycloneDX）
 */
function validateCycloneDXComponent(
  component: Component,
  config: FieldRequirementsConfig | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = config?.cyclonedx.component ?? {};

  // 仕様必須フィールドのチェック
  const specRequiredFields = [
    { field: 'type', value: component.type, label: 'type' },
    { field: 'name', value: component.name, label: 'name' },
  ];

  for (const { field, value, label } of specRequiredFields) {
    if (isEmpty(value)) {
      const requirement = requirements[label];
      const message = requirement?.errorMessage ?? `${label} は必須です`;
      errors.push({ field, message, type: 'required' });
    }
  }

  // ポリシー必須フィールドのチェック
  if (config) {
    for (const [fieldName, requirement] of Object.entries(requirements)) {
      if (!requirement.required || requirement.specRequired) {
        continue;
      }

      const fieldMap: Record<string, unknown> = {
        'bom-ref': component.bomRef,
        version: component.version,
        group: component.group,
        purl: component.purl,
        cpe: component.cpe,
        licenses: component.licenses,
        hashes: component.hashes,
        supplier: component.supplier,
        description: component.description,
        scope: component.scope,
        externalReferences: component.externalRefs,
      };

      const value = fieldMap[fieldName];
      if (isEmpty(value)) {
        const message = requirement.errorMessage ?? `${requirement.label ?? fieldName} は必須です`;
        errors.push({ field: fieldName, message, type: 'required' });
      }
    }
  }

  return errors;
}

/**
 * カスタム属性のバリデーション
 */
function validateCustomAttributes(
  component: Component,
  customAttributesConfig: CustomAttributesConfig | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!customAttributesConfig) {
    return errors;
  }

  // 必須カスタム属性のチェック
  for (const attrDef of customAttributesConfig.attributes) {
    if (!attrDef.required) {
      continue;
    }

    // applicableTo が指定されている場合は、コンポーネントタイプをチェック
    if (attrDef.applicableTo && !attrDef.applicableTo.includes(component.type)) {
      continue;
    }

    // カスタム属性に該当する属性が存在するかチェック
    const attr = (component.customAttributes ?? []).find((a) => a.name === attrDef.name);

    if (!attr || isEmpty(attr.value)) {
      const message = attrDef.errorMessage ?? `${attrDef.label ?? attrDef.name} は必須です`;
      errors.push({ field: attrDef.name, message, type: 'custom' });
    }
  }

  return errors;
}

/**
 * コンポーネントのバリデーション
 */
export function validateComponent(
  component: Component,
  format: 'spdx' | 'cyclonedx',
  fieldRequirementsConfig: FieldRequirementsConfig | null,
  customAttributesConfig: CustomAttributesConfig | null
): ComponentValidationResult {
  const fieldErrors =
    format === 'spdx'
      ? validateSPDXComponent(component, fieldRequirementsConfig)
      : validateCycloneDXComponent(component, fieldRequirementsConfig);

  const customErrors = validateCustomAttributes(component, customAttributesConfig);

  const errors = [...fieldErrors, ...customErrors];

  return {
    componentId: component.id,
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * SBOM 全体のバリデーション
 */
export function validateSBOM(
  sbom: UnifiedSBOM,
  fieldRequirementsConfig: FieldRequirementsConfig | null,
  customAttributesConfig: CustomAttributesConfig | null
): SBOMValidationResult {
  const metadata = validateMetadata(sbom, fieldRequirementsConfig);

  const components = sbom.components.map((component) =>
    validateComponent(component, sbom.format, fieldRequirementsConfig, customAttributesConfig)
  );

  const isValid = metadata.isValid && components.every((c) => c.isValid);

  return {
    metadata,
    components,
    isValid,
  };
}
