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
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Speed as SpeedIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { FileUploadDialog } from '../upload/FileUploadDialog';
import { PerformanceTest } from './PerformanceTest';
import { useSBOM } from '../../store/sbomStore';
import { useUndoRedo } from '../../store/commandHistory';
import { convertToSPDXJSON } from '../../services/exporter/spdxExporter';
import { convertToCycloneDXJSON } from '../../services/exporter/cyclonedxExporter';

export interface HeaderProps {
  onSettingsClick?: () => void;
  onMenuClick?: () => void;
}

export const Header = ({ onSettingsClick, onMenuClick }: HeaderProps) => {
  const { state, dispatch } = useSBOM();
  const { undo, redo, canUndo, canRedo } = useUndoRedo(dispatch);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [performanceTestOpen, setPerformanceTestOpen] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

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
    </>
  );
};
