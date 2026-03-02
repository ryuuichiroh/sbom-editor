/**
 * カスタム属性エディタ
 * 動的登録と事前定義属性の両方に対応
 */

import { useState, useMemo, useCallback, memo } from 'react';
import {
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Paper,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import { useConfig } from '../../store/configStore';
import { useSBOM } from '../../store/sbomStore';
import { useComponentValidation, getFieldError } from '../../hooks/useValidation';
import type { Property, Component } from '../../types/unified';
import type { CustomAttributeDefinition } from '../../types/config';

interface CustomAttributeEditorProps {
  component: Component;
}

/**
 * 新規属性追加ダイアログ
 */
interface AddAttributeDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, valueType: 'string' | 'string[]') => void;
  predefinedAttributes: CustomAttributeDefinition[];
  existingAttributeNames: string[];
  componentType: Component['type'];
}

const AddAttributeDialog = memo(
  ({
    open,
    onClose,
    onAdd,
    predefinedAttributes,
    existingAttributeNames,
    componentType,
  }: AddAttributeDialogProps) => {
    const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
    const [selectedPredefined, setSelectedPredefined] = useState<string>('');
    const [customName, setCustomName] = useState('');
    const [customValueType, setCustomValueType] = useState<'string' | 'string[]'>('string');

    // コンポーネントタイプに適用可能な事前定義属性をフィルタ
    const applicableAttributes = useMemo(() => {
      return predefinedAttributes.filter((attr) => {
        // 既に追加済みの属性は除外
        if (existingAttributeNames.includes(attr.name)) {
          return false;
        }
        // applicableTo が未定義の場合は全タイプに適用
        if (!attr.applicableTo || attr.applicableTo.length === 0) {
          return true;
        }
        // コンポーネントタイプが適用対象に含まれているか
        return attr.applicableTo.includes(componentType);
      });
    }, [predefinedAttributes, existingAttributeNames, componentType]);

    const handleClose = useCallback(() => {
      setMode('predefined');
      setSelectedPredefined('');
      setCustomName('');
      setCustomValueType('string');
      onClose();
    }, [onClose]);

    const handleAdd = useCallback(() => {
      if (mode === 'predefined') {
        const attr = predefinedAttributes.find((a) => a.name === selectedPredefined);
        if (attr) {
          onAdd(attr.name, attr.valueType);
        }
      } else {
        if (customName.trim()) {
          onAdd(customName.trim(), customValueType);
        }
      }
      handleClose();
    }, [
      mode,
      predefinedAttributes,
      selectedPredefined,
      customName,
      customValueType,
      onAdd,
      handleClose,
    ]);

    const canAdd = mode === 'predefined' ? selectedPredefined !== '' : customName.trim() !== '';

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>カスタム属性を追加</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>追加方法</InputLabel>
              <Select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                }}
                label="追加方法"
              >
                <MenuItem value="predefined">事前定義属性から選択</MenuItem>
                <MenuItem value="custom">カスタム属性を入力</MenuItem>
              </Select>
            </FormControl>

            {mode === 'predefined' ? (
              <FormControl fullWidth>
                <InputLabel>属性名</InputLabel>
                <Select
                  value={selectedPredefined}
                  onChange={(e) => {
                    setSelectedPredefined(e.target.value);
                  }}
                  label="属性名"
                >
                  {applicableAttributes.length === 0 ? (
                    <MenuItem disabled>利用可能な属性がありません</MenuItem>
                  ) : (
                    applicableAttributes.map((attr) => (
                      <MenuItem key={attr.name} value={attr.name}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{attr.label ?? attr.name}</Typography>
                          {attr.required && (
                            <Typography color="error" component="span">
                              *
                            </Typography>
                          )}
                          <Chip label={attr.valueType} size="small" />
                        </Stack>
                      </MenuItem>
                    ))
                  )}
                </Select>
                {selectedPredefined && (
                  <FormHelperText>
                    {applicableAttributes.find((a) => a.name === selectedPredefined)?.description}
                  </FormHelperText>
                )}
              </FormControl>
            ) : (
              <>
                <TextField
                  label="属性名"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                  }}
                  placeholder="例: custom:my-attribute"
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>値のタイプ</InputLabel>
                  <Select
                    value={customValueType}
                    onChange={(e) => {
                      setCustomValueType(e.target.value);
                    }}
                    label="値のタイプ"
                  >
                    <MenuItem value="string">単一文字列 (string)</MenuItem>
                    <MenuItem value="string[]">リスト (string[])</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!canAdd}>
            追加
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

