/**
 * ファイルアップロードダイアログ
 * ドラッグ&ドロップ対応、ファイルサイズ上限チェック、フォーマット自動検出、パースエラー表示
 */

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { detectFormat } from '../../services/parser/formatDetector';
import { parseSPDXJSON, parseSPDXYAML, parseSPDXTagValue } from '../../services/parser/spdxParser';
import { parseCycloneDXJSON, parseCycloneDXXML } from '../../services/parser/cyclonedxParser';
import { useSBOM } from '../../store/sbomStore';
import type { UnifiedSBOM } from '../../types/unified';

export interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

/** ファイルサイズ上限（10MB） */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const FileUploadDialog = ({ open, onClose }: FileUploadDialogProps) => {
  const { dispatch } = useSBOM();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * ファイルサイズチェック
   */
  const validateFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `ファイルサイズが上限（${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB）を超えています: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
      return false;
    }
    return true;
  };

  /**
   * ファイル読み込み
   */
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('ファイルの読み込みに失敗しました'));
        }
      };
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      reader.readAsText(file);
    });
  };

  /**
   * SBOM パース処理
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  const parseSBOM = async (content: string): Promise<UnifiedSBOM> => {
    // フォーマット自動検出
    const detectionResult = detectFormat(content);

    if (detectionResult.format === 'unknown') {
      throw new Error(
        'SBOM フォーマットを検出できませんでした。SPDX または CycloneDX 形式のファイルを選択してください。'
      );
    }

    // フォーマット別にパース
    if (detectionResult.format === 'spdx') {
      // SPDX のサブフォーマットを判定してパーサーを選択
      const trimmedContent = content.trim();

      // tag-value 形式の判定（JSON/YAML でない場合）
      if (!trimmedContent.startsWith('{') && !trimmedContent.startsWith('[')) {
        return parseSPDXTagValue(content);
      }

      // JSON または YAML の判定
      try {
        // JSON としてパースを試みる
        JSON.parse(content);
        return parseSPDXJSON(content);
      } catch {
        // JSON でない場合は YAML として扱う
        return parseSPDXYAML(content);
      }
    } else {
      // CycloneDX のサブフォーマットを判定してパーサーを選択
      const trimmedContent = content.trim();

      if (trimmedContent.startsWith('<')) {
        // XML 形式
        return parseCycloneDXXML(content);
      } else {
        // JSON 形式
        return parseCycloneDXJSON(content);
      }
    }
  };

  /**
   * ダイアログクローズ
   */
  const handleClose = useCallback(() => {
    setError(null);
    setSelectedFile(null);
    setIsDragging(false);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  /**
   * ファイル処理
   */
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(file);

      // ファイルサイズチェック
      if (!validateFileSize(file)) {
        return;
      }

      setIsLoading(true);

      try {
        // ファイル読み込み
        const content = await readFile(file);

        // SBOM パース
        const sbom = await parseSBOM(content);

        // ストアに保存
        dispatch({ type: 'LOAD_SBOM', payload: sbom });

        // ダイアログを閉じる
        handleClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(`パースエラー: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, handleClose]
  );

  /**
   * ドラッグオーバー
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * ドラッグリーブ
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * ドロップ
   */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        void handleFile(files[0]);
      }
    },
    [handleFile]
  );

  /**
   * ファイル選択
   */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleFile(files[0]);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>SBOM ファイルをアップロード</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* ドラッグ&ドロップエリア */}
          <Box sx={{ position: 'relative' }}>
            <Paper
              variant="outlined"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? 'action.hover' : 'background.paper',
                borderColor: isDragging ? 'primary.main' : 'divider',
                borderWidth: 2,
                borderStyle: 'dashed',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderColor: 'primary.main',
                },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                ファイルをドラッグ&ドロップ
              </Typography>
              <Typography variant="body2" color="text.secondary">
                または クリックしてファイルを選択
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                対応形式: SPDX (JSON, YAML, tag-value), CycloneDX (JSON, XML)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                最大ファイルサイズ: {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
              </Typography>
            </Paper>

            {/* 透明なファイル入力を上に重ねる */}
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml,.xml,.spdx,.rdf"
              onChange={handleFileSelect}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </Box>

          {/* 選択されたファイル名 */}
          {selectedFile && !error && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                選択されたファイル: {selectedFile.name}
              </Typography>
            </Box>
          )}

          {/* ローディング */}
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2">読み込み中...</Typography>
            </Box>
          )}

          {/* エラー表示 */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          キャンセル
        </Button>
      </DialogActions>
    </Dialog>
  );
};
