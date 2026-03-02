/**
 * コンポーネントビュー
 * ComponentTreeView と ComponentEditor を統合した表示
 */

import { Box, Paper, Stack } from '@mui/material';
import { ComponentTreeView } from './ComponentTreeView';
import { ComponentEditor } from '../editor/ComponentEditor';

export const ComponentView = () => {
  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ height: '100%' }}>
        {/* 左側: コンポーネントツリー */}
        <Box sx={{ width: { xs: '100%', md: '33%' }, height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'hidden' }}>
            <ComponentTreeView />
          </Paper>
        </Box>

        {/* 右側: コンポーネントエディタ */}
        <Box sx={{ width: { xs: '100%', md: '67%' }, height: '100%' }}>
          <ComponentEditor />
        </Box>
      </Stack>
    </Box>
  );
};
