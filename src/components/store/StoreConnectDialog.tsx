/**
 * ストアから SBOM を読み込むダイアログ
 * SBOM 一覧の表示、フィルタリング、ページネーション、読み込み機能を提供
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  Typography,
  Paper,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { createStoreClient } from '../../services/storeClient';
import type { StoreSbomSummary } from '../../types/store';
import type { UnifiedSBOM } from '../../types/unified';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

export interface StoreConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (sbom: UnifiedSBOM) => void;
  onError?: (message: string) => void;
}

const PAGE_LIMIT = 20;

export const StoreConnectDialog = ({ open, onClose, onLoad, onError }: StoreConnectDialogProps) => {
  const [sboms, setSboms] = useState<StoreSbomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // フィルタ状態
  const [nameFilter, setNameFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [approvedFilter, setApprovedFilter] = useState(false);

  /**
   * SBOM 一覧を取得
   */
  const loadSboms = useCallback(async () => {
    const client = createStoreClient();
    if (!client) {
      setError(ERROR_MESSAGES.CONNECTION.NOT_CONFIGURED);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: {
        page: number;
        limit: number;
        name?: string;
        tag?: string;
        approved?: boolean;
      } = { page, limit: PAGE_LIMIT };

      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (tagFilter) params.tag = tagFilter;
      if (approvedFilter) params.approved = true;

      const response = await client.listSboms(params);
      setSboms(response.data);
      setTotal(response.total);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, nameFilter, tagFilter, approvedFilter]);

  /**
   * タグ一覧を取得
   */
  const loadTags = useCallback(async () => {
    const client = createStoreClient();
    if (!client) return;

    try {
      const tags = await client.listTags();
      setAvailableTags(tags);
    } catch {
      // タグ取得失敗は無視
    }
  }, []);

  // ダイアログが開いたときにデータを取得
  useEffect(() => {
    if (open) {
      void loadSboms();
      void loadTags();
    }
  }, [open, loadSboms, loadTags]);

  /**
   * SBOM を読み込む
   */
  const handleLoad = async (sbom: StoreSbomSummary) => {
    const client = createStoreClient();
    if (!client) {
      setError(ERROR_MESSAGES.CONNECTION.NOT_CONFIGURED);
      return;
    }

    const itemKey = `${sbom.name}-${sbom.version}`;
    setLoadingItem(itemKey);
    setError(null);

    try {
      const detail = await client.getSbom(sbom.name, sbom.version);
      onLoad(detail.content);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      onError?.(message);
    } finally {
      setLoadingItem(null);
    }
  };

  /**
   * フィルタ適用（ページを1に戻す）
   */
  const handleApplyFilters = () => {
    setPage(1);
  };

  /**
   * ページ変更
   */
  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="store-connect-dialog-title"
      aria-describedby="store-connect-dialog-description"
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
        },
      }}
    >
      <DialogTitle id="store-connect-dialog-title">ストアから読み込み</DialogTitle>
      <DialogContent>
        <Box
          id="store-connect-dialog-description"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
        >
          {/* フィルタリング UI */}
          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, sm: 2 } }}
            role="search"
            aria-label="SBOM 検索フィルター"
          >
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1.5, sm: 2 },
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                label="名前で検索"
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
                }}
                size="small"
                slotProps={{
                  htmlInput: {
                    'aria-label': 'SBOM 名で検索',
                  },
                }}
                sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: 1 } }}
              />
              <Autocomplete
                options={availableTags}
                value={tagFilter}
                onChange={(_, newValue) => {
                  setTagFilter(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="タグで絞り込み"
                    size="small"
                    slotProps={{
                      input: {
                        'aria-label': 'タグで絞り込み',
                      },
                    }}
                  />
                )}
                sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: 1 } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={approvedFilter}
                    onChange={(e) => {
                      setApprovedFilter(e.target.checked);
                    }}
                    slotProps={{
                      input: {
                        'aria-label': '承認済みの SBOM のみ表示',
                      },
                    }}
                  />
                }
                label="承認済みのみ"
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              />
              <Button
                variant="outlined"
                onClick={handleApplyFilters}
                size="small"
                aria-label="検索フィルターを適用"
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              >
                検索
              </Button>
            </Box>
          </Paper>

          {/* エラー表示 */}
          {error && (
            <Alert severity="error" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          {/* ローディング */}
          {loading ? (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
              role="status"
              aria-live="polite"
              aria-label="読み込み中"
            >
              <CircularProgress aria-label="SBOM 一覧を読み込み中" />
            </Box>
          ) : sboms.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ textAlign: 'center', py: 4 }}
              role="status"
              aria-live="polite"
            >
              SBOM が見つかりませんでした
            </Typography>
          ) : (
            <>
              {/* SBOM 一覧テーブル */}
              <TableContainer
                sx={{
                  maxHeight: { xs: 300, sm: 400 },
                  overflowX: 'auto',
                }}
                role="region"
                aria-label="SBOM 一覧"
              >
                <Table
                  stickyHeader
                  size="small"
                  sx={{ minWidth: { xs: 600, sm: 'auto' } }}
                  aria-label="SBOM 一覧テーブル"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 120 }}>名前</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>バージョン</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>形式</TableCell>
                      <TableCell sx={{ minWidth: 60 }}>承認</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>タグ</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>更新日時</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sboms.map((sbom) => {
                      const itemKey = `${sbom.name}-${sbom.version}`;
                      const isItemLoading = loadingItem === itemKey;
                      return (
                        <TableRow key={itemKey}>
                          <TableCell>{sbom.name}</TableCell>
                          <TableCell>{sbom.version}</TableCell>
                          <TableCell>{sbom.format}</TableCell>
                          <TableCell>
                            {sbom.approved ? (
                              <CheckCircleIcon
                                color="success"
                                fontSize="small"
                                aria-label="承認済み"
                                role="img"
                              />
                            ) : (
                              <span aria-label="未承認" role="img">
                                {/* 空のセル */}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                              role="list"
                              aria-label={`タグ: ${sbom.tags.length > 0 ? sbom.tags.join(', ') : 'なし'}`}
                            >
                              {sbom.tags.map((tag) => (
                                <Chip key={tag} label={tag} size="small" role="listitem" />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {new Date(sbom.updatedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => void handleLoad(sbom)}
                              disabled={isItemLoading || loadingItem !== null}
                              aria-label={`${sbom.name} バージョン ${sbom.version} を読み込み`}
                              sx={{ minWidth: 80 }}
                            >
                              {isItemLoading ? (
                                <CircularProgress size={16} aria-label="読み込み中" />
                              ) : (
                                '読み込み'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ページネーション */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    aria-label="ページを選択"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
