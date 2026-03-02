/**
 * バリデーションカスタムフック
 * コンポーネントのバリデーション状態を管理する
 */

import { useMemo } from 'react';
import { useConfig } from '../store/configStore';
import { useSBOM } from '../store/sbomStore';
import {
  validateComponent,
  validateMetadata,
  type ValidationError,
  type ComponentValidationResult,
  type MetadataValidationResult,
} from '../services/validator/fieldValidator';
import type { Component } from '../types/unified';

/**
 * コンポーネントのバリデーション結果を取得するフック
 */
export function useComponentValidation(component: Component): ComponentValidationResult {
  const { state: sbomState } = useSBOM();
  const { state: configState } = useConfig();

  return useMemo(() => {
    if (!sbomState.sbom) {
      return {
        componentId: component.id,
        errors: [],
        isValid: true,
      };
    }

    return validateComponent(
      component,
      sbomState.sbom.format,
      configState.fieldRequirements,
      configState.customAttributes
    );
  }, [component, sbomState.sbom, configState.fieldRequirements, configState.customAttributes]);
}

/**
 * メタデータのバリデーション結果を取得するフック
 */
export function useMetadataValidation(): MetadataValidationResult {
  const { state: sbomState } = useSBOM();
  const { state: configState } = useConfig();

  return useMemo(() => {
    if (!sbomState.sbom) {
      return {
        errors: [],
        isValid: true,
      };
    }

    return validateMetadata(sbomState.sbom, configState.fieldRequirements);
  }, [sbomState.sbom, configState.fieldRequirements]);
}

/**
 * 特定のフィールドのバリデーションエラーを取得するヘルパー関数
 */
export function getFieldError(
  errors: ValidationError[],
  fieldName: string
): ValidationError | undefined {
  return errors.find((error) => error.field === fieldName);
}

/**
 * フィールドにエラーがあるかチェックするヘルパー関数
 */
export function hasFieldError(errors: ValidationError[], fieldName: string): boolean {
  return errors.some((error) => error.field === fieldName);
}
