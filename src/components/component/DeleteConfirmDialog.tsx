/**
 * コンポーネント削除確認ダイアログ
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import type { Component } from '../../types/unified';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  components: Component[];
  affectedRelationships?: number;
}

export const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  components,
  affectedRelationships = 0,
}: DeleteConfirmDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isBulkDelete = components.length > 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        {isBulkDelete ? 'コンポーネントの一括削除' : 'コンポーネントの削除'}
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          この操作は取り消せません
        </Alert>

        {isBulkDelete ? (
          <>
            <Typography variant="body1" gutterBottom>
              以下の {components.length} 個のコンポーネントを削除しますか？
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 2 }}>
              <List dense>
                {components.map((component) => (
                  <ListItem key={component.id}>
                    <ListItemText
                      primary={component.name}
                      secondary={component.version ?? '(バージョン未設定)'}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        ) : (
          <Typography variant="body1" gutterBottom>
            コンポーネント「
            <strong>
              {components[0]?.name}
              {components[0]?.version ? ` (${components[0].version})` : ''}
            </strong>
            」を削除しますか？
          </Typography>
        )}

        {affectedRelationships > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {affectedRelationships} 個の関連する依存関係も削除されます
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          削除
        </Button>
      </DialogActions>
    </Dialog>
  );
};
