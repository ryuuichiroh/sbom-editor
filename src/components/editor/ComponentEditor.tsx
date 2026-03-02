/**
 * コンポーネントエディタ
 * タブ構成: 基本情報 / ライセンス / 関係 / カスタム属性
 */

import { useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
  Button,
  IconButton,
  Chip,
  Autocomplete,
  Alert,
  AlertTitle,
  FormHelperText,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useSBOM } from '../../store/sbomStore';
import {
  detectCircularReferenceMultiple,
  formatCircularPath,
  createRelationshipsFromParents,
} from '../../utils/relationshipUtils';
import { CustomAttributeEditor } from './CustomAttributeEditor';
import { useComponentValidation, getFieldError } from '../../hooks/useValidation';
import type {
  Component,
  ComponentType,
  SPDXPackagePurpose,
  CycloneDXScope,
  ComponentLicense,
  Hash,
  HashAlgorithm,
} from '../../types/unified';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = memo(({ children, value, index }: TabPanelProps) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
});

const componentTypes: ComponentType[] = [
  'application',
  'framework',
  'library',
  'container',
  'operating-system',
  'device',
  'firmware',
  'file',
  'other',
];

const spdxPackagePurposes: SPDXPackagePurpose[] = [
  'APPLICATION',
  'FRAMEWORK',
  'LIBRARY',
  'CONTAINER',
  'OPERATING-SYSTEM',
  'DEVICE',
  'FIRMWARE',
  'SOURCE',
  'ARCHIVE',
  'FILE',
  'INSTALL',
  'OTHER',
];

const cycloneDXScopes: CycloneDXScope[] = ['required', 'optional', 'excluded'];

