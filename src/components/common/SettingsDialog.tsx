/**
 * 設定ダイアログ
 * field-requirements.json と custom-attributes.json のアップロード・リセット機能を提供
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Upload as UploadIcon, RestartAlt as ResetIcon } from '@mui/icons-material';
import { useConfig } from '../../store/configStore';
import {
  loadConfigFromFile,
  validateFieldRequirements,
  validateCustomAttributes,
  saveFieldRequirements,
  saveCustomAttributes,
  resetFieldRequirements,
  resetCustomAttributes,
} from '../../services/configLoader';
import type { FieldRequirementsConfig, CustomAttributesConfig } from '../../types/config';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { state, dispatch } = useConfig();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  /**
   * スナックバーを表示
   */
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  /**
   * スナックバーを閉じる
   */
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /**
   * 必須属性設定ファイルのアップロード
   */
  const handleFieldRequirementsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void (async () => {
      try {
        const config = await loadConfigFromFile<FieldRequirementsConfig>(file);

        // バリデーション
        if (!validateFieldRequirements(config)) {
          throw new Error('設定ファイルの形式が正しくありません');
        }

        // localStorage に保存
        saveFieldRequirements(config);

        // 状態を更新
        dispatch({ type: 'LOAD_FIELD_REQUIREMENTS', payload: config });

        showSnackbar('必須属性設定を読み込みました', 'success');
      } catch (error) {
        console.error('必須属性設定の読み込みエラー:', error);
        showSnackbar(
          `読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          'error'
        );
      }

      // input をリセット（同じファイルを再度選択できるようにする）
      event.target.value = '';
    })();
  };

  /**
   * カスタム属性設定ファイルのアップロード
   */
  const handleCustomAttributesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void (async () => {
      try {
        const config = await loadConfigFromFile<CustomAttributesConfig>(file);

        // バリデーション
        if (!validateCustomAttributes(config)) {
          throw new Error('設定ファイルの形式が正しくありません');
        }

        // localStorage に保存
        saveCustomAttributes(config);

        // 状態を更新
        dispatch({ type: 'LOAD_CUSTOM_ATTRIBUTES', payload: config });

        showSnackbar('カスタム属性設定を読み込みました', 'success');
      } catch (error) {
        console.error('カスタム属性設定の読み込みエラー:', error);
        showSnackbar(
          `読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          'error'
        );
      }

      // input をリセット
      event.target.value = '';
    })();
  };

  /**
   * 必須属性設定をデフォルトにリセット
   */
  const handleFieldRequirementsReset = () => {
    void (async () => {
      try {
        const defaultConfig = await resetFieldRequirements();
        dispatch({ type: 'RESET_FIELD_REQUIREMENTS', payload: defaultConfig });
        showSnackbar('必須属性設定をデフォルトに戻しました', 'success');
      } catch (error) {
        console.error('必須属性設定のリセットエラー:', error);
        showSnackbar(
          `リセットに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          'error'
        );
      }
    })();
  };

  /**
   * カスタム属性設定をデフォルトにリセット
   */
  const handleCustomAttributesReset = () => {
    void (async () => {
      try {
        const defaultConfig = await resetCustomAttributes();
        dispatch({ type: 'RESET_CUSTOM_ATTRIBUTES', payload: defaultConfig });
        showSnackbar('カスタム属性設定をデフォルトに戻しました', 'success');
      } catch (error) {
        console.error('カスタム属性設定のリセットエラー:', error);
        showSnackbar(
          `リセットに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          'error'
        );
      }
    })();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle>設定</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* 必須属性設定 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                必須属性設定 (field-requirements.json)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                仕様上は任意だが、組織のポリシーや用途によって必須としたい属性を設定します。
              </Typography>

              {state.fieldRequirements && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  現在の設定: バージョン {state.fieldRequirements.version}
                  {state.fieldRequirements.description &&
                    ` - ${state.fieldRequirements.description}`}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  ファイルをアップロード
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleFieldRequirementsUpload}
                  />
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleFieldRequirementsReset}
                  size="small"
                >
                  デフォルトに戻す
                </Button>
              </Box>
            </Paper>

            {/* カスタム属性設定 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                カスタム属性設定 (custom-attributes.json)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                標準仕様外のカスタム属性を事前定義し、UI の選択肢として提供します。
              </Typography>

              {state.customAttributes && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  現在の設定: バージョン {state.customAttributes.version}
                  {state.customAttributes.description && ` - ${state.customAttributes.description}`}
                  <br />
                  定義済み属性: {state.customAttributes.attributes.length} 件
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  ファイルをアップロード
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleCustomAttributesUpload}
                  />
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleCustomAttributesReset}
                  size="small"
                >
                  デフォルトに戻す
                </Button>
              </Box>
            </Paper>

            {/* 説明 */}
            <Alert severity="info">
              設定は localStorage に保存され、次回起動時も維持されます。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
