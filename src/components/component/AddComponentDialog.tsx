/**
 * 新規コンポーネント追加ダイアログ
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { ComponentType } from '../../types/unified';

export interface AddComponentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (componentData: NewComponentData) => void;
}

export interface NewComponentData {
  name: string;
  version?: string;
  type: ComponentType;
  description?: string;
}

export const AddComponentDialog = ({ open, onClose, onAdd }: AddComponentDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [type, setType] = useState<ComponentType>('library');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleClose = () => {
    // リセット
    setName('');
    setVersion('');
    setType('library');
    setDescription('');
    setErrors({});
    onClose();
  };

  const handleAdd = () => {
    // バリデーション
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'コンポーネント名は必須です';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 追加
    onAdd({
      name: name.trim(),
      version: version.trim() || undefined,
      type,
      description: description.trim() || undefined,
    });

    handleClose();
  };

  const handleTypeChange = (event: SelectChangeEvent<ComponentType>) => {
    setType(event.target.value as ComponentType);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>新規コンポーネント追加</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            required
            label="コンポーネント名"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors({ ...errors, name: undefined });
              }
            }}
            error={!!errors.name}
            helperText={errors.name}
            autoFocus
          />

          <TextField
            fullWidth
            label="バージョン"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
            }}
            placeholder="例: 1.0.0"
          />

          <FormControl fullWidth required>
            <InputLabel>タイプ</InputLabel>
            <Select value={type} onChange={handleTypeChange} label="タイプ">
              <MenuItem value="library">Library</MenuItem>
              <MenuItem value="application">Application</MenuItem>
              <MenuItem value="framework">Framework</MenuItem>
              <MenuItem value="container">Container</MenuItem>
              <MenuItem value="operating-system">Operating System</MenuItem>
              <MenuItem value="device">Device</MenuItem>
              <MenuItem value="firmware">Firmware</MenuItem>
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="説明"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            multiline
            rows={3}
            placeholder="コンポーネントの説明を入力..."
          />

          <Typography variant="caption" color="text.secondary">
            追加後、詳細な属性は ComponentEditor で編集できます
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>キャンセル</Button>
        <Button onClick={handleAdd} variant="contained">
          追加
        </Button>
      </DialogActions>
    </Dialog>
  );
};