export const CustomAttributeEditor = ({ component }: CustomAttributeEditorProps) => {
  const { state: configState } = useConfig();
  const { dispatch } = useSBOM();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // バリデーション結果を取得
  const validationResult = useComponentValidation(component);

  const customAttributes = useMemo(
    () => component.customAttributes ?? [],
    [component.customAttributes]
  );
  const predefinedAttributes = useMemo(
    () => configState.customAttributes?.attributes ?? [],
    [configState.customAttributes?.attributes]
  );

  // 属性定義を取得（事前定義 or 動的登録）
  const getAttributeDefinition = useCallback(
    (name: string): CustomAttributeDefinition | undefined => {
      return predefinedAttributes.find((attr) => attr.name === name);
    },
    [predefinedAttributes]
  );

  // 属性を追加
  const handleAddAttribute = useCallback(
    (name: string, valueType: 'string' | 'string[]') => {
      const definition = getAttributeDefinition(name);
      const defaultValue = definition?.defaultValue ?? (valueType === 'string' ? '' : []);

      const newAttribute: Property = {
        name,
        value: defaultValue,
        valueType,
      };

      const updatedAttributes = [...customAttributes, newAttribute];
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: component.id,
          updates: { customAttributes: updatedAttributes },
        },
      });
    },
    [getAttributeDefinition, customAttributes, dispatch, component.id]
  );

  // 属性を削除
  const handleDeleteAttribute = useCallback(
    (index: number) => {
      const updatedAttributes = customAttributes.filter((_, i) => i !== index);
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: component.id,
          updates: { customAttributes: updatedAttributes },
        },
      });
    },
    [customAttributes, dispatch, component.id]
  );

  // 属性値を更新（string）
  const handleUpdateStringValue = useCallback(
    (index: number, value: string) => {
      const updatedAttributes = [...customAttributes];
      updatedAttributes[index] = {
        ...updatedAttributes[index],
        value,
      };
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: component.id,
          updates: { customAttributes: updatedAttributes },
        },
      });
    },
    [customAttributes, dispatch, component.id]
  );

  // 属性値を更新（string[]）
  const handleUpdateArrayValue = useCallback(
    (index: number, values: string[]) => {
      const updatedAttributes = [...customAttributes];
      updatedAttributes[index] = {
        ...updatedAttributes[index],
        value: values,
      };
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          id: component.id,
          updates: { customAttributes: updatedAttributes },
        },
      });
    },
    [customAttributes, dispatch, component.id]
  );

  // 既存の属性名リスト
  const existingAttributeNames = customAttributes.map((attr) => attr.name);

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">カスタム属性</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setAddDialogOpen(true);
          }}
          variant="contained"
        >
          追加
        </Button>
      </Stack>

      {customAttributes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          カスタム属性がありません。「追加」ボタンから属性を追加してください。
        </Typography>
      ) : (
        <Stack spacing={2}>
          {customAttributes.map((attribute, index) => {
            const definition = getAttributeDefinition(attribute.name);
            const label = definition?.label ?? attribute.name;
            const description = definition?.description;
            const required = definition?.required ?? false;
            const options = definition?.options;
            const error = getFieldError(validationResult.errors, attribute.name)?.message;

            return (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">
                        {label}
                        {required && (
                          <Typography component="span" color="error">
                            {' '}
                            *
                          </Typography>
                        )}
                      </Typography>
                      {description && (
                        <Tooltip title={description}>
                          <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                      <Chip label={attribute.valueType} size="small" />
                    </Stack>
                    <IconButton
                      onClick={() => {
                        handleDeleteAttribute(index);
                      }}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>

                  {/* string 型の入力 */}
                  {attribute.valueType === 'string' && (
                    <>
                      {options && options.length > 0 ? (
                        // オートコンプリート付きテキストフィールド
                        <Autocomplete
                          freeSolo
                          options={options}
                          value={(attribute.value as string) ?? ''}
                          onChange={(_event, newValue) => {
                            handleUpdateStringValue(index, newValue ?? '');
                          }}
                          onInputChange={(_event, newValue) => {
                            handleUpdateStringValue(index, newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="値"
                              error={!!error}
                              helperText={error}
                              fullWidth
                            />
                          )}
                        />
                      ) : (
                        // 通常のテキストフィールド
                        <TextField
                          label="値"
                          value={(attribute.value as string) ?? ''}
                          onChange={(e) => {
                            handleUpdateStringValue(index, e.target.value);
                          }}
                          error={!!error}
                          helperText={error}
                          fullWidth
                        />
                      )}
                    </>
                  )}

                  {/* string[] 型の入力 */}
                  {attribute.valueType === 'string[]' && (
                    <>
                      {options && options.length > 0 ? (
                        // プルダウンからチップ追加
                        <Autocomplete
                          multiple
                          options={options}
                          value={(attribute.value as string[]) ?? []}
                          onChange={(_event, newValue) => {
                            handleUpdateArrayValue(index, newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="値"
                              error={!!error}
                              helperText={error}
                              placeholder="選択してください"
                            />
                          )}
                        />
                      ) : (
                        // 自由入力チップ
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[]}
                          value={(attribute.value as string[]) ?? []}
                          onChange={(_event, newValue) => {
                            handleUpdateArrayValue(index, newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="値"
                              error={!!error}
                              helperText={error ?? 'Enter キーで追加'}
                              placeholder="入力して Enter"
                            />
                          )}
                        />
                      )}
                    </>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    属性名: {attribute.name}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <AddAttributeDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
        }}
        onAdd={handleAddAttribute}
        predefinedAttributes={predefinedAttributes}
        existingAttributeNames={existingAttributeNames}
        componentType={component.type}
      />
    </Stack>
  );
};
