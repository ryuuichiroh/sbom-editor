/**
 * メインアプリケーション
 * ヘッダー + サイドバー（タブナビゲーション） + メインコンテンツのレイアウト
 */

import { useEffect, useState } from 'react';
import { Box, Drawer, CssBaseline, useMediaQuery, useTheme, Tabs, Tab, Typography } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Header } from './components/common';
import { SettingsDialog } from './components/common/SettingsDialog';
import { ComponentTreeView } from './components/component';
import { ComponentEditor } from './components/editor';
import { LicenseListView } from './components/license';
import { SBOMProvider, useSBOM } from './store/sbomStore';
import { ConfigProvider, useConfig } from './store/configStore';
import { CommandHistoryProvider } from './store/commandHistory';
import { loadFieldRequirements, loadCustomAttributes } from './services/configLoader';

const DRAWER_WIDTH = 360;

type SidebarTab = 'components' | 'licenses';

/**
 * アプリケーション内部コンポーネント
 * ConfigProvider 内で useConfig を使用するため分離
 */
function AppContent() {
  const { dispatch } = useConfig();
  const { state: sbomState } = useSBOM();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('components');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isSBOMLoaded = sbomState.sbom !== null;

  /**
   * 起動時に設定を localStorage から復元
   */
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const fieldRequirements = await loadFieldRequirements();
        dispatch({ type: 'LOAD_FIELD_REQUIREMENTS', payload: fieldRequirements });

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

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Tabs
        value={sidebarTab}
        onChange={(_, value: SidebarTab) => { setSidebarTab(value); }}
        orientation="vertical"
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Tab 
          icon={<GavelIcon />} 
          label="ライセンス" 
          value="licenses" 
          iconPosition="start"
          disabled={!isSBOMLoaded}
        />
        <Tab 
          icon={<AccountTreeIcon />} 
          label="コンポーネント" 
          value="components" 
          iconPosition="start"
          disabled={!isSBOMLoaded}
        />
      </Tabs>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {sidebarTab === 'components' && isSBOMLoaded ? <ComponentTreeView /> : null}
      </Box>
    </Box>
  );

  /** 右側メインコンテンツの表示切り替え */
  const mainContent = !isSBOMLoaded ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
      }}
    >
      <UploadFileIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
      <Typography variant="h5" color="text.secondary">
        SBOM ファイルをアップロードしてください
      </Typography>
    </Box>
  ) : sidebarTab === 'licenses' ? (
    <LicenseListView />
  ) : (
    <ComponentEditor />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />

      <Header
        onSettingsClick={() => { setSettingsOpen(true); }}
        onMenuClick={isMobile ? handleDrawerToggle : undefined}
      />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
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
          {mainContent}
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); }}
      />
    </Box>
  );
}

function App() {
  return (
    <ConfigProvider>
      <SBOMProvider>
        <CommandHistoryProvider>
          <AppContent />
        </CommandHistoryProvider>
      </SBOMProvider>
    </ConfigProvider>
  );
}

export default App;
