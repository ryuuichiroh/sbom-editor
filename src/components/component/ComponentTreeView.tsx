/**
 * コンポーネントツリー表示
 * MUI TreeView で親子階層を表示し、検索・フィルタ機能を提供する
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
  Checkbox,
  Toolbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
} from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useSBOM } from '../../store/sbomStore';
import type { Component as SBOMComponent, ComponentType } from '../../types/unified';
import { AddComponentDialog, type NewComponentData } from './AddComponentDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

export interface ComponentTreeViewProps {
  onComponentSelect?: (componentId: string) => void;
}

interface TreeNode {
  id: string;
  componentId: string; // 実際のコンポーネント ID
  component: SBOMComponent;
  children: TreeNode[];
  depth: number;
}

export const ComponentTreeView = ({ onComponentSelect }: ComponentTreeViewProps) => {
  const { state, dispatch } = useSBOM();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ComponentType | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // コンポーネントをツリー構造に変換
  const treeData = useMemo(() => {
    if (!state.sbom) return [];

    const components = state.sbom.components;

    // ルートコンポーネント（親がいないもの）を特定
    const rootComponents = components.filter((c) => c.parentIds.length === 0);

    // ツリーノードを再帰的に構築
    // 各ノードに一意の ID を生成（親のパス + コンポーネント ID）
    const buildTree = (component: SBOMComponent, depth: number, parentPath: string): TreeNode => {
      const nodeId = parentPath ? `${parentPath}/${component.id}` : component.id;
      
      const children = components
        .filter((c) => c.parentIds.includes(component.id))
        .map((c) => buildTree(c, depth + 1, nodeId));

      return {
        id: nodeId,
        componentId: component.id,
        component,
        children,
        depth,
      };
    };

    return rootComponents.map((c) => buildTree(c, 0, ''));
  }, [state.sbom]);

  // フィルタリングとフラット化
  const filteredAndFlattenedNodes = useMemo(() => {
    const flatten = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        acc.push(node);
        if (node.children.length > 0) {
          acc.push(...flatten(node.children));
        }
        return acc;
      }, []);
    };

    const allNodes = flatten(treeData);

    return allNodes.filter((node) => {
      const { component } = node;

      // タイプフィルタ
      if (typeFilter !== 'all' && component.type !== typeFilter) {
        return false;
      }

      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = component.name.toLowerCase().includes(query);
        const matchesVersion = component.version?.toLowerCase().includes(query);
        const matchesDescription = component.description?.toLowerCase().includes(query);
        return matchesName || matchesVersion || matchesDescription;
      }

      return true;
    });
  }, [treeData, searchQuery, typeFilter]);

  // コンポーネント選択ハンドラ
  const handleComponentSelect = useCallback(
    (componentId: string) => {
      dispatch({ type: 'SELECT_COMPONENT', payload: componentId });
      onComponentSelect?.(componentId);
    },
    [dispatch, onComponentSelect]
  );

  // 検索クエリ変更ハンドラ
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // タイプフィルタ変更ハンドラ
  const handleTypeFilterChange = (event: SelectChangeEvent<ComponentType | 'all'>) => {
    setTypeFilter(event.target.value as ComponentType | 'all');
  };

  // 新規コンポーネント追加ハンドラ
  const handleAddComponent = useCallback(
    (componentData: NewComponentData) => {
      if (!state.sbom) return;

      // 新しいコンポーネントを作成
      const newComponent: SBOMComponent = {
        id: crypto.randomUUID(),
        name: componentData.name,
        version: componentData.version,
        type: componentData.type,
        description: componentData.description,
        licenses: [],
        hashes: [],
        externalRefs: [],
        customAttributes: [],
        parentIds: [],
      };

      // SPDX 固有フィールドの初期化
      if (state.sbom.format === 'spdx') {
        newComponent.spdxId = `SPDXRef-${componentData.name.replace(/[^a-zA-Z0-9-]/g, '-')}`;
        newComponent.downloadLocation = 'NOASSERTION';
      }

      // CycloneDX 固有フィールドの初期化
      if (state.sbom.format === 'cyclonedx') {
        newComponent.bomRef = crypto.randomUUID();
      }

      dispatch({ type: 'ADD_COMPONENT', payload: newComponent });
    },
    [state.sbom, dispatch]
  );

  // チェックボックス切り替えハンドラ
  const handleToggleSelect = useCallback((componentId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
      } else {
        newSet.add(componentId);
      }
      return newSet;
    });
  }, []);

  // 全選択ハンドラ
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredAndFlattenedNodes.map((node) => node.id));
    setSelectedIds(allIds);
  }, [filteredAndFlattenedNodes]);

  // 全解除ハンドラ
  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 削除確認ダイアログを開く
  const handleOpenDeleteDialog = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  }, [selectedIds.size]);

  // 削除実行
  const handleConfirmDelete = useCallback(() => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size === 1) {
      dispatch({ type: 'DELETE_COMPONENT', payload: Array.from(selectedIds)[0] });
    } else {
      dispatch({ type: 'DELETE_COMPONENTS', payload: Array.from(selectedIds) });
    }

    setSelectedIds(new Set());
    setDeleteDialogOpen(false);
  }, [selectedIds, dispatch]);

  // 削除対象のコンポーネント一覧
  const componentsToDelete = useMemo(() => {
    if (!state.sbom) return [];
    return state.sbom.components.filter((c) => selectedIds.has(c.id));
  }, [state.sbom, selectedIds]);

  // 影響を受ける関係の数
  const affectedRelationships = useMemo(() => {
    if (!state.sbom) return 0;
    return state.sbom.relationships.filter(
      (r) => selectedIds.has(r.sourceId) || selectedIds.has(r.targetId)
    ).length;
  }, [state.sbom, selectedIds]);

  // 選択されたコンポーネントに対応するツリーノード ID を見つける
  const selectedTreeItemId = useMemo(() => {
    if (!state.selectedComponentId) return undefined;
    
    // ツリーをフラット化して、選択されたコンポーネント ID を持つ最初のノードを見つける
    const findNodeId = (nodes: TreeNode[]): string | undefined => {
      for (const node of nodes) {
        if (node.componentId === state.selectedComponentId) {
          return node.id;
        }
        const childResult = findNodeId(node.children);
        if (childResult) return childResult;
      }
      return undefined;
    };
    
    return findNodeId(treeData);
  }, [state.selectedComponentId, treeData]);

  // ツリーアイテム選択ハンドラ
  const handleTreeItemSelect = useCallback(
    (_event: React.SyntheticEvent, itemId: string | null) => {
      if (itemId) {
        // itemId からコンポーネント ID を抽出（最後の / 以降）
        const componentId = itemId.includes('/') ? itemId.split('/').pop()! : itemId;
        handleComponentSelect(componentId);
      }
    },
    [handleComponentSelect]
  );

  // ツリーノードをレンダリング（再帰的）
  // Note: useCallback with recursive function requires the function to be in dependencies
  // which creates a circular dependency. Using regular function instead.
  const renderTreeNode = (node: TreeNode): React.ReactElement => {
    const { component, children, componentId } = node;
    const isSelected = state.selectedComponentId === componentId;
    const isChecked = selectedIds.has(componentId);

    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Checkbox
              size="small"
              checked={isChecked}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSelect(componentId);
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
              {component.name}
            </Typography>
            {component.version && (
              <Chip label={component.version} size="small" variant="outlined" />
            )}
            <Chip label={component.type} size="small" color="primary" variant="outlined" />
          </Box>
        }
      >
        {children.map((child) => renderTreeNode(child))}
      </TreeItem>
    );
  };

  if (!state.sbom) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          SBOM ファイルをアップロードしてください
        </Typography>
      </Paper>
    );
  }

  const componentCount = state.sbom.components.length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Toolbar
        variant="dense"
        sx={{
          gap: { xs: 0.5, sm: 1 },
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          minHeight: { xs: 'auto', sm: 48 },
          py: { xs: 1, sm: 0 },
        }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => {
            setAddDialogOpen(true);
          }}
          sx={{ minWidth: { xs: 'auto', sm: 'auto' } }}
        >
          追加
        </Button>
        <Button
          startIcon={<DeleteIcon />}
          variant="outlined"
          size="small"
          color="error"
          disabled={selectedIds.size === 0}
          onClick={handleOpenDeleteDialog}
          sx={{ minWidth: { xs: 'auto', sm: 'auto' } }}
        >
          削除 {selectedIds.size > 0 && `(${selectedIds.size.toString()})`}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="全選択">
          <IconButton size="small" onClick={handleSelectAll}>
            <SelectAllIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="選択解除">
          <IconButton size="small" onClick={handleDeselectAll} disabled={selectedIds.size === 0}>
            <DeselectIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {/* 検索・フィルタ */}
      <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 } }}>
        <TextField
          fullWidth
          size="small"
          placeholder="コンポーネントを検索..."
          value={searchQuery}
          onChange={handleSearchChange}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>タイプでフィルタ</InputLabel>
          <Select value={typeFilter} onChange={handleTypeFilterChange} label="タイプでフィルタ">
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="application">Application</MenuItem>
            <MenuItem value="framework">Framework</MenuItem>
            <MenuItem value="library">Library</MenuItem>
            <MenuItem value="container">Container</MenuItem>
            <MenuItem value="operating-system">Operating System</MenuItem>
            <MenuItem value="device">Device</MenuItem>
            <MenuItem value="firmware">Firmware</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="caption" color="text.secondary">
          {filteredAndFlattenedNodes.length} / {componentCount} コンポーネント
          {selectedIds.size > 0 && ` (${selectedIds.size.toString()} 選択中)`}
        </Typography>
      </Stack>

      {/* ツリー表示 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <SimpleTreeView
          selectedItems={selectedTreeItemId}
          onSelectedItemsChange={handleTreeItemSelect}
          sx={{
            px: { xs: 1, sm: 2 },
            pb: 2,
            '& .MuiTreeItem-label': { whiteSpace: 'nowrap', overflow: 'visible' },
            '& .MuiTreeItem-content': { overflow: 'visible' },
            '& .MuiTreeItem-iconContainer + .MuiTreeItem-label': { overflow: 'visible' },
          }}
        >
          {treeData.map((node) => renderTreeNode(node))}
        </SimpleTreeView>
      </Box>

      {/* ダイアログ */}
      <AddComponentDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
        }}
        onAdd={handleAddComponent}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        components={componentsToDelete}
        affectedRelationships={affectedRelationships}
      />
    </Box>
  );
};
