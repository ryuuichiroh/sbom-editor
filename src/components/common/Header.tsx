/**
 * ヘッダーコンポーネント
 * アップロード/ダウンロード/設定ボタンを提供
 */

import { useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Speed as SpeedIcon,
  Menu as MenuIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { FileUploadDialog } from '../upload/FileUploadDialog';
import { PerformanceTest } from './PerformanceTest';
import { StoreConnectDialog } from '../store/StoreConnectDialog';
import { StoreSaveDialog } from '../store/StoreSaveDialog';
import { useSBOM } from '../../store/sbomStore';
import { useUndoRedo } from '../../store/commandHistory';
import { useStoreConnection } from '../../hooks/useStoreConnection';
import { convertToSPDXJSON } from '../../services/exporter/spdxExporter';
import { convertToCycloneDXJSON } from '../../services/exporter/cyclonedxExporter';
import type { UnifiedSBOM } from '../../types/unified';

export interface HeaderProps {
  onSettingsClick?: () => void;
  onMenuClick?: () => void;
}

export const Header = ({ onSettingsClick, onMenuClick }: HeaderProps) => {
  const { state, dispatch } = useSBOM();
  const { undo, redo, canUndo, canRedo } = useUndoRedo(dispatch);
  const { storeUrl } = useStoreConnection();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [performanceTestOpen, setPerformanceTestOpen] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);
  const [storeConnectOpen, setStoreConnectOpen] = useState(false);
  const [storeSaveOpen, setStoreSaveOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const hasSBOM = state.sbom !== null;
  const isDownloadMenuOpen = Boolean(downloadMenuAnchor);

  /**
   * アップロードダイアログを開く
   */
  const handleUploadClick = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  /**
   * ダウンロードメニューを開く
   */
  const handleDownloadClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  }, []);

  /**
   * ダウンロードメニューを閉じる
   */
  const handleDownloadMenuClose = useCallback(() => {
    setDownloadMenuAnchor(null);
  }, []);

  /**
   * ファイルダウンロード処理
   */
  const downloadFile = useCallback((content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * SPDX 形式でダウンロード
   */
  const handleDownloadSPDX = useCallback(() => {
    if (!state.sbom) return;

    try {
      const content = convertToSPDXJSON(state.sbom);
      const fileName = `${state.sbom.metadata.name || 'sbom'}_spdx.json`;
      downloadFile(content, fileName, 'application/json');
      handleDownloadMenuClose();
    } catch (error) {
      console.error('SPDX エクスポートエラー:', error);
      alert(
        `エクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }, [state.sbom, downloadFile, handleDownloadMenuClose]);

  /**
   * CycloneDX 形式でダウンロード
   */
  const handleDownloadCycloneDX = useCallback(() => {
    if (!state.sbom) return;

    try {
      const content = convertToCycloneDXJSON(state.sbom);
      const fileName = `${state.sbom.metadata.name || 'sbom'}_cyclonedx.json`;
      downloadFile(content, fileName, 'application/json');
      handleDownloadMenuClose();
    } catch (error) {
      console.error('CycloneDX エクスポートエラー:', error);
      alert(
        `エクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }, [state.sbom, downloadFile, handleDownloadMenuClose]);

  /**
   * 元のフォーマットでダウンロード
   */
  const handleDownloadOriginal = useCallback(() => {
    if (!state.sbom) return;

    try {
      if (state.sbom.format === 'spdx') {
        handleDownloadSPDX();
      } else {
        handleDownloadCycloneDX();
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert(
        `エクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }, [state.sbom, handleDownloadSPDX, handleDownloadCycloneDX]);

  /**
   * ストアから読み込んだ SBOM をセット
   */
  const handleLoadFromStore = useCallback(
    (sbom: UnifiedSBOM) => {
      dispatch({ type: 'LOAD_SBOM', payload: sbom });
      setSnackbar({
        open: true,
        message: 'ストアから SBOM を読み込みました',
        severity: 'success',
      });
    },
    [dispatch]
  );

  /**
   * ストア保存成功時の処理
   */
  const handleStoreSaveSuccess = useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'success',
    });
  }, []);

  /**
   * ストアエラー時の処理
   */
  const handleStoreError = useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'error',
    });
  }, []);

  /**
   * スナックバーを閉じる
   */
  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          {/* モバイルメニューボタン */}
          {onMenuClick && (
            <IconButton
              color="inherit"
              aria-label="メニューを開く"
              edge="start"
              onClick={onMenuClick}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SBOM Editor
          </Typography>

          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center' }}>
            {/* Undo ボタン */}
            <IconButton
              color="default"
              onClick={undo}
              disabled={!canUndo}
              aria-label="元に戻す"
              title="元に戻す (Ctrl+Z)"
              size="small"
            >
              <UndoIcon />
            </IconButton>

            {/* Redo ボタン */}
            <IconButton
              color="default"
              onClick={redo}
              disabled={!canRedo}
              aria-label="やり直す"
              title="やり直す (Ctrl+Y)"
              size="small"
            >
              <RedoIcon />
            </IconButton>

            {/* アップロードボタン */}
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
              size="small"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              アップロード
            </Button>
            <IconButton
              color="default"
              onClick={handleUploadClick}
              aria-label="アップロード"
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <UploadIcon />
            </IconButton>

            {/* ダウンロードボタン */}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadClick}
              disabled={!hasSBOM}
              size="small"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              ダウンロード
            </Button>
            <IconButton
              color="default"
              onClick={handleDownloadClick}
              disabled={!hasSBOM}
              aria-label="ダウンロード"
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <DownloadIcon />
            </IconButton>

            {/* ストア連携ボタン（URL が設定されている場合のみ表示） */}
            {storeUrl && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => {
                    setStoreConnectOpen(true);
                  }}
                  size="small"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  ストアから読み込み
                </Button>
                <IconButton
                  color="default"
                  onClick={() => {
                    setStoreConnectOpen(true);
                  }}
                  aria-label="ストアから読み込み"
                  sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                >
                  <CloudDownloadIcon />
                </IconButton>

                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => {
                    setStoreSaveOpen(true);
                  }}
                  disabled={!hasSBOM}
                  size="small"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  ストアへ保存
                </Button>
                <IconButton
                  color="default"
                  onClick={() => {
                    setStoreSaveOpen(true);
                  }}
                  disabled={!hasSBOM}
                  aria-label="ストアへ保存"
                  sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                >
                  <CloudUploadIcon />
                </IconButton>
              </>
            )}

            {/* 設定ボタン */}
            <IconButton color="default" onClick={onSettingsClick} aria-label="設定" size="small">
              <SettingsIcon />
            </IconButton>

            {/* パフォーマンステストボタン（開発用） */}
            <IconButton
              color="default"
              onClick={() => {
                setPerformanceTestOpen(true);
              }}
              aria-label="パフォーマンステスト"
              title="パフォーマンステスト"
              size="small"
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              <SpeedIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ダウンロードメニュー */}
      <Menu
        anchorEl={downloadMenuAnchor}
        open={isDownloadMenuOpen}
        onClose={handleDownloadMenuClose}
      >
        <MenuItem onClick={handleDownloadOriginal}>
          元のフォーマット ({state.sbom?.format.toUpperCase()})
        </MenuItem>
        <MenuItem onClick={handleDownloadSPDX}>SPDX 形式</MenuItem>
        <MenuItem onClick={handleDownloadCycloneDX}>CycloneDX 形式</MenuItem>
      </Menu>

      {/* アップロードダイアログ */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
        }}
      />

      {/* パフォーマンステストダイアログ */}
      <PerformanceTest
        open={performanceTestOpen}
        onClose={() => {
          setPerformanceTestOpen(false);
        }}
      />

      {/* ストア読み込みダイアログ */}
      <StoreConnectDialog
        open={storeConnectOpen}
        onClose={() => {
          setStoreConnectOpen(false);
        }}
        onLoad={handleLoadFromStore}
        onError={handleStoreError}
      />

      {/* ストア保存ダイアログ */}
      <StoreSaveDialog
        open={storeSaveOpen}
        onClose={() => {
          setStoreSaveOpen(false);
        }}
        sbom={state.sbom}
        onSaveSuccess={handleStoreSaveSuccess}
        onError={handleStoreError}
      />

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
