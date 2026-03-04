/**
 * ストアへ SBOM を保存するダイアログ
 * name, version, tags の入力、保存、上書き確認、承認済み保護機能を提供
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { createStoreClient } from '../../services/storeClient';
import type { UnifiedSBOM } from '../../types/unified';
import { StoreError } from '../../types/store';
import { getErrorMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../utils/errorMessages';

export interface StoreSaveDialogProps {
  open: boolean;
  onClose: () => void;
  sbom: UnifiedSBOM | null;
  onSaveSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const StoreSaveDialog = ({
  open,
  onClose,
  sbom,
  onSaveSuccess,
  onError,
}: StoreSaveDialogProps) => {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  /**
   * タグ一覧を取得
   */
  const loadTags = useCallback(async () => {
    const client = createStoreClient();
    if (!client) return;

    try {
      const tagList = await client.listTags();
      setAvailableTags(tagList);
    } catch {
      // タグ取得失敗は無視
    }
  }, []);

  // ダイアログが開いたときに初期値を設定
  useEffect(() => {
    if (open) {
      setName(sbom?.metadata.name ?? '');
      // CycloneDX: bomVersion (例: 1)
      // SPDX: licenseListVersion (例: "3.27")
      const defaultVersion =
        sbom?.format === 'cyclonedx'
          ? String(sbom?.metadata.bomVersion ?? 1)
          : (sbom?.metadata.licenseListVersion ?? '');
      setVersion(defaultVersion);
      setTags([]);
      setError(null);
      setShowOverwriteConfirm(false);
      void loadTags();
    }
  }, [open, sbom, loadTags]);

  /**
   * StoreError かどうかを判定
   */
  const isStoreError = (err: unknown): err is StoreError => {
    return err instanceof StoreError;
  };

  /**
   * 保存処理
   */
  const handleSave = async () => {
    if (!sbom) return;

    const client = createStoreClient();
    if (!client) {
      const message = ERROR_MESSAGES.CONNECTION.NOT_CONFIGURED;
      setError(message);
      onError?.(message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await client.createSbom({
        name: name.trim(),
        version: version.trim(),
        format: sbom.format,
        content: sbom,
        tags,
      });

      const successMsg = SUCCESS_MESSAGES.SAVE.SUCCESS;
      onSaveSuccess?.(successMsg);
      onClose();
    } catch (err) {
      if (isStoreError(err)) {
        if (err.approvedConflict) {
          const message = ERROR_MESSAGES.SAVE.APPROVED_CONFLICT;
          setError(message);
          onError?.(message);
        } else if (err.statusCode === 409) {
          setShowOverwriteConfirm(true);
        } else {
          const message = getErrorMessage(err);
          setError(message);
          onError?.(message);
        }
      } else {
        const message = ERROR_MESSAGES.SAVE.FAILED;
        setError(message);
        onError?.(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 上書き保存処理
   */
  const handleOverwrite = async () => {
    if (!sbom) return;

    const client = createStoreClient();
    if (!client) {
      const message = ERROR_MESSAGES.CONNECTION.NOT_CONFIGURED;
      setError(message);
      onError?.(message);
      return;
    }

    setLoading(true);
    setError(null);
    setShowOverwriteConfirm(false);

    try {
      await client.updateSbom(name.trim(), version.trim(), {
        format: sbom.format,
        content: sbom,
        tags,
      });

      const successMsg = SUCCESS_MESSAGES.SAVE.OVERWRITE_SUCCESS;
      onSaveSuccess?.(successMsg);
      onClose();
    } catch (err) {
      if (isStoreError(err) && err.approvedConflict) {
        const message = ERROR_MESSAGES.SAVE.APPROVED_CONFLICT;
        setError(message);
        onError?.(message);
      } else {
        const message = isStoreError(err)
          ? getErrorMessage(err)
          : ERROR_MESSAGES.SAVE.OVERWRITE_FAILED;
        setError(message);
        onError?.(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 上書き確認をキャンセル
   */
  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
  };

  const isValid = name.trim() !== '' && version.trim() !== '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="store-save-dialog-title"
      aria-describedby="store-save-dialog-description"
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
        },
      }}
    >
      <DialogTitle id="store-save-dialog-title">ストアへ保存</DialogTitle>
      <DialogContent>
        <Box
          id="store-save-dialog-description"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, px: { xs: 0, sm: 1 } }}
        >
          {/* エラーメッセージ */}
          {error && (
            <Alert severity="error" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          {/* 上書き確認 */}
          {showOverwriteConfirm && (
            <Alert
              severity="warning"
              role="alert"
              aria-live="assertive"
              action={
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                  }}
                >
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleCancelOverwrite}
                    aria-label="上書きをキャンセル"
                    sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    color="warning"
                    size="small"
                    onClick={() => void handleOverwrite()}
                    disabled={loading}
                    aria-label="SBOM を上書き保存"
                    sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                  >
                    上書き
                  </Button>
                </Box>
              }
              sx={{
                '& .MuiAlert-action': {
                  paddingTop: { xs: 1, sm: 0 },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                },
              }}
            >
              同じ名前とバージョンの SBOM が既に存在します。上書きしますか？
            </Alert>
          )}

          <TextField
            label="名前"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            fullWidth
            required
            error={name !== '' && name.trim() === ''}
            helperText={name !== '' && name.trim() === '' ? '名前を入力してください' : ''}
            disabled={loading}
            slotProps={{
              htmlInput: {
                'aria-label': 'SBOM 名',
                'aria-required': 'true',
                'aria-invalid': name !== '' && name.trim() === '',
              },
            }}
          />

          <TextField
            label="バージョン"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
            }}
            fullWidth
            required
            error={version !== '' && version.trim() === ''}
            helperText={
              version !== '' && version.trim() === '' ? 'バージョンを入力してください' : ''
            }
            disabled={loading}
            slotProps={{
              htmlInput: {
                'aria-label': 'SBOM バージョン',
                'aria-required': 'true',
                'aria-invalid': version !== '' && version.trim() === '',
              },
            }}
          />

          <Autocomplete
            multiple
            freeSolo
            options={availableTags}
            value={tags}
            onChange={(_, newValue) => {
              setTags(newValue);
            }}
            disabled={loading}
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} label={option} size="small" {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="タグ"
                placeholder="タグを入力"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    'aria-label': 'タグ（複数選択可能）',
                  },
                }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2 },
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          aria-label="ダイアログを閉じる"
          sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 2, sm: 1 } }}
        >
          キャンセル
        </Button>
        <Button
          onClick={() => void handleSave()}
          variant="contained"
          disabled={loading || !isValid || showOverwriteConfirm}
          aria-label="SBOM をストアに保存"
          sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 2 } }}
        >
          {loading ? <CircularProgress size={20} aria-label="保存中" /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