const hashAlgorithms: HashAlgorithm[] = [
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

/**
 * 関係タブコンポーネント
 */
interface RelationshipTabProps {
  component: Component;
}

const RelationshipTab = memo(({ component }: RelationshipTabProps) => {
  const { state, dispatch } = useSBOM();
  const [circularWarning, setCircularWarning] = useState<string | null>(null);

  // 選択可能な親コンポーネント（自分自身を除く）
  const availableParents = useMemo(() => {
    if (!state.sbom) return [];
    return state.sbom.components.filter((c) => c.id !== component.id);
  }, [state.sbom, component.id]);

  // 現在選択されている親コンポーネント
  const selectedParents = useMemo(() => {
    return availableParents.filter((c) => component.parentIds.includes(c.id));
  }, [availableParents, component.parentIds]);

  const handleParentChange = useCallback(
    (_event: React.SyntheticEvent, newValue: Component[]) => {
      if (!state.sbom) return;

      const newParentIds = newValue.map((c) => c.id);

      // 循環参照チェック
      const circularResult = detectCircularReferenceMultiple(
        component.id,
        newParentIds,
        state.sbom.components
      );

      if (circularResult.hasCircular) {
        const pathStr = formatCircularPath(circularResult.path ?? [], state.sbom.components);
        setCircularWarning(`循環参照が検出されました: ${pathStr}`);
        return;
      }

      // 循環参照がない場合は警告をクリア
      setCircularWarning(null);

      // parentIds を更新
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: component.id,
          updates: { parentIds: newParentIds },
        },
      });

      // Relationship エンティティを更新
      if (state.sbom) {
        // 既存の DEPENDS_ON 関係を削除
        const filteredRelationships = state.sbom.relationships.filter(
          (r) => !(r.sourceId === component.id && r.type === 'DEPENDS_ON')
        );

        // 新しい関係を作成
        const newRelationships = createRelationshipsFromParents(component.id, newParentIds);

        // 全ての関係を更新（既存の関係を削除して新しい関係を追加）
        dispatch({
          type: 'UPDATE_RELATIONSHIPS',
          payload: [...filteredRelationships, ...newRelationships],
        });
      }
    },
    [state.sbom, component.id, dispatch]
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          親コンポーネント
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          このコンポーネントが依存する親コンポーネントを選択してください（複数選択可）
        </Typography>

        {circularWarning && (
          <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
            {circularWarning}
          </Alert>
        )}

        <Autocomplete
          multiple
          options={availableParents}
          value={selectedParents}
          onChange={handleParentChange}
          getOptionLabel={(option) => `${option.name} ${option.version ?? ''}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} label="親コンポーネント" placeholder="選択してください" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={`${option.name} ${option.version ?? ''}`}
                {...getTagProps({ index })}
                key={option.id}
              />
            ))
          }
        />
      </Box>

      {selectedParents.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            選択中の親コンポーネント ({selectedParents.length})
          </Typography>
          <Stack spacing={1}>
            {selectedParents.map((parent) => (
              <Paper key={parent.id} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2">
                  <strong>{parent.name}</strong> {parent.version && `v${parent.version}`}
                </Typography>
                {parent.description && (
                  <Typography variant="caption" color="text.secondary">
                    {parent.description}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {selectedParents.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          親コンポーネントが選択されていません
        </Typography>
      )}
    </Stack>
  );
});

export const ComponentEditor = () => {
  const { state, dispatch } = useSBOM();
  const [tabValue, setTabValue] = useState(0);

  const selectedComponent = state.sbom?.components.find((c) => c.id === state.selectedComponentId);

  // バリデーション結果を取得
  const validationResult = useComponentValidation(selectedComponent ?? ({} as Component));

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof Component, value: unknown) => {
      if (!selectedComponent) return;
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: selectedComponent.id,
          updates: { [field]: value },
        },
      });
    },
    [dispatch, selectedComponent]
  );

  const handleHashAdd = () => {
    if (!selectedComponent) return;
    const newHash: Hash = { algorithm: 'SHA-256', value: '' };
    handleFieldChange('hashes', [...selectedComponent.hashes, newHash]);
  };

  const handleHashChange = (index: number, field: keyof Hash, value: string) => {
    if (!selectedComponent) return;
    const updatedHashes = [...selectedComponent.hashes];
    updatedHashes[index] = { ...updatedHashes[index], [field]: value };
    handleFieldChange('hashes', updatedHashes);
  };

  const handleHashDelete = (index: number) => {
    if (!selectedComponent) return;
    const updatedHashes = selectedComponent.hashes.filter((_, i) => i !== index);
    handleFieldChange('hashes', updatedHashes);
  };

  const handleLicenseAdd = () => {
    if (!selectedComponent) return;
    const newLicense: ComponentLicense = {
      category: 'unknown',
    };
    handleFieldChange('licenses', [...selectedComponent.licenses, newLicense]);
  };

  const handleLicenseChange = (index: number, field: keyof ComponentLicense, value: string) => {
    if (!selectedComponent) return;
    const updatedLicenses = [...selectedComponent.licenses];
    updatedLicenses[index] = { ...updatedLicenses[index], [field]: value };
    handleFieldChange('licenses', updatedLicenses);
  };

  const handleLicenseDelete = (index: number) => {
    if (!selectedComponent) return;
    const updatedLicenses = selectedComponent.licenses.filter((_, i) => i !== index);
    handleFieldChange('licenses', updatedLicenses);
  };

  if (!selectedComponent) {
    return (
      <Paper
        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography variant="body1" color="text.secondary">
          コンポーネントを選択してください
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="基本情報" />
          <Tab label="ライセンス" />
          <Tab label="関係" />
          <Tab label="カスタム属性" />
        </Tabs>
      </Box>

      {/* バリデーションエラーサマリー */}
      {!validationResult.isValid && (
        <Alert severity="error" sx={{ m: { xs: 1, sm: 2 } }}>
          <AlertTitle>
            {validationResult.errors.length} 件のバリデーションエラーがあります
          </AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {validationResult.errors.map((error, index) => (
              <li key={index}>
                <Typography variant="body2">
                  <strong>{error.field}</strong>: {error.message}
                </Typography>
              </li>
            ))}
          </Box>
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* 基本情報タブ */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            {/* 共通属性 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                共通属性
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <TextField
                    label="名前"
                    value={selectedComponent.name}
                    onChange={(e) => {
                      handleFieldChange('name', e.target.value);
                    }}
                    required
                    fullWidth
                    error={!!getFieldError(validationResult.errors, 'name')}
                  />
                  {getFieldError(validationResult.errors, 'name') && (
                    <FormHelperText error>
                      {getFieldError(validationResult.errors, 'name')?.message}
                    </FormHelperText>
                  )}
                </Box>
                <Box>
                  <TextField
                    label="バージョン"
                    value={selectedComponent.version ?? ''}
                    onChange={(e) => {
                      handleFieldChange('version', e.target.value);
                    }}
                    fullWidth
                    error={
                      !!getFieldError(validationResult.errors, 'version') ||
                      !!getFieldError(validationResult.errors, 'PackageVersion')
                    }
                  />
                  {(getFieldError(validationResult.errors, 'version') ??
                    getFieldError(validationResult.errors, 'PackageVersion')) && (
                      <FormHelperText error>
                        {getFieldError(validationResult.errors, 'version')?.message ??
                          getFieldError(validationResult.errors, 'PackageVersion')?.message}
                      </FormHelperText>
                    )}
                </Box>
                <Box>
                  <TextField
                    select
                    label="タイプ"
                    value={selectedComponent.type}
                    onChange={(e) => {
                      handleFieldChange('type', e.target.value as ComponentType);
                    }}
                    required
                    fullWidth
                    error={!!getFieldError(validationResult.errors, 'type')}
                  >
                    {componentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  {getFieldError(validationResult.errors, 'type') && (
                    <FormHelperText error>
                      {getFieldError(validationResult.errors, 'type')?.message}
                    </FormHelperText>
                  )}
                </Box>
                <TextField
                  label="説明"
                  value={selectedComponent.description ?? ''}
                  onChange={(e) => {
                    handleFieldChange('description', e.target.value);
                  }}
                  multiline
                  rows={3}
                  fullWidth
                />
                <TextField
                  label="著作権情報"
                  value={selectedComponent.copyrightText ?? ''}
                  onChange={(e) => {
                    handleFieldChange('copyrightText', e.target.value);
                  }}
                  multiline
                  rows={2}
                  fullWidth
                />
              </Stack>
            </Box>

            <Divider />

            {/* ハッシュ値 */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">ハッシュ値</Typography>
                <Button startIcon={<AddIcon />} onClick={handleHashAdd} size="small">
                  追加
                </Button>
              </Stack>
              <Stack spacing={2}>
                {selectedComponent.hashes.map((hash, index) => (
                  <Stack
                    key={index}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    <TextField
                      select
                      label="アルゴリズム"
                      value={hash.algorithm}
                      onChange={(e) => {
                        handleHashChange(index, 'algorithm', e.target.value as HashAlgorithm);
                      }}
                      sx={{ width: { xs: '100%', sm: 200 } }}
                    >
                      {hashAlgorithms.map((algo) => (
                        <MenuItem key={algo} value={algo}>
                          {algo}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="値"
                      value={hash.value}
                      onChange={(e) => {
                        handleHashChange(index, 'value', e.target.value);
                      }}
                      fullWidth
                    />
                    <IconButton
                      onClick={() => {
                        handleHashDelete(index);
                      }}
                      color="error"
                      sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* SPDX 固有属性 */}
            {state.sbom?.format === 'spdx' && (
              <>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    SPDX 固有属性
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <TextField
                        label="SPDX ID"
                        value={selectedComponent.spdxId ?? ''}
                        onChange={(e) => {
                          handleFieldChange('spdxId', e.target.value);
                        }}
                        placeholder="SPDXRef-xxx"
                        fullWidth
                        required
                        error={
                          !!getFieldError(validationResult.errors, 'spdxId') ||
                          !!getFieldError(validationResult.errors, 'SPDXID')
                        }
                      />
                      {(getFieldError(validationResult.errors, 'spdxId') ??
                        getFieldError(validationResult.errors, 'SPDXID')) && (
                          <FormHelperText error>
                            {getFieldError(validationResult.errors, 'spdxId')?.message ??
                              getFieldError(validationResult.errors, 'SPDXID')?.message}
                          </FormHelperText>
                        )}
                    </Box>
                    <Box>
                      <TextField
                        label="ダウンロード場所"
                        value={selectedComponent.downloadLocation ?? ''}
                        onChange={(e) => {
                          handleFieldChange('downloadLocation', e.target.value);
                        }}
                        placeholder="URL / NONE / NOASSERTION"
                        fullWidth
                        required
                        error={
                          !!getFieldError(validationResult.errors, 'downloadLocation') ||
                          !!getFieldError(validationResult.errors, 'PackageDownloadLocation')
                        }
                      />
                      {(getFieldError(validationResult.errors, 'downloadLocation') ??
                        getFieldError(validationResult.errors, 'PackageDownloadLocation')) && (
                          <FormHelperText error>
                            {getFieldError(validationResult.errors, 'downloadLocation')?.message ??
                              getFieldError(validationResult.errors, 'PackageDownloadLocation')
                                ?.message}
                          </FormHelperText>
                        )}
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedComponent.filesAnalyzed ?? false}
                          onChange={(e) => {
                            handleFieldChange('filesAnalyzed', e.target.checked);
                          }}
                        />
                      }
                      label="ファイル分析済み"
                    />
                    <TextField
                      label="検証コード"
                      value={selectedComponent.verificationCode ?? ''}
                      onChange={(e) => {
                        handleFieldChange('verificationCode', e.target.value);
                      }}
                      fullWidth
                    />
                    <TextField
                      label="ソース情報"
                      value={selectedComponent.sourceInfo ?? ''}
                      onChange={(e) => {
                        handleFieldChange('sourceInfo', e.target.value);
                      }}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <Box>
                      <TextField
                        label="結論付けられたライセンス"
                        value={selectedComponent.licenseConcluded ?? ''}
                        onChange={(e) => {
                          handleFieldChange('licenseConcluded', e.target.value);
                        }}
                        placeholder="SPDX License Expression"
                        fullWidth
                        error={!!getFieldError(validationResult.errors, 'PackageLicenseConcluded')}
                      />
                      {getFieldError(validationResult.errors, 'PackageLicenseConcluded') && (
                        <FormHelperText error>
                          {
                            getFieldError(validationResult.errors, 'PackageLicenseConcluded')
                              ?.message
                          }
                        </FormHelperText>
                      )}
                    </Box>
                    <Box>
                      <TextField
                        label="宣言されたライセンス"
                        value={selectedComponent.licenseDeclared ?? ''}
                        onChange={(e) => {
                          handleFieldChange('licenseDeclared', e.target.value);
                        }}
                        placeholder="SPDX License Expression"
                        fullWidth
                        error={!!getFieldError(validationResult.errors, 'PackageLicenseDeclared')}
                      />
                      {getFieldError(validationResult.errors, 'PackageLicenseDeclared') && (
                        <FormHelperText error>
                          {
                            getFieldError(validationResult.errors, 'PackageLicenseDeclared')
                              ?.message
                          }
                        </FormHelperText>
                      )}
                    </Box>
                    <TextField
                      label="ライセンスコメント"
                      value={selectedComponent.licenseComments ?? ''}
                      onChange={(e) => {
                        handleFieldChange('licenseComments', e.target.value);
                      }}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <TextField
                      label="概要"
                      value={selectedComponent.summary ?? ''}
                      onChange={(e) => {
                        handleFieldChange('summary', e.target.value);
                      }}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <TextField
                      label="パッケージコメント"
                      value={selectedComponent.packageComment ?? ''}
                      onChange={(e) => {
                        handleFieldChange('packageComment', e.target.value);
                      }}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <TextField
                      select
                      label="主目的"
                      value={selectedComponent.primaryPackagePurpose ?? ''}
                      onChange={(e) => {
                        handleFieldChange(
                          'primaryPackagePurpose',
                          e.target.value as SPDXPackagePurpose
                        );
                      }}
                      fullWidth
                    >
                      <MenuItem value="">
                        <em>未設定</em>
                      </MenuItem>
                      {spdxPackagePurposes.map((purpose) => (
                        <MenuItem key={purpose} value={purpose}>
                          {purpose}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="リリース日"
                      value={selectedComponent.releaseDate ?? ''}
                      onChange={(e) => {
                        handleFieldChange('releaseDate', e.target.value);
                      }}
                      placeholder="ISO 8601"
                      fullWidth
                    />
                    <TextField
                      label="ビルド日"
                      value={selectedComponent.builtDate ?? ''}
                      onChange={(e) => {
                        handleFieldChange('builtDate', e.target.value);
                      }}
                      placeholder="ISO 8601"
                      fullWidth
                    />
                    <TextField
                      label="サポート終了日"
                      value={selectedComponent.validUntilDate ?? ''}
                      onChange={(e) => {
                        handleFieldChange('validUntilDate', e.target.value);
                      }}
                      placeholder="ISO 8601"
                      fullWidth
                    />
                  </Stack>
                </Box>
                <Divider />
              </>
            )}

            {/* CycloneDX 固有属性 */}
            {state.sbom?.format === 'cyclonedx' && (
              <>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    CycloneDX 固有属性
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <TextField
                        label="BOM Ref"
                        value={selectedComponent.bomRef ?? ''}
                        onChange={(e) => {
                          handleFieldChange('bomRef', e.target.value);
                        }}
                        fullWidth
                        error={!!getFieldError(validationResult.errors, 'bom-ref')}
                      />
                      {getFieldError(validationResult.errors, 'bom-ref') && (
                        <FormHelperText error>
                          {getFieldError(validationResult.errors, 'bom-ref')?.message}
                        </FormHelperText>
                      )}
                    </Box>
                    <TextField
                      label="グループ"
                      value={selectedComponent.group ?? ''}
                      onChange={(e) => {
                        handleFieldChange('group', e.target.value);
                      }}
                      placeholder="例: org.apache.commons"
                      fullWidth
                    />
                    <Box>
                      <TextField
                        label="PURL"
                        value={selectedComponent.purl ?? ''}
                        onChange={(e) => {
                          handleFieldChange('purl', e.target.value);
                        }}
                        placeholder="例: pkg:npm/lodash@4.17.21"
                        fullWidth
                        error={!!getFieldError(validationResult.errors, 'purl')}
                      />
                      {getFieldError(validationResult.errors, 'purl') && (
                        <FormHelperText error>
                          {getFieldError(validationResult.errors, 'purl')?.message}
                        </FormHelperText>
                      )}
                    </Box>
                    <TextField
                      label="CPE"
                      value={selectedComponent.cpe ?? ''}
                      onChange={(e) => {
                        handleFieldChange('cpe', e.target.value);
                      }}
                      placeholder="CPE 2.2 or 2.3"
                      fullWidth
                    />
                    <TextField
                      select
                      label="スコープ"
                      value={selectedComponent.scope ?? 'required'}
                      onChange={(e) => {
                        handleFieldChange('scope', e.target.value as CycloneDXScope);
                      }}
                      fullWidth
                    >
                      {cycloneDXScopes.map((scope) => (
                        <MenuItem key={scope} value={scope}>
                          {scope}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="作成者"
                      value={selectedComponent.author ?? ''}
                      onChange={(e) => {
                        handleFieldChange('author', e.target.value);
                      }}
                      fullWidth
                    />
                    <TextField
                      label="公開者"
                      value={selectedComponent.publisher ?? ''}
                      onChange={(e) => {
                        handleFieldChange('publisher', e.target.value);
                      }}
                      fullWidth
                    />
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </TabPanel>

        {/* ライセンスタブ */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">ライセンス情報</Typography>
              <Button startIcon={<AddIcon />} onClick={handleLicenseAdd}>
                追加
              </Button>
            </Stack>

            {selectedComponent.licenses.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                ライセンス情報がありません
              </Typography>
            ) : (
              <Stack spacing={3}>
                {selectedComponent.licenses.map((license, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">ライセンス {index + 1}</Typography>
                        <IconButton
                          onClick={() => {
                            handleLicenseDelete(index);
                          }}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      <TextField
                        label="SPDX License Expression"
                        value={license.expression ?? ''}
                        onChange={(e) => {
                          handleLicenseChange(index, 'expression', e.target.value);
                        }}
                        placeholder="例: MIT OR Apache-2.0"
                        fullWidth
                      />
                      <TextField
                        label="SPDX License ID"
                        value={license.licenseId ?? ''}
                        onChange={(e) => {
                          handleLicenseChange(index, 'licenseId', e.target.value);
                        }}
                        placeholder="例: MIT"
                        fullWidth
                      />
                      <TextField
                        label="カスタムライセンス名"
                        value={license.licenseName ?? ''}
                        onChange={(e) => {
                          handleLicenseChange(index, 'licenseName', e.target.value);
                        }}
                        fullWidth
                      />
                      <TextField
                        label="URL"
                        value={license.url ?? ''}
                        onChange={(e) => {
                          handleLicenseChange(index, 'url', e.target.value);
                        }}
                        fullWidth
                      />
                      <TextField
                        label="ライセンステキスト"
                        value={license.text ?? ''}
                        onChange={(e) => {
                          handleLicenseChange(index, 'text', e.target.value);
                        }}
                        multiline
                        rows={4}
                        fullWidth
                      />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          カテゴリ:
                        </Typography>
                        <Chip label={license.category} size="small" sx={{ ml: 1 }} />
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </TabPanel>

        {/* 関係タブ */}
        <TabPanel value={tabValue} index={2}>
          <RelationshipTab component={selectedComponent} />
        </TabPanel>

        {/* カスタム属性タブ */}
        <TabPanel value={tabValue} index={3}>
          <CustomAttributeEditor component={selectedComponent} />
        </TabPanel>
      </Box>
    </Paper>
  );
};
