/**
 * パフォーマンステストコンポーネント
 * 大規模 SBOM を生成してパフォーマンスを検証する
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Alert,
  Box,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useSBOM } from '../../store/sbomStore';
import {
  generateLargeSBOM,
  getMemoryUsage,
  type PerformanceMetrics,
} from '../../utils/performanceTestUtils';

export interface PerformanceTestProps {
  open: boolean;
  onClose: () => void;
}

export const PerformanceTest = ({ open, onClose }: PerformanceTestProps) => {
  const { dispatch } = useSBOM();
  const [componentCount, setComponentCount] = useState<number>(1000);
  const [format, setFormat] = useState<'spdx' | 'cyclonedx'>('cyclonedx');
  const [withHierarchy, setWithHierarchy] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setMetrics(null);

    // 非同期で生成してUIをブロックしない
    setTimeout(() => {
      try {
        const startMemory = getMemoryUsage();
        const startTime = performance.now();

        // SBOM を生成
        const sbom = generateLargeSBOM(componentCount, format, withHierarchy);

        // ストアに読み込み（レンダリングをトリガー）
        dispatch({ type: 'LOAD_SBOM', payload: sbom });

        const endTime = performance.now();
        const endMemory = getMemoryUsage();

        const totalTime = endTime - startTime;

        const performanceMetrics: PerformanceMetrics = {
          componentCount,
          renderTime: totalTime,
          memoryUsage:
            endMemory !== undefined && startMemory !== undefined
              ? endMemory - startMemory
              : endMemory,
          timestamp: new Date().toISOString(),
        };

        setMetrics(performanceMetrics);

        console.warn('Performance Test Results:', performanceMetrics);
      } catch (error) {
        console.error('Performance test error:', error);
        alert(`テストに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  }, [componentCount, format, withHierarchy, dispatch]);

  const handleClose = useCallback(() => {
    setMetrics(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>パフォーマンステスト</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            大規模 SBOM を生成してパフォーマンスを検証します。 1000+
            コンポーネントでの動作を確認できます。
          </Alert>

          <TextField
            label="コンポーネント数"
            type="number"
            value={componentCount}
            onChange={(e) => {
              setComponentCount(Number(e.target.value));
            }}
            slotProps={{ htmlInput: { min: 100, max: 5000, step: 100 } }}
            fullWidth
            helperText="100〜5000 の範囲で指定してください"
          />

          <TextField
            select
            label="フォーマット"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as 'spdx' | 'cyclonedx');
            }}
            fullWidth
          >
            <MenuItem value="cyclonedx">CycloneDX 1.4</MenuItem>
            <MenuItem value="spdx">SPDX 2.3</MenuItem>
          </TextField>

          <TextField
            select
            label="親子階層"
            value={withHierarchy ? 'yes' : 'no'}
            onChange={(e) => {
              setWithHierarchy(e.target.value === 'yes');
            }}
            fullWidth
          >
            <MenuItem value="yes">あり（10% をルート、90% を子として配置）</MenuItem>
            <MenuItem value="no">なし（フラット構造）</MenuItem>
          </TextField>

          {isGenerating && (
            <Box>
              <Typography variant="body2" gutterBottom>
                生成中...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {metrics && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                テスト結果
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>項目</TableCell>
                      <TableCell align="right">値</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>コンポーネント数</TableCell>
                      <TableCell align="right">{metrics.componentCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>生成 + レンダリング時間</TableCell>
                      <TableCell align="right">{metrics.renderTime.toFixed(2)} ms</TableCell>
                    </TableRow>
                    {metrics.memoryUsage !== undefined && (
                      <TableRow>
                        <TableCell>メモリ使用量</TableCell>
                        <TableCell align="right">{metrics.memoryUsage.toFixed(2)} MB</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell>タイムスタンプ</TableCell>
                      <TableCell align="right">
                        {new Date(metrics.timestamp).toLocaleString('ja-JP')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {metrics.renderTime < 1000 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  ✅ 優れたパフォーマンス（1秒未満）
                </Alert>
              )}
              {metrics.renderTime >= 1000 && metrics.renderTime < 3000 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  ℹ️ 許容範囲のパフォーマンス（1〜3秒）
                </Alert>
              )}
              {metrics.renderTime >= 3000 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  ⚠️ パフォーマンス改善が必要（3秒以上）
                </Alert>
              )}
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>閉じる</Button>
        <Button onClick={handleGenerate} variant="contained" disabled={isGenerating}>
          生成してテスト
        </Button>
      </DialogActions>
    </Dialog>
  );
};
