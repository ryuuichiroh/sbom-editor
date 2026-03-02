import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  type SelectChangeEvent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSBOM } from '../../store/sbomStore';
import type { LicenseCategory } from '../../types/unified';
import {
  getCategoryDisplayName,
  getCategorySortOrder,
  evaluateLicenseExpression,
} from '../../utils/licenseClassifier';

type SortBy = 'category' | 'name' | 'count';

interface LicenseGroup {
  category: LicenseCategory;
  licenses: LicenseInfo[];
}

interface LicenseInfo {
  identifier: string;
  displayName: string;
  componentIds: string[];
  componentNames: string[];
}

export const LicenseListView = (): React.ReactElement => {
  const { state } = useSBOM();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('category');
  const [filterCategory, setFilterCategory] = useState<LicenseCategory | 'all'>('all');

  // ライセンス情報を集計
  const licenseGroups = useMemo(() => {
    if (!state.sbom) return [];

    // ライセンスごとにコンポーネントを集計
    const licenseMap = new Map<string, { componentIds: Set<string>; category: LicenseCategory }>();

    state.sbom.components.forEach((component) => {
      component.licenses.forEach((license) => {
        const identifier =
          license.licenseId ?? license.expression ?? license.licenseName ?? 'Unknown';

        // カテゴリを評価（expression の場合は evaluateLicenseExpression を使用）
        const category = license.expression
          ? evaluateLicenseExpression(license.expression)
          : license.category;

        if (!licenseMap.has(identifier)) {
          licenseMap.set(identifier, {
            componentIds: new Set(),
            category,
          });
        }
        const licenseData = licenseMap.get(identifier);
        if (licenseData) {
          licenseData.componentIds.add(component.id);
        }
      });
    });

    // カテゴリごとにグループ化
    const categoryMap = new Map<LicenseCategory, LicenseInfo[]>();

    licenseMap.forEach((data, identifier) => {
      const { componentIds, category } = data;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }

      const componentNames = Array.from(componentIds).map((id) => {
        const component = state.sbom?.components.find((c) => c.id === id);
        return component?.name ?? 'Unknown';
      });

      const categoryLicenses = categoryMap.get(category);
      if (categoryLicenses) {
        categoryLicenses.push({
          identifier,
          displayName: identifier,
          componentIds: Array.from(componentIds),
          componentNames,
        });
      }
    });

    // LicenseGroup 配列に変換
    const groups: LicenseGroup[] = Array.from(categoryMap.entries()).map(
      ([category, licenses]) => ({
        category,
        licenses,
      })
    );

    return groups;
  }, [state.sbom]);

  // フィルタリングとソート
  const filteredAndSortedGroups = useMemo(() => {
    let groups = [...licenseGroups];

    // カテゴリフィルタ
    if (filterCategory !== 'all') {
      groups = groups.filter((group) => group.category === filterCategory);
    }

    // 検索フィルタ
    if (searchQuery) {
      groups = groups
        .map((group) => ({
          ...group,
          licenses: group.licenses.filter(
            (license) =>
              license.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              license.componentNames.some((name) =>
                name.toLowerCase().includes(searchQuery.toLowerCase())
              )
          ),
        }))
        .filter((group) => group.licenses.length > 0);
    }

    // ソート
    groups.forEach((group) => {
      switch (sortBy) {
        case 'name':
          group.licenses.sort((a, b) => a.displayName.localeCompare(b.displayName));
          break;
        case 'count':
          group.licenses.sort((a, b) => b.componentIds.length - a.componentIds.length);
          break;
        default:
          // category の場合はグループ内でライセンス名順
          group.licenses.sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
    });

    // グループ自体をカテゴリの制約強度順にソート
    if (sortBy === 'category') {
      groups.sort((a, b) => getCategorySortOrder(a.category) - getCategorySortOrder(b.category));
    }

    return groups;
  }, [licenseGroups, searchQuery, sortBy, filterCategory]);

  const handleSortChange = useCallback((event: SelectChangeEvent<SortBy>): void => {
    setSortBy(event.target.value as SortBy);
  }, []);

  const handleFilterChange = useCallback(
    (event: SelectChangeEvent<LicenseCategory | 'all'>): void => {
      setFilterCategory(event.target.value as LicenseCategory | 'all');
    },
    []
  );

  if (!state.sbom) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          SBOM ファイルをアップロードしてください
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ライセンス一覧
      </Typography>

      {/* 検索・フィルタ・ソート */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="検索"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>カテゴリ</InputLabel>
          <Select value={filterCategory} onChange={handleFilterChange} label="カテゴリ">
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="copyleft">Copyleft</MenuItem>
            <MenuItem value="weak-copyleft">Weak Copyleft</MenuItem>
            <MenuItem value="permissive">Permissive</MenuItem>
            <MenuItem value="proprietary">Proprietary</MenuItem>
            <MenuItem value="other">Other</MenuItem>
            <MenuItem value="unknown">Unknown</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>ソート</InputLabel>
          <Select value={sortBy} onChange={handleSortChange} label="ソート">
            <MenuItem value="category">種別</MenuItem>
            <MenuItem value="name">ライセンス名</MenuItem>
            <MenuItem value="count">使用コンポーネント数</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ライセンスグループ表示 */}
      {filteredAndSortedGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          該当するライセンスが見つかりません
        </Typography>
      ) : (
        filteredAndSortedGroups.map((group) => (
          <Accordion key={group.category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="subtitle1">
                  {getCategoryDisplayName(group.category)}
                </Typography>
                <Chip label={group.licenses.length} size="small" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {group.licenses.map((license) => (
                  <ListItem key={license.identifier}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{license.displayName}</Typography>
                          <Chip
                            label={`${String(license.componentIds.length)} 個`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {license.componentNames.join(', ')}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};
