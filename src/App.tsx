/**
 * メインアプリケーション
 * ヘッダー + サイドバー + メインコンテンツのレイアウト
 */

import { useEffect, useState } from 'react';
import { Box, Drawer, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { Header } from './components/common';
import { SettingsDialog } from './components/common/SettingsDialog';
import { ComponentTreeView } from './components/component';
import { ComponentEditor } from './components/editor';
import { SBOMProvider } from './store/sbomStore';
import { ConfigProvider, useConfig } from './store/configStore';
import { CommandHistoryProvider } from './store/commandHistory';
import { loadFieldRequirements, loadCustomAttributes } from './services/configLoader';

const DRAWER_WIDTH = 360;

/**
 * アプリケーション内部コンポーネント
 * ConfigProvider 内で useConfig を使用するため分離
 */
function AppContent() {
  const { dispatch } = useConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /**
   * 起動時に設定を localStorage から復元
   */
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // 必須属性設定をロード
        const fieldRequirements = await loadFieldRequirements();
        dispatch({ type: 'LOAD_FIELD_REQUIREMENTS', payload: fieldRequirements });

        // カスタム属性設定をロード
        const customAttributes = await loadCustomAttributes();
        dispatch({ type: 'LOAD_CUSTOM_ATTRIBUTES', payload: customAttributes });

        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('設定の初期化エラー:', error);
        dispatch({
          type: 'SET_ERROR',
          payload: `設定の読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        });
      }
    };

    void initializeConfig();
  }, [dispatch]);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const drawerContent = <ComponentTreeView />;

  return (
    <SBOMProvider>
      <CommandHistoryProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <CssBaseline />

          {/* ヘッダー */}
          <Header
            onSettingsClick={() => {
              setSettingsOpen(true);
            }}
            onMenuClick={isMobile ? handleDrawerToggle : undefined}
          />

          {/* メインコンテンツエリア */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* サイドバー（コンポーネントツリー） */}
            {isMobile ? (
              // モバイル: 一時的なドロワー
              <Drawer
                variant="temporary"
                open={mobileDrawerOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true, // モバイルパフォーマンス向上
                }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                  },
                }}
              >
                {drawerContent}
              </Drawer>
            ) : (
              // デスクトップ: 固定ドロワー
              <Drawer
                variant="permanent"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  width: DRAWER_WIDTH,
                  flexShrink: 0,
                  '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    position: 'relative',
                    height: '100%',
                  },
                }}
              >
                {drawerContent}
              </Drawer>
            )}

            {/* メインコンテンツ（コンポーネントエディタ） */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: { xs: 1, sm: 2, md: 3 },
                overflow: 'auto',
                bgcolor: 'background.default',
                width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH.toString()}px)` },
              }}
            >
              <ComponentEditor />
            </Box>
          </Box>

          {/* 設定ダイアログ */}
          <SettingsDialog
            open={settingsOpen}
            onClose={() => {
              setSettingsOpen(false);
            }}
          />
        </Box>
      </CommandHistoryProvider>
    </SBOMProvider>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
