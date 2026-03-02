# レスポンシブデザイン実装

## 概要

MUI の breakpoints を使用して、SBOM Editor をモバイル、タブレット、デスクトップの各デバイスに対応させました。

## 実装内容

### 1. App.tsx - メインレイアウト

#### デスクトップ (md 以上)
- サイドバー: 固定表示 (permanent drawer)
- 幅: 360px

#### モバイル (md 未満)
- サイドバー: 一時的なドロワー (temporary drawer)
- ハンバーガーメニューボタンで開閉
- オーバーレイ表示

#### レスポンシブ padding
```typescript
p: { xs: 1, sm: 2, md: 3 }
```

### 2. Header.tsx - ヘッダー

#### デスクトップ
- テキスト付きボタン表示
- すべてのアイコンボタン表示

#### モバイル
- ハンバーガーメニューボタン追加 (md 未満で表示)
- アップロード/ダウンロードボタン: アイコンのみ表示
- パフォーマンステストボタン: 非表示 (md 未満)

#### レスポンシブ gap
```typescript
gap: { xs: 0.5, sm: 1 }
```

### 3. ComponentTreeView.tsx - コンポーネントツリー

#### ツールバー
- flexWrap 対応でモバイル時に折り返し
- レスポンシブ padding と gap

#### 検索・フィルタエリア
```typescript
p: { xs: 1.5, sm: 2 }
```

#### ツリー表示
```typescript
px: { xs: 1, sm: 2 }
```

### 4. ComponentEditor.tsx - エディタ

#### タブ
- `variant="scrollable"` でモバイル時にスクロール可能
- `scrollButtons="auto"` で自動スクロールボタン表示
- `allowScrollButtonsMobile` でモバイル対応

#### コンテンツ padding
```typescript
p: { xs: 2, sm: 3 }
```

#### ハッシュ入力フィールド
- デスクトップ: 横並び (row)
- モバイル: 縦並び (column)
```typescript
direction={{ xs: 'column', sm: 'row' }}
alignItems={{ xs: 'stretch', sm: 'center' }}
```

### 5. ダイアログ - 全般

すべてのダイアログに `fullScreen` プロパティを追加:

```typescript
const theme = useTheme();
const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

<Dialog fullScreen={fullScreen} ... >
```

#### 対象ダイアログ
- SettingsDialog
- AddComponentDialog
- DeleteConfirmDialog
- FileUploadDialog

#### ボタングループ
```typescript
flexWrap: 'wrap'
```

## MUI Breakpoints

| Breakpoint | サイズ | デバイス |
|-----------|--------|---------|
| xs | 0px | モバイル (小) |
| sm | 600px | モバイル (大) / タブレット (小) |
| md | 900px | タブレット |
| lg | 1200px | デスクトップ |
| xl | 1536px | デスクトップ (大) |

## 主な使用パターン

### 1. 条件付き表示
```typescript
sx={{ display: { xs: 'none', md: 'block' } }}
```

### 2. レスポンシブ値
```typescript
sx={{ p: { xs: 1, sm: 2, md: 3 } }}
```

### 3. メディアクエリフック
```typescript
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

### 4. 方向切り替え
```typescript
direction={{ xs: 'column', sm: 'row' }}
```

## テスト方法

### ブラウザ開発者ツール
1. F12 で開発者ツールを開く
2. デバイスツールバーを有効化 (Ctrl+Shift+M)
3. 各デバイスサイズでテスト:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)

### 確認項目
- [ ] サイドバーがモバイルで非表示になり、メニューボタンで開閉できる
- [ ] ヘッダーのボタンがモバイルでアイコンのみになる
- [ ] タブがモバイルでスクロール可能になる
- [ ] ハッシュ入力がモバイルで縦並びになる
- [ ] ダイアログがモバイルでフルスクリーン表示になる
- [ ] すべてのコンテンツが適切な padding で表示される

## 今後の改善案

1. タッチジェスチャー対応
   - スワイプでサイドバー開閉
   - ピンチズームでコンポーネントツリー拡大

2. オリエンテーション対応
   - 横向き時のレイアウト最適化

3. アクセシビリティ
   - タッチターゲットサイズの最適化 (最小 44x44px)
   - フォーカス管理の改善
